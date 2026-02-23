import axios from "axios";

interface DiscordEmbed {
    title: string;
    description: string;
    color: number;
    fields?: { name: string; value: string; inline?: boolean }[];
    timestamp?: string;
}

export async function sendDiscordNotification(
    webhookUrl: string,
    event: string,
    monitorName: string,
    status: string,
    responseTime?: number,
    statusPageUrl?: string
) {
    const colors = {
        ONLINE: 0x22c55e, // Green
        OFFLINE: 0xef4444, // Red
        MAINTENANCE: 0xf59e0b, // Amber
    };

    const embed: DiscordEmbed = {
        title: `Monitor ${status === "ONLINE" ? "UP" : "DOWN"}: ${monitorName}`,
        description: `The service **${monitorName}** is now **${status}**.`,
        color: (colors as any)[status] || 0x3b82f6,
        timestamp: new Date().toISOString(),
        fields: [
            { name: "Event", value: event, inline: true },
            { name: "Status", value: status, inline: true },
        ],
    };

    if (responseTime !== undefined) {
        embed.fields?.push({ name: "Response Time", value: `${responseTime}ms`, inline: true });
    }

    if (statusPageUrl) {
        embed.fields?.push({ name: "Status Page", value: `[View Status Page](${statusPageUrl})` });
    }

    try {
        await axios.post(webhookUrl, {
            embeds: [embed],
        });
    } catch (error) {
        console.error("Failed to send Discord notification:", error);
    }
}
