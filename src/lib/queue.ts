import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connectionOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
};

export const monitoringQueue = new Queue('monitoring-queue', { connection: connectionOptions });

export async function scheduleMonitor(monitorId: string, intervalSeconds: number) {
    await monitoringQueue.add(
        `monitor-${monitorId}`,
        { monitorId },
        {
            repeat: {
                every: intervalSeconds * 1000,
            },
            jobId: monitorId, // Use monitor ID as Job ID to prevent duplicates
        }
    );
}

export async function removeMonitorFromSchedule(monitorId: string) {
    // BullMQ repeatable jobs are removal by key/id
    // This is a bit complex in BullMQ, usually handled by removing the repeatable job
    const jobs = await monitoringQueue.getRepeatableJobs();
    const job = jobs.find(j => j.id === monitorId);
    if (job) {
        await monitoringQueue.removeRepeatableByKey(job.key);
    }
}
