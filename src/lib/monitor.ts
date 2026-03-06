import axios from 'axios';
import { MonitorStatus, MonitorType } from '@prisma/client';
import net from 'net';
import tls from 'tls';
import dns from 'dns/promises';

export interface CheckResult {
    status: MonitorStatus;
    responseTime: number;
    message?: string;
}

// Helper: basic TCP connect, resolves ONLINE on connect
function tcpConnect(host: string, port: number, timeoutMs: number): Promise<CheckResult> {
    const start = Date.now();
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeoutMs);

        socket.on('connect', () => {
            const responseTime = Date.now() - start;
            socket.destroy();
            resolve({ status: 'ONLINE', responseTime });
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ status: 'OFFLINE', responseTime: timeoutMs, message: 'Timeout' });
        });
        socket.on('error', (err) => {
            socket.destroy();
            resolve({ status: 'OFFLINE', responseTime: Date.now() - start, message: err.message });
        });

        socket.connect(port, host);
    });
}

// Minecraft Server List Ping (protocol 1.7+)
async function checkMinecraft(target: string, port: number = 25565, timeoutMs: number): Promise<CheckResult> {
    const start = Date.now();
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeoutMs);

        let buffer = Buffer.alloc(0);
        let responded = false;

        const done = (result: CheckResult) => {
            if (!responded) {
                responded = true;
                socket.destroy();
                resolve(result);
            }
        };

        socket.on('connect', () => {
            // Build Handshake packet (0x00) for Server List Ping
            const host = target;
            const hostBuf = Buffer.from(host, 'utf8');

            // VarInt encoder
            const writeVarInt = (val: number): Buffer => {
                const out = [];
                do {
                    let b = val & 0x7f;
                    val >>>= 7;
                    if (val !== 0) b |= 0x80;
                    out.push(b);
                } while (val !== 0);
                return Buffer.from(out);
            };

            // Handshake packet data
            const protocolVersion = writeVarInt(770); // 1.21.x
            const hostLength = writeVarInt(hostBuf.length);
            const portBuf = Buffer.alloc(2);
            portBuf.writeUInt16BE(port);
            const nextState = writeVarInt(1);

            const handshakeData = Buffer.concat([
                writeVarInt(0x00), // packet id
                protocolVersion,
                hostLength, hostBuf,
                portBuf,
                nextState,
            ]);
            const handshakeLen = writeVarInt(handshakeData.length);
            const handshake = Buffer.concat([handshakeLen, handshakeData]);

            // Status Request packet (0x00 with just id)
            const statusRequest = Buffer.concat([writeVarInt(1), writeVarInt(0x00)]);

            socket.write(Buffer.concat([handshake, statusRequest]));
        });

        socket.on('data', (data) => {
            buffer = Buffer.concat([buffer, data]);

            // Try to parse VarInt-prefixed JSON response
            if (buffer.length < 5) return;

            try {
                // Find the JSON start { 
                const jsonStart = buffer.indexOf('{');
                if (jsonStart === -1) return;

                const jsonStr = buffer.slice(jsonStart).toString('utf8');
                // Find valid JSON end
                let depth = 0;
                let end = -1;
                for (let i = 0; i < jsonStr.length; i++) {
                    if (jsonStr[i] === '{') depth++;
                    else if (jsonStr[i] === '}') {
                        depth--;
                        if (depth === 0) { end = i; break; }
                    }
                }
                if (end === -1) return;

                const json = JSON.parse(jsonStr.slice(0, end + 1));
                const players = json.players
                    ? `${json.players.online}/${json.players.max} players`
                    : 'Online';
                const version = json.version?.name || '';
                done({
                    status: 'ONLINE',
                    responseTime: Date.now() - start,
                    message: `${version} · ${players}`,
                });
            } catch {
                // Not enough data yet
            }
        });

        socket.on('timeout', () => done({ status: 'OFFLINE', responseTime: timeoutMs, message: 'Timeout' }));
        socket.on('error', (err) => done({ status: 'OFFLINE', responseTime: Date.now() - start, message: err.message }));

        // If no response within timeout
        setTimeout(() => done({ status: 'OFFLINE', responseTime: timeoutMs, message: 'No response' }), timeoutMs);

        socket.connect(port, target);
    });
}

// SSL: Check certificate validity and days until expiry
async function checkSSL(target: string, port: number = 443, timeoutMs: number): Promise<CheckResult> {
    const start = Date.now();
    const hostname = target.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    const sslPort = port || 443;

    return new Promise((resolve) => {
        const socket = tls.connect(
            { host: hostname, port: sslPort, servername: hostname, rejectUnauthorized: false },
            () => {
                const cert = socket.getPeerCertificate();
                const responseTime = Date.now() - start;
                socket.destroy();

                if (!cert || !cert.valid_to) {
                    return resolve({ status: 'OFFLINE', responseTime, message: 'No certificate found' });
                }

                const expiry = new Date(cert.valid_to);
                const now = new Date();
                const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / 86400000);

                if (daysLeft < 0) {
                    resolve({ status: 'OFFLINE', responseTime, message: `Certificate expired ${-daysLeft}d ago` });
                } else if (daysLeft < 7) {
                    resolve({ status: 'OFFLINE', responseTime, message: `Certificate expires in ${daysLeft}d!` });
                } else {
                    resolve({ status: 'ONLINE', responseTime, message: `Valid · ${daysLeft}d remaining` });
                }
            }
        );

        socket.setTimeout(timeoutMs);
        socket.on('timeout', () => { socket.destroy(); resolve({ status: 'OFFLINE', responseTime: timeoutMs, message: 'Timeout' }); });
        socket.on('error', (err) => { socket.destroy(); resolve({ status: 'OFFLINE', responseTime: Date.now() - start, message: err.message }); });
    });
}

// DNS: Resolve domain, check it returns at least one record
async function checkDNS(target: string, timeoutMs: number): Promise<CheckResult> {
    const start = Date.now();
    const hostname = target.replace(/^https?:\/\//, '').split('/')[0];

    try {
        const addresses = await Promise.race([
            dns.resolve4(hostname),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)),
        ]) as string[];

        const responseTime = Date.now() - start;
        return {
            status: 'ONLINE',
            responseTime,
            message: `Resolved: ${addresses.slice(0, 2).join(', ')}`,
        };
    } catch (err: any) {
        return {
            status: 'OFFLINE',
            responseTime: Date.now() - start,
            message: err.message || 'DNS lookup failed',
        };
    }
}

// SMTP: Connect and expect 220 banner
async function checkSMTP(target: string, port: number = 25, timeoutMs: number): Promise<CheckResult> {
    const start = Date.now();
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeoutMs);

        socket.on('connect', () => {
            // Wait for banner
        });

        socket.on('data', (data) => {
            const banner = data.toString();
            const responseTime = Date.now() - start;
            socket.destroy();

            if (banner.startsWith('220')) {
                resolve({ status: 'ONLINE', responseTime, message: banner.split('\n')[0].trim() });
            } else {
                resolve({ status: 'OFFLINE', responseTime, message: `Unexpected banner: ${banner.substring(0, 80)}` });
            }
        });

        socket.on('timeout', () => { socket.destroy(); resolve({ status: 'OFFLINE', responseTime: timeoutMs, message: 'Timeout' }); });
        socket.on('error', (err) => { socket.destroy(); resolve({ status: 'OFFLINE', responseTime: Date.now() - start, message: err.message }); });

        socket.connect(port, target);
    });
}

// Discord: Check Discord user presence via JAPI
async function checkDiscord(target: string, timeoutMs: number): Promise<CheckResult> {
    const start = Date.now();
    try {
        // Assume target is a Discord User ID (Bot ID)
        const userId = target.replace(/[^0-9]/g, ""); // strip anything non-numeric
        if (!userId) {
            return { status: "OFFLINE", responseTime: 0, message: "Invalid Discord User ID" };
        }

        const url = `https://japi.rest/discord/v1/user/${userId}`;

        const response = await axios.get(url, {
            timeout: timeoutMs,
            validateStatus: () => true,
        });

        const responseTime = Date.now() - start;

        // JAPI returns presence if available: data.presence.status
        // Or if it's returning a 404, it means user not found.
        if (response.status >= 200 && response.status < 300 && response.data?.data) {
            const userData = response.data.data;
            const presence = userData.presence?.status || "offline";

            if (presence === "online" || presence === "dnd" || presence === "idle") {
                return { status: "ONLINE", responseTime, message: `Bot is ${presence}` };
            } else {
                return { status: "OFFLINE", responseTime, message: `Bot is offline` };
            }
        } else {
            return { status: "OFFLINE", responseTime, message: `JAPI returned HTTP ${response.status}` };
        }
    } catch (error: any) {
        return { status: "OFFLINE", responseTime: Date.now() - start, message: error.message };
    }
}

// Steam A2S_INFO query (UDP)
import dgram from 'dgram';

async function checkSteam(target: string, port: number = 27015, timeoutMs: number): Promise<CheckResult> {
    const start = Date.now();
    return new Promise((resolve) => {
        const client = dgram.createSocket('udp4');
        let done = false;

        const finish = (result: CheckResult) => {
            if (!done) {
                done = true;
                client.close();
                resolve(result);
            }
        };

        // A2S_INFO request packet
        const challenge = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x54, ...Buffer.from('Source Engine Query\0')]);

        client.on('message', (msg) => {
            const responseTime = Date.now() - start;
            if (msg[4] === 0x49 /* 'I' - A2S_INFO response */) {
                // Parse server name (string after header bytes)
                let offset = 6;
                const nameEnd = msg.indexOf(0x00, offset);
                const serverName = nameEnd > 0 ? msg.slice(offset, nameEnd).toString('utf8') : 'Unknown';

                // Parse player count
                const mapEnd = msg.indexOf(0x00, nameEnd + 1);
                const gameEnd = msg.indexOf(0x00, mapEnd + 1);
                const folderEnd = msg.indexOf(0x00, gameEnd + 1);
                const gameNameEnd = msg.indexOf(0x00, folderEnd + 1);

                const infoOffset = gameNameEnd + 3; // skip AppID (2 bytes)
                const players = infoOffset < msg.length ? msg[infoOffset] : '?';
                const maxPlayers = infoOffset + 1 < msg.length ? msg[infoOffset + 1] : '?';

                finish({
                    status: 'ONLINE',
                    responseTime,
                    message: `${serverName} · ${players}/${maxPlayers} players`,
                });
            } else {
                finish({ status: 'ONLINE', responseTime, message: 'Server responded' });
            }
        });

        client.on('error', (err) => {
            finish({ status: 'OFFLINE', responseTime: Date.now() - start, message: err.message });
        });

        setTimeout(() => finish({ status: 'OFFLINE', responseTime: timeoutMs, message: 'Timeout — no response' }), timeoutMs);

        client.send(challenge, port, target, (err) => {
            if (err) finish({ status: 'OFFLINE', responseTime: Date.now() - start, message: err.message });
        });
    });
}

export async function performCheck(
    type: MonitorType,
    target: string,
    port?: number | null,
    timeout: number = 30,
    keyword?: string | null,
    flowSteps?: string | null
): Promise<CheckResult> {
    const start = Date.now();
    const timeoutMs = timeout * 1000;

    try {
        // ─── HTTP / KEYWORD ─────────────────────────────────────────────────
        if (type === 'HTTP' || type === 'KEYWORD') {
            const response = await axios.get(target, {
                timeout: timeoutMs,
                validateStatus: () => true,
            });

            const responseTime = Date.now() - start;

            if (type === 'KEYWORD' && keyword && !response.data.toString().includes(keyword)) {
                return { status: 'OFFLINE', responseTime, message: `Keyword "${keyword}" not found` };
            }

            if (response.status >= 200 && response.status < 400) {
                return { status: 'ONLINE', responseTime, message: `HTTP ${response.status}` };
            } else {
                return { status: 'OFFLINE', responseTime, message: `HTTP ${response.status}` };
            }
        }

        // ─── PORT (TCP) ──────────────────────────────────────────────────────
        if (type === 'PORT' && port) {
            return tcpConnect(target, port, timeoutMs);
        }

        // ─── PING (TCP to port 80) ────────────────────────────────────────────
        if (type === 'PING') {
            const host = target.replace(/^https?:\/\//, '').split('/')[0];
            return tcpConnect(host, 80, timeoutMs);
        }

        // ─── MINECRAFT ────────────────────────────────────────────────────────
        if (type === 'MINECRAFT') {
            const host = target.replace(/^https?:\/\//, '').split(':')[0];
            const mcPort = port || 25565;
            return checkMinecraft(host, mcPort, timeoutMs);
        }

        // ─── SSL ──────────────────────────────────────────────────────────────
        if (type === 'SSL') {
            return checkSSL(target, port || 443, timeoutMs);
        }

        // ─── DNS ──────────────────────────────────────────────────────────────
        if (type === 'DNS') {
            return checkDNS(target, timeoutMs);
        }

        // ─── SMTP ─────────────────────────────────────────────────────────────
        if (type === 'SMTP') {
            return checkSMTP(target, port || 25, timeoutMs);
        }

        // ─── DISCORD ──────────────────────────────────────────────────────────
        if (type === 'DISCORD') {
            return checkDiscord(target, timeoutMs);
        }

        // ─── STEAM ────────────────────────────────────────────────────────────
        if (type === 'STEAM') {
            return checkSteam(target, port || 27015, timeoutMs);
        }

        // ─── FLOW (Sequence of HTTP requests) ──────────────────────────────────
        if (type === 'FLOW' && flowSteps) {
            try {
                const steps = JSON.parse(flowSteps);
                if (!Array.isArray(steps) || steps.length === 0) {
                    return { status: 'OFFLINE', responseTime: 0, message: 'Flow has no steps defined' };
                }

                let totalTime = 0;
                for (let i = 0; i < steps.length; i++) {
                    const step = steps[i];
                    const stepStart = Date.now();

                    const response = await axios({
                        method: step.method || 'GET',
                        url: step.url,
                        data: step.body ? (typeof step.body === 'string' ? JSON.parse(step.body) : step.body) : undefined,
                        timeout: timeoutMs / steps.length, // share timeout across steps
                        validateStatus: () => true,
                    });

                    totalTime += (Date.now() - stepStart);

                    // Check status code
                    const expectedCode = step.expectedCode ? parseInt(step.expectedCode) : 200;
                    if (response.status !== expectedCode) {
                        return {
                            status: 'OFFLINE',
                            responseTime: totalTime,
                            message: `Step ${i + 1} failed: Expected HTTP ${expectedCode}, got ${response.status}`
                        };
                    }

                    // Check expected body keyword
                    if (step.expectedBody && !response.data.toString().includes(step.expectedBody)) {
                        return {
                            status: 'OFFLINE',
                            responseTime: totalTime,
                            message: `Step ${i + 1} failed: Keyword "${step.expectedBody}" not found in response`
                        };
                    }
                }

                return { status: 'ONLINE', responseTime: totalTime, message: `Flow successful (${steps.length} steps)` };
            } catch (err: any) {
                return { status: 'OFFLINE', responseTime: 0, message: `Flow config error: ${err.message}` };
            }
        }

        return { status: 'OFFLINE', responseTime: 0, message: 'Unsupported monitor type' };
    } catch (error: any) {
        return {
            status: 'OFFLINE',
            responseTime: Date.now() - start,
            message: error.message,
        };
    }
}
