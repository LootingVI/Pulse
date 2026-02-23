import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

// ─── Public GitHub repo for Pulse ───────────────────────────────────────────
const GITHUB_OWNER = "LootingVI";
const GITHUB_REPO = "Pulse";
const GITHUB_BRANCH = "main";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") return null;
    return session;
}

/** Get the local installed commit hash from the .git directory or package.json version */
function getLocalVersion(): string {
    try {
        return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    } catch {
        // Fallback: read version from package.json if git is not available
        try {
            const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
            return pkg.version ?? "unknown";
        } catch {
            return "unknown";
        }
    }
}

// ─── GET /api/admin/update ───────────────────────────────────────────────────
// Checks GitHub API for newer commits on the public LootingVI/Pulse repo
export async function GET() {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const localHash = getLocalVersion();

        // Fetch latest commit from the public GitHub repo via API (no auth needed for public repos)
        const ghRes = await fetch(`${GITHUB_API}/commits/${GITHUB_BRANCH}`, {
            headers: {
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Pulse-Uptime-Monitor",
            },
            // Bypass Next.js cache so we always get a fresh result
            cache: "no-store",
        });

        if (!ghRes.ok) {
            throw new Error(`GitHub API responded with ${ghRes.status}`);
        }

        const latestCommit = await ghRes.json();
        const remoteHash: string = latestCommit.sha;
        const isKnownHash = localHash !== "unknown" && localHash.length >= 7;
        const updateAvailable = isKnownHash && !remoteHash.startsWith(localHash) && localHash !== remoteHash;

        // Fetch the list of commits newer than the local version
        let newCommits: { hash: string; message: string; date: string; author: string }[] = [];

        if (updateAvailable && isKnownHash) {
            try {
                // Compare local commit…remote HEAD via GitHub API
                const compareRes = await fetch(
                    `${GITHUB_API}/compare/${localHash}...${remoteHash}`,
                    {
                        headers: {
                            "Accept": "application/vnd.github.v3+json",
                            "User-Agent": "Pulse-Uptime-Monitor",
                        },
                        cache: "no-store",
                    }
                );

                if (compareRes.ok) {
                    const compareData = await compareRes.json();
                    newCommits = (compareData.commits ?? [])
                        .reverse() // newest first
                        .slice(0, 20)
                        .map((c: any) => ({
                            hash: c.sha.slice(0, 7),
                            message: c.commit.message.split("\n")[0], // first line only
                            date: c.commit.author.date,
                            author: c.commit.author.name,
                        }));
                }
            } catch {
                // If compare fails, still report update available with the latest commit
                newCommits = [{
                    hash: remoteHash.slice(0, 7),
                    message: latestCommit.commit.message.split("\n")[0],
                    date: latestCommit.commit.author.date,
                    author: latestCommit.commit.author.name,
                }];
            }
        }

        return NextResponse.json({
            updateAvailable,
            currentVersion: localHash.slice(0, 7),
            latestVersion: remoteHash.slice(0, 7),
            newCommits,
            repoUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`,
        });
    } catch (err: any) {
        return NextResponse.json(
            {
                updateAvailable: false,
                currentVersion: getLocalVersion().slice(0, 7),
                latestVersion: "unknown",
                newCommits: [],
                error: `Failed to reach GitHub API: ${err.message}`,
            },
            { status: 200 } // Return 200 so the UI still renders gracefully
        );
    }
}

// ─── POST /api/admin/update ──────────────────────────────────────────────────
// Downloads the latest version from the public repo and applies it
export async function POST() {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const steps: { step: string; success: boolean; output?: string }[] = [];

    // Step 1: git pull from the public repo
    try {
        const pullOutput = execSync(
            `git pull https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git ${GITHUB_BRANCH}`,
            { encoding: "utf8", timeout: 60_000 }
        );
        steps.push({ step: "git pull (LootingVI/Pulse)", success: true, output: pullOutput.trim().slice(0, 400) });
    } catch (e: any) {
        steps.push({ step: "git pull (LootingVI/Pulse)", success: false, output: e.message });
        return NextResponse.json({ success: false, steps }, { status: 500 });
    }

    // Step 2: npm install (catches new dependencies)
    try {
        execSync("npm install --prefer-offline", { encoding: "utf8", timeout: 120_000 });
        steps.push({ step: "npm install", success: true });
    } catch (e: any) {
        steps.push({ step: "npm install", success: false, output: e.message });
    }

    // Step 3: prisma db push — auto-migrate any schema changes
    try {
        const prismaOutput = execSync("npx prisma db push --accept-data-loss", {
            encoding: "utf8",
            timeout: 60_000,
        });
        steps.push({ step: "prisma db push (schema migration)", success: true, output: prismaOutput.slice(0, 300) });
    } catch (e: any) {
        steps.push({ step: "prisma db push (schema migration)", success: false, output: e.message });
        return NextResponse.json({ success: false, steps }, { status: 500 });
    }

    // Step 4: prisma generate — rebuild Prisma client
    try {
        execSync("npx prisma generate", { encoding: "utf8", timeout: 60_000 });
        steps.push({ step: "prisma generate", success: true });
    } catch (e: any) {
        steps.push({ step: "prisma generate", success: false, output: e.message });
    }

    // Step 5: next build — compile the new version
    try {
        execSync("npm run build", {
            encoding: "utf8",
            timeout: 300_000,
            env: {
                ...process.env,
                NEXT_TELEMETRY_DISABLED: "1",
                NODE_OPTIONS: "--max-old-space-size=2048",
            },
        });
        steps.push({ step: "npm run build", success: true });
    } catch (e: any) {
        steps.push({ step: "npm run build", success: false, output: e.message.slice(0, 500) });
        return NextResponse.json({ success: false, steps }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        steps,
        message: "Update from LootingVI/Pulse applied! Restart the server to activate the new version.",
    });
}
