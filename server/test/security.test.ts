import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { initApp, app } from '../index.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UrlModel } from '../models/index.js';
import { FastifyInstance } from 'fastify';

let mongoServer: MongoMemoryServer | null = null;

describe('Security Enhancements Tests', () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        // 1. Setup Database
        if (process.env.DOCKER_TEST) {
            process.env.MONGO_URI = 'mongodb://mongo:27017/pa11y-dashboard-security-test';
        } else {
            mongoServer = await MongoMemoryServer.create();
            process.env.MONGO_URI = mongoServer.getUri();
        }
        
        process.env.NODE_ENV = 'test';

        // 2. Initialize App
        await initApp();
        fastify = app as any;
        await fastify.ready();
    }, 60000);

    afterAll(async () => {
        await app.close();
        await mongoose.disconnect();
        if (mongoServer) {
            await mongoServer.stop();
        }
    }, 30000);

    describe('Demo Mode / Read-only restrictions (#46)', () => {
        it('should return 403 for mutations when readonly is enabled', async () => {
            // Force config to be readonly
            vi.mock('../config/index.js', async (importOriginal) => {
                const actual = await importOriginal() as any;
                return {
                    ...actual,
                    getConfig: () => ({
                        ...actual.getConfig(),
                        readonly: true,
                        demoMode: true
                    }),
                    default: {
                        ...actual.default,
                        readonly: true,
                        demoMode: true
                    }
                };
            });

            // Re-import routes or re-init app might be needed if using mocking like this
            // But since checkReadonly dynamic imports config, it should pick up the mock
            
            const res = await request(fastify.server)
                .post('/api/urls')
                .send({ url: 'https://example.com' });
            
            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Demo Mode');
        });
    });

    describe('XSS Prevention in Report Generator (#36)', () => {
        it('should escape HTML in the generated report', async () => {
            const { generateHtmlReport } = await import('../lib/reportGenerator.js');
            const mockUrl: any = {
                url: 'https://example.com"><script>alert(1)</script>',
                name: '<b>Malicious Name</b>'
            };
            const mockScan: any = {
                timestamp: new Date(),
                score: 100,
                issues: [
                    {
                        type: 'error',
                        code: 'test-code',
                        message: '<i>XSS in message</i>',
                        selector: 'div > .malicious',
                        context: '<span>XSS in context</span>'
                    }
                ]
            };

            const html = generateHtmlReport(mockUrl, mockScan);
            
            // Check that raw tags are NOT present
            expect(html).not.toContain('"><script>alert(1)</script>');
            expect(html).not.toContain('<b>Malicious Name</b>');
            expect(html).not.toContain('<i>XSS in message</i>');
            expect(html).not.toContain('<span>XSS in context</span>');
            
            // Check that escaped versions ARE present
            expect(html).toContain('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
            expect(html).toContain('&lt;b&gt;Malicious Name&lt;/b&gt;');
            expect(html).toContain('&lt;i&gt;XSS in message&lt;/i&gt;');
            expect(html).toContain('&lt;span&gt;XSS in context&lt;/span&gt;');
        });
    });

    describe('Rate Limiting (#35)', () => {
        it('should eventually return 429 for too many scan trigger requests', async () => {
            // Create a mock URL first
            const url = await UrlModel.create({
                url: 'https://example.com',
                name: 'Test Rate Limit',
                status: 'active'
            });

            // Make multiple requests
            // Stricter limit is 2 per minute
            await request(fastify.server).post(`/api/urls/${url._id}/scan`);
            await request(fastify.server).post(`/api/urls/${url._id}/scan`);
            
            const res = await request(fastify.server).post(`/api/urls/${url._id}/scan`);
            
            expect(res.status).toBe(429);
            expect(res.body.message).toContain('Rate limit exceeded');
        });
    });
});
