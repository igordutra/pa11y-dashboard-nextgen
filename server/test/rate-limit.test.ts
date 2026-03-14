import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';

describe('Rate Limiting and Trust Proxy', () => {
    let app: FastifyInstance;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(async () => {
        if (app) await app.close();
    });

    it('should use X-Forwarded-For when trustProxy is enabled', async () => {
        app = Fastify({
            trustProxy: true
        });

        await app.register(fastifyRateLimit, {
            max: 2,
            timeWindow: '1 minute'
        });

        app.get('/test', async () => ({ success: true }));

        // First request from Proxy A (Client 1)
        const res1 = await app.inject({
            method: 'GET',
            url: '/test',
            headers: { 'x-forwarded-for': '1.1.1.1' }
        });
        expect(res1.statusCode).toBe(200);

        // Second request from Proxy A (Client 1)
        const res2 = await app.inject({
            method: 'GET',
            url: '/test',
            headers: { 'x-forwarded-for': '1.1.1.1' }
        });
        expect(res2.statusCode).toBe(200);

        // Third request from Proxy A (Client 1) -> 429
        const res3 = await app.inject({
            method: 'GET',
            url: '/test',
            headers: { 'x-forwarded-for': '1.1.1.1' }
        });
        expect(res3.statusCode).toBe(429);

        // Request from Proxy A (Client 2) -> 200 (different IP detected)
        const res4 = await app.inject({
            method: 'GET',
            url: '/test',
            headers: { 'x-forwarded-for': '2.2.2.2' }
        });
        expect(res4.statusCode).toBe(200);
    });

    it('should NOT use X-Forwarded-For when trustProxy is disabled', async () => {
        app = Fastify({
            trustProxy: false
        });

        await app.register(fastifyRateLimit, {
            max: 1,
            timeWindow: '1 minute'
        });

        app.get('/test', async () => ({ success: true }));

        // Request 1 from Proxy IP
        const res1 = await app.inject({
            method: 'GET',
            url: '/test',
            headers: { 'x-forwarded-for': '1.1.1.1' },
            remoteAddress: '10.0.0.1' // The proxy's actual IP
        });
        expect(res1.statusCode).toBe(200);

        // Request 2 from Proxy IP (but different client)
        const res2 = await app.inject({
            method: 'GET',
            url: '/test',
            headers: { 'x-forwarded-for': '2.2.2.2' },
            remoteAddress: '10.0.0.1' // Same proxy IP
        });
        
        // Since trustProxy is false, it sees '10.0.0.1' for both, so it triggers 429
        expect(res2.statusCode).toBe(429);
    });
});
