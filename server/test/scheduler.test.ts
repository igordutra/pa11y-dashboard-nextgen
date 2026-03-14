import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanQueue } from '../lib/scheduler.js';
import * as runner from '../lib/runner.js';
import * as settings from '../models/settings.js';

// Mock dependencies
vi.mock('../models/index.js', () => ({
    UrlModel: {
        find: vi.fn(),
        findById: vi.fn(),
        findByIdAndUpdate: vi.fn()
    }
}));

vi.mock('../lib/runner.js', () => ({
    runScan: vi.fn()
}));

vi.mock('../models/settings.js', () => ({
    getSettings: vi.fn()
}));

describe('ScanQueue Concurrency', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Access private queue state via any for testing if needed, 
        // or just rely on public getStats()
        const q = scanQueue as any;
        q.queue = [];
        q.running.clear();
        q.failed = [];
        q.processing = false;
    });

    it('should respect maxConcurrent settings', async () => {
        const maxConcurrent = 2;
        vi.mocked(settings.getSettings).mockResolvedValue({ concurrency: maxConcurrent } as any);
        
        // Mock runScan to return a promise we can control
        let resolveScan1: (value?: unknown) => void = () => {};
        const scan1Promise = new Promise(resolve => { resolveScan1 = resolve; });
        const scan2Promise = new Promise(() => {}); // Never resolves for this test
        
        vi.mocked(runner.runScan)
            .mockReturnValueOnce(scan1Promise as Promise<any>)
            .mockReturnValueOnce(scan2Promise as Promise<any>)
            .mockReturnValue(new Promise(() => {}) as Promise<any>); // Others stay pending

        // Enqueue 3 items
        scanQueue.enqueue('url1');
        scanQueue.enqueue('url2');
        scanQueue.enqueue('url3');

        // Give it a moment to process the queue
        await new Promise(resolve => setTimeout(resolve, 100));

        const stats = scanQueue.getStats();
        expect(stats.runningCount).toBe(2);
        expect(stats.queueLength).toBe(1);
        expect(runner.runScan).toHaveBeenCalledTimes(2);

        // Finish one scan
        resolveScan1();
        
        // Give it a moment to pick up the next item
        await new Promise(resolve => setTimeout(resolve, 100));

        const statsAfter = scanQueue.getStats();
        expect(statsAfter.runningCount).toBe(2);
        expect(statsAfter.queueLength).toBe(0);
        expect(runner.runScan).toHaveBeenCalledTimes(3);
    });

    it('should handle priority items correctly', async () => {
        vi.mocked(settings.getSettings).mockResolvedValue({ concurrency: 1 } as any);
        
        // First scan stays running
        vi.mocked(runner.runScan).mockReturnValue(new Promise(() => {}) as any);

        scanQueue.enqueue('normal1');
        await new Promise(resolve => setTimeout(resolve, 50));
        
        scanQueue.enqueue('normal2', false);
        scanQueue.enqueue('priority1', true);

        const jobs = scanQueue.getJobs();
        // running: [normal1]
        // queue: [priority1, normal2]
        expect(jobs.queue[0].urlId).toBe('priority1');
        expect(jobs.queue[1].urlId).toBe('normal2');
    });
});
