/**
 * Pulse Uptime Monitor - Edge Probe Worker
 * Drop this script into a Cloudflare Worker to create a new Edge Node.
 * 
 * Instructions:
 * 1. Go to Cloudflare Dashboard -> Workers & Pages -> Create Application -> Create Worker
 * 2. Name it (e.g. pulse-probe-us-east)
 * 3. Click "Edit Code" and paste this entire file.
 * 4. Under Settings -> Variables, add a Secret named `PROBE_SECRET` with a secure random string.
 * 5. Deploy the worker and add its URL + Secret to your Pulse Uptime Monitor Settings!
 */

export default {
    async fetch(request, env) {
        // Only allow POST requests
        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405 });
        }

        // Check authorization
        const authHeader = request.headers.get('Authorization');
        if (!env.PROBE_SECRET || authHeader !== `Bearer ${env.PROBE_SECRET}`) {
            return new Response('Unauthorized', { status: 401 });
        }

        try {
            const body = await request.json();
            const { type, target, keyword, timeout = 30 } = body;

            if (type !== 'HTTP' && type !== 'KEYWORD') {
                return new Response(JSON.stringify({
                    error: "This edge probe currently only supports HTTP and KEYWORD checks."
                }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }

            const start = Date.now();
            let status = 'OFFLINE';
            let message = '';
            let responseTime = 0;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

            try {
                // Ensure target is an absolute URL
                const url = target.startsWith('http') ? target : `http://${target}`;

                const res = await fetch(url, {
                    method: 'GET',
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Pulse-Edge-Probe/1.0',
                    }
                });

                if (res.ok) {
                    if (type === 'KEYWORD' && keyword) {
                        const html = await res.text();
                        if (html.includes(keyword)) {
                            status = 'ONLINE';
                        } else {
                            status = 'OFFLINE';
                            message = `Keyword "${keyword}" not found.`;
                        }
                    } else {
                        status = 'ONLINE';
                    }
                } else {
                    status = 'OFFLINE';
                    message = `HTTP Status: ${res.status}`;
                }
            } catch (err) {
                status = 'OFFLINE';
                message = err.name === 'AbortError' ? 'Timeout' : err.message;
            } finally {
                clearTimeout(timeoutId);
            }

            responseTime = Date.now() - start;

            return new Response(JSON.stringify({
                status,
                responseTime,
                message,
            }), {
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (err) {
            return new Response('Bad Request', { status: 400 });
        }
    },
};
