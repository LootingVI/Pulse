import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execSync } from "child_process";

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") return null;
    return session;
}

// GET /api/admin/update — Check if an update is available on GitHub
export async function GET() {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        // Get current local commit hash
        const localHash = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

        // Fetch remote commit hash without pulling
        execSync("git fetch origin main --quiet", { encoding: "utf8" });
        const remoteHash = execSync("git rev-parse origin/main", { encoding: "utf8" }).trim();

        // Get list of new commits if any
        let newCommits: { hash: string; message: string; date: string }[] = [];
        if (localHash !== remoteHash) {
            const log = execSync(
                `git log HEAD..origin/main --pretty=format:"%H|%s|%ai" --no-merges`,
                { encoding: "utf8" }
            ).trim();

            if (log) {
                newCommits = log.split("\n").map((line) => {
                    const [hash, message, date] = line.split("|");
                    return { hash: hash?.slice(0, 7), message, date };
                });
            }
        }

        return NextResponse.json({
            updateAvailable: localHash !== remoteHash,
            currentVersion: localHash.slice(0, 7),
            latestVersion: remoteHash.slice(0, 7),
            newCommits,
        });
    } catch (err: any) {
        // If not a git repo or git not available, return gracefully
        return NextResponse.json({
            updateAvailable: false,
            currentVersion: "unknown",
            latestVersion: "unknown",
            newCommits: [],
            error: "Git not available or not a git repository",
        });
    }
}

// POST /api/admin/update — Apply the update
export async function POST() {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const steps: { step: string; success: boolean; output?: string }[] = [];

    try {
        // Step 1: git pull
        try {
            const pullOutput = execSync("git pull origin main", { encoding: "utf8" });
            steps.push({ step: "git pull", success: true, output: pullOutput.trim() });
        } catch (e: any) {
            steps.push({ step: "git pull", success: false, output: e.message });
            return NextResponse.json({ success: false, steps }, { status: 500 });
        }

        // Step 2: npm install (for new dependencies)
        try {
            execSync("npm install --prefer-offline", { encoding: "utf8", timeout: 120_000 });
            steps.push({ step: "npm install", success: true });
        } catch (e: any) {
            steps.push({ step: "npm install", success: false, output: e.message });
        }

        // Step 3: prisma db push (auto-migrate schema changes)
        try {
            const prismaOutput = execSync("npx prisma db push --accept-data-loss", {
                encoding: "utf8",
                timeout: 60_000,
            });
            steps.push({ step: "prisma db push", success: true, output: prismaOutput.slice(0, 300) });
        } catch (e: any) {
            steps.push({ step: "prisma db push", success: false, output: e.message });
            return NextResponse.json({ success: false, steps }, { status: 500 });
        }

        // Step 4: prisma generate
        try {
            execSync("npx prisma generate", { encoding: "utf8", timeout: 60_000 });
            steps.push({ step: "prisma generate", success: true });
        } catch (e: any) {
            steps.push({ step: "prisma generate", success: false, output: e.message });
        }

        // Step 5: next build
        try {
            execSync("npm run build", {
                encoding: "utf8",
                timeout: 300_000,
                env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: "--max-old-space-size=2048" },
            });
            steps.push({ step: "npm run build", success: true });
        } catch (e: any) {
            steps.push({ step: "npm run build", success: false, output: e.message.slice(0, 500) });
            return NextResponse.json({ success: false, steps }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            steps,
            message: "Update applied successfully! The server will restart shortly.",
        });
    } catch (err: any) {
        return NextResponse.json({ success: false, steps, error: err.message }, { status: 500 });
    }
}
