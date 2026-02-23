import nodemailer from "nodemailer";
import { prisma } from "./db";
import { decrypt } from "./encryption";

// Helper to get transporter configured from DB
export async function getTransporter() {
    const settings = await prisma.setting.findMany({
        where: {
            key: { in: ["smtpHost", "smtpPort", "smtpUser", "smtpPass", "smtpFrom"] },
        },
    });

    const config = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);

    if (!config.smtpHost || !config.smtpPort || !config.smtpFrom) {
        return null;
    }

    return nodemailer.createTransport({
        host: config.smtpHost,
        port: parseInt(config.smtpPort),
        secure: parseInt(config.smtpPort) === 465,
        auth: config.smtpUser ? {
            user: config.smtpUser,
            pass: config.smtpPass ? decrypt(config.smtpPass) : "",
        } : undefined,
    });
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    const transporter = await getTransporter();
    if (!transporter) return false;

    const fromSetting = await prisma.setting.findUnique({ where: { key: "smtpFrom" } });

    try {
        await transporter.sendMail({
            from: fromSetting?.value,
            to,
            subject,
            html,
        });
        return true;
    } catch (e) {
        console.error("Failed to send email", e);
        return false;
    }
}

export async function sendMonitorAlert(monitorName: string, status: string, incidentStatus: string) {
    // Determine who receives alerts based on their own settings or just to admins if none exist
    // But since it's a global notification tool right now, we can send to everyone with `notifyDown`/`notifyUp`
    // Wait, the settings API currently uses `notifyDown` which is global (or could be per user).
    // Let's get the user who owns the monitor and send it to them.
    const monitor = await prisma.monitor.findFirst({
        where: { name: monitorName },
        include: { user: true }
    });

    if (!monitor) return;

    const to = monitor.user.email;
    const color = status === "ONLINE" ? "#22c55e" : "#ef4444";
    const subject = `[Pulse] Monitor ${status === "ONLINE" ? "Restored" : "Offline"}: ${monitorName}`;
    const html = `
        <div style="font-family: sans-serif; max-w: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: ${color};">Monitor ${status}</h2>
            <p>Your service <strong>${monitorName}</strong> is currently <strong>${status}</strong>.</p>
            <p><strong>Incident Update:</strong> ${incidentStatus}</p>
            <p style="color: #666; font-size: 13px; margin-top: 30px;">Sent automatically by Pulse Monitoring.</p>
        </div>
    `;

    await sendEmail({ to, subject, html });
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
    const subject = `Reset Your Password - Pulse`;
    const html = `
        <div style="font-family: sans-serif; max-w: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #6d28d9;">Pulse Account Recovery</h2>
            <p>You requested to reset your password. Click the secure link below to proceed:</p>
            <div style="margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #6d28d9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
            </div>
            <p>If you did not request this, please ignore this email.</p>
        </div>
    `;

    return sendEmail({ to, subject, html });
}
