import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app, initApp } from '../index.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UrlModel, ScanModel, CategoryModel } from '../models/index.js';

let mongoServer: MongoMemoryServer | null = null;

describe('Analytics API Tests', () => {
    beforeAll(async () => {
        if (process.env.DOCKER_TEST) {
            process.env.MONGO_URI = 'mongodb://mongo:27017/pa11y-dashboard-analytics-test';
        } else {
            mongoServer = await MongoMemoryServer.create();
            process.env.MONGO_URI = mongoServer.getUri();
        }
        process.env.NODE_ENV = 'test';
        await initApp();
        await app.ready();
    }, 60000);

    beforeEach(async () => {
        if (mongoose.connection.readyState === 1) {
            await UrlModel.deleteMany({});
            await ScanModel.deleteMany({});
            await CategoryModel.deleteMany({});
        }
    });

    afterAll(async () => {
        await app.close();
        await mongoose.disconnect();
        if (mongoServer) {
            await mongoServer.stop();
        }
    }, 30000);

    it('should return empty stats when no data exists', async () => {
        const res = await request(app.server).get('/api/analytics');
        
        expect(res.status).toBe(200);
        expect(res.body.globalStats.totalUrls).toBe(0);
        expect(res.body.globalStats.averageScore).toBe(0);
        expect(res.body.issueDistribution).toHaveLength(0);
        expect(res.body.scoreTrend).toHaveLength(0);
    });

    it('should correctly aggregate analytics from scans', async () => {
        // 1. Setup Categories
        const cat = await CategoryModel.create({ name: 'Test Cat', icon: 'globe', color: '#ff0000' });

        // 2. Setup URLs
        const url1 = await UrlModel.create({ 
            url: 'https://site1.com', 
            name: 'Site 1', 
            categoryId: cat._id,
            status: 'active'
        });
        const url2 = await UrlModel.create({ 
            url: 'https://site2.com', 
            name: 'Site 2',
            status: 'active'
        });

        // 3. Setup Scans
        // URL 1 scans
        await ScanModel.create({
            urlId: url1._id,
            timestamp: new Date(Date.now() - 86400000), // yesterday
            score: 80,
            issues: [{ type: 'error', code: 'rule1', message: 'msg1' }]
        });
        await ScanModel.create({
            urlId: url1._id,
            timestamp: new Date(),
            score: 90,
            issues: [
                { type: 'error', code: 'rule1', message: 'msg1' },
                { type: 'warning', code: 'rule2', message: 'msg2' }
            ]
        });

        // URL 2 scan
        await ScanModel.create({
            urlId: url2._id,
            timestamp: new Date(),
            score: 70,
            issues: [{ type: 'error', code: 'rule1', message: 'msg1' }]
        });

        const res = await request(app.server).get('/api/analytics');

        expect(res.status).toBe(200);
        
        // Global Stats
        // Latest scores are 90 and 70. Avg = 80.
        expect(res.body.globalStats.totalUrls).toBe(2);
        expect(res.body.globalStats.totalScans).toBe(3);
        expect(res.body.globalStats.averageScore).toBe(80);
        expect(res.body.globalStats.totalIssues).toBe(3); // 2 from URL1 latest, 1 from URL2 latest

        // Issue Distribution
        const errors = res.body.issueDistribution.find((d: any) => d.name === 'Errors');
        const warnings = res.body.issueDistribution.find((d: any) => d.name === 'Warnings');
        expect(errors.value).toBe(2); // rule1 from site1, rule1 from site2
        expect(warnings.value).toBe(1); // rule2 from site1

        // Top Issues
        expect(res.body.topIssues).toHaveLength(2);
        expect(res.body.topIssues[0].code).toBe('rule1');
        expect(res.body.topIssues[0].count).toBe(2);

        // Category Performance
        const catPerf = res.body.categoryPerformance.find((c: any) => c.name === 'Test Cat');
        const uncatPerf = res.body.categoryPerformance.find((c: any) => c.name === 'Uncategorized');
        expect(catPerf.avgScore).toBe(90);
        expect(uncatPerf.avgScore).toBe(70);
    });
});
