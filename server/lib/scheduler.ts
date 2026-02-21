import { UrlModel } from '../models/index.js';
import { runScan } from './runner.js';
import { CronExpressionParser } from 'cron-parser';

const SCAN_INTERVAL_MS = 60 * 1000; // Check every minute

export const startScheduler = () => {
    console.log('Starting scheduler...');

    setInterval(async () => {
        try {
            // 1. Process Interval-based URLs (frequency)
            // Where schedule is NOT set
            const dueIntervalUrls = await UrlModel.aggregate([
                {
                    $match: {
                        $or: [
                            { schedule: { $exists: false } },
                            { schedule: null },
                            { schedule: '' }
                        ],
                        status: 'active', // Only check active URLs
                        $expr: {
                            $or: [
                                { $not: ["$lastScanAt"] },
                                {
                                    $gte: [
                                        { $subtract: [new Date(), "$lastScanAt"] },
                                        { $multiply: ["$frequency", 60 * 1000] }
                                    ]
                                }
                            ]
                        }
                    }
                }
            ]);

            // 2. Process Cron-based URLs
            // Where schedule IS set
            const cronUrls = await UrlModel.find({
                schedule: { $nin: [null, ''] },
                status: 'active'
            });

            const dueCronUrls = [];
            for (const url of cronUrls) {
                if (!url.lastScanAt) {
                    dueCronUrls.push(url);
                    continue;
                }

                try {
                    const interval = CronExpressionParser.parse(url.schedule!);
                    const prevRun = interval.prev().toDate();

                    if (url.lastScanAt < prevRun) {
                        dueCronUrls.push(url);
                    }
                } catch (err) {
                    console.error(`Invalid cron schedule for ${url.url}: ${url.schedule}`, err);
                }
            }

            const allDue = [...dueIntervalUrls, ...dueCronUrls];

            if (allDue.length > 0) {
                console.log(`Found ${allDue.length} URLs due for scanning (${dueIntervalUrls.length} interval, ${dueCronUrls.length} cron).`);

                // Use a set to avoid duplicates if any logic overlaps (unlikely with query but safe)
                const uniqueIds = new Set(allDue.map(u => u._id.toString()));

                for (const id of uniqueIds) {
                    runScan(id).catch(err => console.error(`Scheduled scan failed for ${id}:`, err));
                }
            }

        } catch (error) {
            console.error('Scheduler error:', error);
        }
    }, SCAN_INTERVAL_MS);
};
