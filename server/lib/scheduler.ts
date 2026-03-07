import { UrlModel } from '../models/index.js';
import { runScan } from './runner.js';
import { CronExpressionParser } from 'cron-parser';

const SCAN_INTERVAL_MS = 60 * 1000; // Check every minute

interface QueueMetadata {
    urlId: string;
    enqueuedAt: number;
    priority: boolean;
}

interface RunningMetadata extends QueueMetadata {
    startedAt: number;
}

interface FailedJob {
    urlId: string;
    enqueuedAt: Date;
    startedAt: Date;
    failedAt: Date;
    error: string;
    priority: boolean;
}

class ScanQueue {
    private queue: QueueMetadata[] = [];
    private running: Map<string, RunningMetadata> = new Map();
    private failed: FailedJob[] = [];
    private readonly MAX_FAILED_HISTORY = 50;
    private processing = false;

    // Add a URL to the queue if not already there or running
    enqueue(urlId: string, priority = false) {
        const id = urlId.toString();
        if (this.running.has(id)) return;
        
        // Remove from existing queue if it's there to re-add with priority or just avoid duplicates
        this.queue = this.queue.filter(q => q.urlId !== id);
        
        const metadata: QueueMetadata = {
            urlId: id,
            enqueuedAt: Date.now(),
            priority
        };

        if (priority) {
            this.queue.unshift(metadata);
        } else {
            this.queue.push(metadata);
        }
        
        console.log(`Enqueued URL ${id}. Queue size: ${this.queue.length}`);
        this.process();
    }

    private async process() {
        const { getSettings } = await import('../models/settings.js');
        const settings = await getSettings();
        const maxConcurrent = settings.concurrency || 3;

        if (this.processing || this.running.size >= maxConcurrent || this.queue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.running.size < maxConcurrent && this.queue.length > 0) {
            const metadata = this.queue.shift();
            if (!metadata) break;

            const waitTime = Date.now() - metadata.enqueuedAt;
            const id = metadata.urlId;

            const runningMetadata: RunningMetadata = {
                ...metadata,
                startedAt: Date.now()
            };
            this.running.set(id, runningMetadata);

            console.log(`Starting scan for ${id} (waited ${waitTime}ms). Concurrent: ${this.running.size}`);

            // Run scan in background (no await here to keep the loop going)
            runScan(id)
                .catch(err => {
                    console.error(`Scan failed for ${id}:`, err);
                    this.recordFailure(runningMetadata, err);
                })
                .finally(() => {
                    const executionTime = Date.now() - runningMetadata.startedAt;
                    this.running.delete(id);
                    console.log(`Finished scan for ${id} (took ${executionTime}ms). Concurrent: ${this.running.size}`);
                    this.process(); // Try to process next item
                });
        }

        this.processing = false;
    }

    private recordFailure(meta: RunningMetadata, error: unknown) {
        const failure: FailedJob = {
            urlId: meta.urlId,
            enqueuedAt: new Date(meta.enqueuedAt),
            startedAt: new Date(meta.startedAt),
            failedAt: new Date(),
            error: error instanceof Error ? error.message : String(error),
            priority: meta.priority
        };

        this.failed.unshift(failure);
        if (this.failed.length > this.MAX_FAILED_HISTORY) {
            this.failed.pop();
        }
    }

    getStats() {
        return {
            queueLength: this.queue.length,
            runningCount: this.running.size
        };
    }

    getJobs() {
        return {
            queue: this.queue.map(q => ({
                urlId: q.urlId,
                enqueuedAt: new Date(q.enqueuedAt),
                priority: q.priority,
                status: 'pending'
            })),
            running: Array.from(this.running.values()).map(r => ({
                urlId: r.urlId,
                enqueuedAt: new Date(r.enqueuedAt),
                startedAt: new Date(r.startedAt),
                priority: r.priority,
                status: 'running',
                durationMs: Date.now() - r.startedAt
            })),
            failed: this.failed
        };
    }

    async waitForIdle(timeoutMs = 10000) {
        const start = Date.now();
        while (this.running.size > 0 || this.queue.length > 0) {
            if (Date.now() - start > timeoutMs) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

export const scanQueue = new ScanQueue();

export const startScheduler = () => {
    console.log('Starting scheduler...');

    setInterval(async () => {
        try {
            // Get all active URLs with a schedule
            const activeUrls = await UrlModel.find({
                status: 'active',
                schedule: { $exists: true, $ne: '' }
            });

            for (const url of activeUrls) {
                // If it never ran, it's due
                if (!url.lastScanAt) {
                    scanQueue.enqueue(url._id.toString());
                    continue;
                }

                try {
                    const interval = CronExpressionParser.parse(url.schedule);
                    const prevRun = interval.prev().toDate();

                    // If the last scan was BEFORE the most recent scheduled time, it's due
                    if (url.lastScanAt < prevRun) {
                        scanQueue.enqueue(url._id.toString());
                    }
                } catch (err) {
                    console.error(`Invalid cron schedule for ${url.url}: ${url.schedule}`, err);
                }
            }
        } catch (error) {
            console.error('Scheduler error:', error);
        }
    }, SCAN_INTERVAL_MS);
};
