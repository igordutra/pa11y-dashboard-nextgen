import { UrlModel } from '../models/index.js';
import { runScan } from './runner.js';
import { CronExpressionParser } from 'cron-parser';

const SCAN_INTERVAL_MS = 60 * 1000; // Check every minute

export const startScheduler = () => {
    console.log('Starting scheduler...');

    setInterval(async () => {
        try {
            // Get all active URLs with a schedule
            const activeUrls = await UrlModel.find({
                status: 'active',
                schedule: { $exists: true, $ne: '' }
            });

            const dueUrls = [];
            for (const url of activeUrls) {
                // If it never ran, it's due
                if (!url.lastScanAt) {
                    dueUrls.push(url);
                    continue;
                }

                try {
                    const interval = CronExpressionParser.parse(url.schedule);
                    const prevRun = interval.prev().toDate();

                    // If the last scan was BEFORE the most recent scheduled time, it's due
                    if (url.lastScanAt < prevRun) {
                        dueUrls.push(url);
                    }
                } catch (err) {
                    console.error(`Invalid cron schedule for ${url.url}: ${url.schedule}`, err);
                }
            }

            if (dueUrls.length > 0) {
                console.log(`Found ${dueUrls.length} URLs due for scanning.`);

                // Simple concurrency control to avoid launching too many browsers at once
                const MAX_CONCURRENT = 3;
                const uniqueIds = Array.from(new Set(dueUrls.map(u => u._id.toString())));

                // Process in chunks
                for (let i = 0; i < uniqueIds.length; i += MAX_CONCURRENT) {
                    const chunk = uniqueIds.slice(i, i + MAX_CONCURRENT);
                    await Promise.all(chunk.map(id => 
                        runScan(id).catch(err => console.error(`Scheduled scan failed for ${id}:`, err))
                    ));
                }
            }

        } catch (error) {
            console.error('Scheduler error:', error);
        }
    }, SCAN_INTERVAL_MS);
};
