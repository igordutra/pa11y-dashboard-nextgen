import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { app, initApp } from '../index.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UrlModel } from '../models/index.js';
import * as scheduler from '../lib/scheduler.js';

let mongoServer: MongoMemoryServer | null = null;

describe('API Integration Tests', () => {
    beforeAll(async () => {
        // 1. Setup Database
        if (process.env.DOCKER_TEST) {
            // In Docker, use the shared mongo service
            process.env.MONGO_URI = 'mongodb://mongo:27017/pa11y-dashboard-test';
        } else {
            // Locally, use memory server
            mongoServer = await MongoMemoryServer.create();
            process.env.MONGO_URI = mongoServer.getUri();
        }
        
        process.env.NODE_ENV = 'test';

        // 2. Mock Scan Queue to avoid spawning real Puppeteer processes in API tests
        vi.spyOn(scheduler.scanQueue, 'enqueue').mockImplementation(() => {
            console.log('Mocked scanQueue.enqueue called');
        });

        // 3. Initialize App
        await initApp();
        await app.ready();
    }, 60000);

    beforeEach(async () => {
        // Clear database before each test
        if (mongoose.connection.readyState === 1) {
            await UrlModel.deleteMany({});
        }
        vi.clearAllMocks();
    });

    afterAll(async () => {
        await app.close();
        await mongoose.disconnect();
        if (mongoServer) {
            await mongoServer.stop();
        }
    }, 30000);

    describe('System Health', () => {
        it('GET /api should return system status', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api'
            });

            expect(response.statusCode).toBe(200);
            const payload = JSON.parse(response.payload);
            expect(payload.service).toBe('pa11y-dashboard-nextgen-api');
            expect(payload.demoMode).toBe(false);
        });
    });

    describe('URL Management', () => {
        it('should return an empty array when no URLs exist', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/urls'
            });

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.payload)).toEqual([]);
        });

        it('should create a new URL with new v0.3.0 defaults', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/urls',
                payload: {
                    url: 'https://example.com'
                }
            });

            expect(response.statusCode).toBe(200);
            const data = JSON.parse(response.payload);
            
            // Verify new defaults
            expect(data.standard).toBe('WCAG22AA');
            expect(data.schedule).toBe(''); 
            
            // Verify immediate scan trigger logic
            expect(data.status).toBe('scanning');
            expect(scheduler.scanQueue.enqueue).toHaveBeenCalled();
            
            // Verify DB persistence
            const doc = await UrlModel.findById(data._id);
            expect(doc).toBeDefined();
            expect(doc?.url).toBe('https://example.com');
        });

        it('should allow overriding defaults during creation', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/urls',
                payload: {
                    url: 'https://custom.com',
                    standard: 'WCAG2A',
                    schedule: '0 0 * * *'
                }
            });

            expect(response.statusCode).toBe(200);
            const data = JSON.parse(response.payload);
            expect(data.standard).toBe('WCAG2A');
            expect(data.schedule).toBe('0 0 * * *');
        });

        it('should validate URL format', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/urls',
                payload: {
                    url: 'not-a-url'
                }
            });

            expect(response.statusCode).toBe(400);
        });
    });
});
