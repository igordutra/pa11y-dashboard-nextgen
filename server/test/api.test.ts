import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { app, initApp } from '../index.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UrlModel } from '../models/index.js';

let mongoServer: MongoMemoryServer;

describe('API Tests', () => {
    beforeAll(async () => {
        // Start in-memory mongodb
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        // Inject MONGO_URI into process.env before initApp
        process.env.MONGO_URI = mongoUri;

        // Wait for fastify to be ready
        await initApp();
        await app.ready();
    });

    beforeEach(async () => {
        // Clear database before each test
        await UrlModel.deleteMany({});
    });

    afterAll(async () => {
        await app.close();
        await mongoose.disconnect();
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    it('GET / should return hello world', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/'
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload)).toEqual({ 
            hello: 'world', 
            service: 'pa11y-dashboard-nextgen-api',
            readonly: false,
            noindex: true
        });
    });

    it('GET /api/urls should return an empty array initially', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/urls'
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload)).toEqual([]);
    });

    it('POST /api/urls should create a new URL', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/urls',
            payload: {
                url: 'https://example.com',
                name: 'Example Domain',
                schedule: '0 * * * *',
                standard: 'WCAG2AA' // Required in Zod schema
            }
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.url).toBe('https://example.com');
        expect(data.name).toBe('Example Domain');
        expect(data._id).toBeDefined();

        // Verify it was saved in Mongo
        const count = await UrlModel.countDocuments();
        expect(count).toBe(1);
    });
});
