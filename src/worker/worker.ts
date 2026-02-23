import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../lib/db';
import { performCheck } from '../lib/monitor';
import { sendDiscordNotification } from '../lib/notifications';

const connectionOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
};

const worker = new Worker('monitoring-queue', async (job: Job) => {
    const { monitorId } = job.data;

    const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
        include: { user: true }
    });

    if (!monitor) return;

    const result = await performCheck(
        monitor.type,
        monitor.target,
        monitor.port,
        monitor.timeout,
        monitor.keyword
    );

    // Update Monitor status and last checked
    const previousStatus = monitor.status;
    await prisma.monitor.update({
        where: { id: monitorId },
        data: {
            status: result.status,
            lastChecked: new Date(),
        }
    });

    // Log the result
    await prisma.checkResult.create({
        data: {
            monitorId,
            status: result.status,
            responseTime: result.responseTime,
        }
    });

    // Handle Notifications
    if (previousStatus === 'ONLINE' && result.status === 'OFFLINE') {
        // Went down
        console.log(`Monitor ${monitor.name} is DOWN!`);

        // Create an incident automatically
        await prisma.incident.create({
            data: {
                monitorId,
                title: `Service Down: ${monitor.name}`,
                description: result.message || 'The service is unreachable.',
                status: 'INVESTIGATING'
            }
        });

        if (process.env.DISCORD_WEBHOOK_URL) {
            await sendDiscordNotification(
                process.env.DISCORD_WEBHOOK_URL,
                'Monitor Down',
                monitor.name,
                'OFFLINE',
                result.responseTime
            );
        }
    } else if (previousStatus === 'OFFLINE' && result.status === 'ONLINE') {
        // Recovered
        console.log(`Monitor ${monitor.name} is UP!`);

        // Mark incident as resolved
        await prisma.incident.updateMany({
            where: { monitorId, status: { not: 'RESOLVED' } },
            data: { status: 'RESOLVED' }
        });

        if (process.env.DISCORD_WEBHOOK_URL) {
            await sendDiscordNotification(
                process.env.DISCORD_WEBHOOK_URL,
                'Monitor Restored',
                monitor.name,
                'ONLINE',
                result.responseTime
            );
        }
    }

}, { connection: connectionOptions });

console.log('Monitoring worker started');

worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed: ${err.message}`);
});
