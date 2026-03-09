import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { app, initApp } from '../index.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | null = null;

describe('Proxy Route Integration Tests', () => {
    beforeAll(async () => {
        if (process.env.DOCKER_TEST) {
            process.env.MONGO_URI = 'mongodb://mongo:27017/pa11y-dashboard-test-proxy';
        } else {
            mongoServer = await MongoMemoryServer.create();
            process.env.MONGO_URI = mongoServer.getUri();
        }
        
        process.env.NODE_ENV = 'test';
        await initApp();
        await app.ready();
    }, 60000);

    afterAll(async () => {
        await app.close();
        await mongoose.disconnect();
        if (mongoServer) {
            await mongoServer.stop();
        }
    }, 30000);

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should validate missing url parameter', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/proxy'
        });

        expect(response.statusCode).toBe(400);
    });

    it('should validate invalid url parameter', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/proxy?url=not-a-url'
        });

        expect(response.statusCode).toBe(400);
    });

    it('should fetch external URL and inject base tag and recording script', async () => {
        const mockHtml = `<html><head><title>Test</title></head><body><h1>Hello</h1></body></html>`;
        
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            url: 'https://example.com/',
            headers: new Headers({
                'content-type': 'text/html; charset=utf-8'
            }),
            text: async () => mockHtml
        });

        const response = await app.inject({
            method: 'GET',
            url: '/api/proxy?url=https://example.com'
        });

        expect(response.statusCode).toBe(200);
        const payload = response.payload;
        
        // Assert base tag injection
        expect(payload).toContain('<base href="https://example.com/">');
        
        // Assert script injection
        expect(payload).toContain('window.parent.postMessage({');
        
        // Assert CSP override
        expect(response.headers['content-security-policy']).toBe("default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
        expect(response.headers['x-frame-options']).toBe('ALLOWALL');
    });

    it('should handle non-HTML responses gracefully', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            url: 'https://example.com/image.png',
            headers: new Headers({
                'content-type': 'image/png'
            }),
            text: async () => 'binary data'
        });

        const response = await app.inject({
            method: 'GET',
            url: '/api/proxy?url=https://example.com/image.png'
        });

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.payload)).toEqual({ error: 'Target URL did not return HTML' });
    });

    it('should handle fetch failures gracefully', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            url: 'https://example.com/notfound',
            headers: new Headers(),
            text: async () => 'Not Found'
        });

        const response = await app.inject({
            method: 'GET',
            url: '/api/proxy?url=https://example.com/notfound'
        });

        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.payload)).toEqual({ error: 'Failed to fetch target URL' });
    });
});
