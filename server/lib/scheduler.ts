import { UrlModel } from '../models/index.js';
import { runScan } from './runner.js';
import { CronExpressionParser } from 'cron-parser';

const SCAN_INTERVAL_MS = 60 * 1000; // Check every minute
const MAX_CONCURRENT = 3;

class ScanQueue {
    private queue: string[] = [];
    private running: Set<string> = new Set();
    private processing = false;

    // Add a URL to the queue if not already there or running
    enqueue(urlId: string, priority = false) {
        const id = urlId.toString();
        if (this.running.has(id)) return;
        
        // Remove from existing queue if it's there to re-add with priority or just avoid duplicates
        this.queue = this.queue.filter(qId => qId !== id);
        
        if (priority) {
            this.queue.unshift(id);
        } else {
            this.queue.push(id);
        }
        
        console.log(`Enqueued URL ${id}. Queue size: ${this.queue.length}`);
        this.process();
    }

    private async process() {
        if (this.processing || this.running.size >= MAX_CONCURRENT || this.queue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.running.size < MAX_CONCURRENT && this.queue.length > 0) {
            const id = this.queue.shift();
            if (!id) break;

            this.running.add(id);
            console.log(`Starting scan for ${id}. Concurrent: ${this.running.size}`);

            // Run scan in background (no await here to keep the loop going)
            runScan(id)
                .catch(err => console.error(`Scan failed for ${id}:`, err))
                .finally(() => {
                    this.running.delete(id);
                    console.log(`Finished scan for ${id}. Concurrent: ${this.running.size}`);
                    this.process(); // Try to process next item
                });
        }

        this.processing = false;
    }

    getStats() {
        return {
            queueLength: this.queue.length,
            runningCount: this.running.size
        };
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
