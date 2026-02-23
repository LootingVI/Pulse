import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

// Helpers
function formatDuration(ms: number): string {
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
    return `${(ms / 3_600_000).toFixed(1)}h`;
}

function uptimePercent(results: { status: string }[]): string {
    if (!results.length) return "N/A";
    const online = results.filter((r) => r.status === "ONLINE").length;
    return ((online / results.length) * 100).toFixed(2) + "%";
}

function avgResponseTime(results: { responseTime: number }[]): string {
    if (!results.length) return "N/A";
    const avg = results.reduce((s, r) => s + r.responseTime, 0) / results.length;
    return Math.round(avg) + "ms";
}

function statusColor(pct: string): string {
    const n = parseFloat(pct);
    if (n >= 99.9) return "#22c55e";
    if (n >= 99) return "#86efac";
    if (n >= 95) return "#f59e0b";
    return "#ef4444";
}

async function generateReportHTML(periodLabel: string, since: Date): Promise<{ html: string; subject: string }> {
    const monitors = await prisma.monitor.findMany({
        include: {
            results: {
                where: { timestamp: { gte: since } },
                select: { status: true, responseTime: true, timestamp: true },
                orderBy: { timestamp: "desc" },
            },
            incidents: {
                where: { createdAt: { gte: since } },
                select: { id: true, title: true, status: true, createdAt: true, updatedAt: true },
            },
        },
        orderBy: { name: "asc" },
    });

    const totalMonitors = monitors.length;
    const onlineCount = monitors.filter((m) => m.status === "ONLINE").length;
    const incidents = monitors.flatMap((m) => m.incidents);
    const resolvedIncidents = incidents.filter((i) => i.status === "RESOLVED").length;

    const monitorRows = monitors
        .map((m) => {
            const uptime = uptimePercent(m.results);
            const avgRT = avgResponseTime(m.results);
            const col = uptime === "N/A" ? "#6b7280" : statusColor(uptime);
            return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #1f2937;font-weight:500;color:#f9fafb">${m.name}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #1f2937;color:#9ca3af;font-size:12px">${m.type}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #1f2937;color:${col};font-weight:700">${uptime}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #1f2937;color:#9ca3af">${avgRT}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #1f2937;color:#9ca3af">${m.results.length}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #1f2937;color:${m.incidents.length ? "#f59e0b" : "#22c55e"}">${m.incidents.length}</td>
        </tr>`;
        })
        .join("");

    const incidentRows = incidents.length
        ? incidents
            .slice(0, 10)
            .map(
                (i) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#f9fafb;font-size:13px">${i.title}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:${i.status === "RESOLVED" ? "#22c55e" : "#f59e0b"};font-size:12px">${i.status}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#9ca3af;font-size:12px">${new Date(i.createdAt).toLocaleString()}</td>
        </tr>`
            )
            .join("")
        : `<tr><td colspan="3" style="padding:12px;color:#6b7280;text-align:center">No incidents this period 🎉</td></tr>`;

    const subject = `[Pulse] ${periodLabel} Uptime Report — ${new Date().toLocaleDateString()}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#111827;font-family:'Segoe UI',sans-serif">
  <div style="max-width:680px;margin:32px auto;background:#1f2937;border-radius:12px;overflow:hidden;border:1px solid #374151">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6d28d9,#4f46e5);padding:32px 28px">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">📊 ${periodLabel} Uptime Report</h1>
      <p style="margin:6px 0 0;color:#c4b5fd;font-size:14px">Period: ${since.toLocaleDateString()} – ${new Date().toLocaleDateString()}</p>
    </div>

    <!-- Summary cards -->
    <div style="display:flex;gap:0;border-bottom:1px solid #374151">
      <div style="flex:1;padding:20px 24px;border-right:1px solid #374151;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#f9fafb">${totalMonitors}</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:4px">Total Monitors</div>
      </div>
      <div style="flex:1;padding:20px 24px;border-right:1px solid #374151;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#22c55e">${onlineCount}</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:4px">Currently Online</div>
      </div>
      <div style="flex:1;padding:20px 24px;border-right:1px solid #374151;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#f59e0b">${incidents.length}</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:4px">Incidents</div>
      </div>
      <div style="flex:1;padding:20px 24px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#34d399">${resolvedIncidents}</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:4px">Resolved</div>
      </div>
    </div>

    <!-- Monitor Table -->
    <div style="padding:24px 28px">
      <h2 style="margin:0 0 16px;color:#f9fafb;font-size:16px;font-weight:600">Monitor Summary</h2>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#111827">
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600">Monitor</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600">Type</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600">Uptime</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600">Avg. Response</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600">Checks</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600">Incidents</th>
          </tr>
        </thead>
        <tbody>${monitorRows}</tbody>
      </table>
    </div>

    <!-- Incident Table -->
    <div style="padding:0 28px 24px">
      <h2 style="margin:0 0 16px;color:#f9fafb;font-size:16px;font-weight:600">Recent Incidents</h2>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#111827">
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600">Title</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600">Status</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600">Started</th>
          </tr>
        </thead>
        <tbody>${incidentRows}</tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;background:#111827;text-align:center;border-top:1px solid #374151">
      <p style="margin:0;color:#6b7280;font-size:12px">Sent automatically by <strong style="color:#8b5cf6">Pulse</strong> · Self-hosted uptime monitoring</p>
    </div>
  </div>
</body>
</html>`;

    return { html, subject };
}

// GET — Preview report data (no email sent)
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") ?? "weekly";

    const since = new Date();
    if (period === "monthly") since.setDate(since.getDate() - 30);
    else since.setDate(since.getDate() - 7);

    const label = period === "monthly" ? "Monthly" : "Weekly";
    const { html, subject } = await generateReportHTML(label, since);

    return NextResponse.json({ html, subject, period });
}

// POST — Actually send the report via email
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { period = "weekly", recipients } = await req.json();

    const since = new Date();
    if (period === "monthly") since.setDate(since.getDate() - 30);
    else since.setDate(since.getDate() - 7);

    const label = period === "monthly" ? "Monthly" : "Weekly";
    const { html, subject } = await generateReportHTML(label, since);

    // Determine recipients: passed in body, or fallback to admin emails from DB
    let toList: string[] = recipients ?? [];
    if (!toList.length) {
        const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
        toList = admins.map((a) => a.email);
    }

    if (!toList.length) {
        return NextResponse.json({ error: "No recipients found" }, { status: 400 });
    }

    const results = await Promise.all(
        toList.map((to) => sendEmail({ to, subject, html }))
    );

    const sent = results.filter(Boolean).length;
    return NextResponse.json({ success: sent > 0, sent, total: toList.length, subject });
}
