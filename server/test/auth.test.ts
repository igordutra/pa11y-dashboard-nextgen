import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { initApp, app } from '../index.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { FastifyInstance } from 'fastify';
import { UserModel } from '../models/user.js';
import bcrypt from 'bcryptjs';

let mongoServer: MongoMemoryServer | null = null;

// Mock config to enable authentication for these tests
vi.mock('../config/index.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    const mockConfig = {
        ...actual.getConfig(),
        authEnabled: true,
        jwtSecret: 'test-secret-key-12345678901234567890'
    };
    return {
        ...actual,
        getConfig: () => mockConfig,
        default: mockConfig
    };
});

describe('Authentication & RBAC Integration Tests', () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        // 1. Setup Database
        mongoServer = await MongoMemoryServer.create();
        process.env.MONGO_URI = mongoServer.getUri();
        process.env.NODE_ENV = 'test';

        // 2. Initialize App
        await initApp();
        fastify = app as any;
        await fastify.ready();

        // 3. Clear database and create test users
        await UserModel.deleteMany({});
        const adminPassword = await bcrypt.hash('admin123', 10);
        await UserModel.create({
            email: 'admin@test.local',
            passwordHash: adminPassword,
            role: 'admin',
            provider: 'local'
        });

        const editorPassword = await bcrypt.hash('editor123', 10);
        await UserModel.create({
            email: 'editor@test.local',
            passwordHash: editorPassword,
            role: 'editor',
            provider: 'local'
        });

        const viewerPassword = await bcrypt.hash('viewer123', 10);
        await UserModel.create({
            email: 'viewer@test.local',
            passwordHash: viewerPassword,
            role: 'viewer',
            provider: 'local'
        });
    }, 60000);

    afterAll(async () => {
        await app.close();
        await mongoose.disconnect();
        if (mongoServer) {
            await mongoServer.stop();
        }
    }, 30000);

    describe('Access Control', () => {
        it('should return 401 Unauthorized when no token is provided', async () => {
            const res = await request(fastify.server).get('/api/urls');
            expect(res.status).toBe(401);
        });

        it('should return 200 OK for valid login', async () => {
            const res = await request(fastify.server)
                .post('/api/auth/login')
                .send({ email: 'admin@test.local', password: 'admin123' });
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user.role).toBe('admin');
        });

        it('should return 401 for invalid credentials', async () => {
            const res = await request(fastify.server)
                .post('/api/auth/login')
                .send({ email: 'admin@test.local', password: 'wrongpassword' });
            
            expect(res.status).toBe(401);
        });
    });

    describe('Role Based Access Control (RBAC)', () => {
        let adminToken: string;
        let editorToken: string;
        let viewerToken: string;

        beforeAll(async () => {
            const adminRes = await request(fastify.server)
                .post('/api/auth/login')
                .send({ email: 'admin@test.local', password: 'admin123' });
            adminToken = adminRes.body.token;

            const editorRes = await request(fastify.server)
                .post('/api/auth/login')
                .send({ email: 'editor@test.local', password: 'editor123' });
            editorToken = editorRes.body.token;

            const viewerRes = await request(fastify.server)
                .post('/api/auth/login')
                .send({ email: 'viewer@test.local', password: 'viewer123' });
            viewerToken = viewerRes.body.token;
        });

        it('viewer should be able to GET urls but not POST', async () => {
            // GET should work
            const getRes = await request(fastify.server)
                .get('/api/urls')
                .set('Authorization', `Bearer ${viewerToken}`);
            expect(getRes.status).toBe(200);

            // POST should fail (403 Forbidden or 401 if decorator fails)
            const postRes = await request(fastify.server)
                .post('/api/urls')
                .set('Authorization', `Bearer ${viewerToken}`)
                .send({ url: 'https://test.com', name: 'Test' });
            expect(postRes.status).toBe(403);
        });

        it('editor should be able to POST urls but not access user management', async () => {
            // POST should work
            const postRes = await request(fastify.server)
                .post('/api/urls')
                .set('Authorization', `Bearer ${editorToken}`)
                .send({ url: 'https://editor-test.com', name: 'Editor Test' });
            expect(postRes.status).toBe(200);

            // GET users should fail
            const usersRes = await request(fastify.server)
                .get('/api/users')
                .set('Authorization', `Bearer ${editorToken}`);
            expect(usersRes.status).toBe(403);
        });

        it('admin should be able to access everything', async () => {
            const usersRes = await request(fastify.server)
                .get('/api/users')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(usersRes.status).toBe(200);
            expect(Array.isArray(usersRes.body)).toBe(true);
        });
    });
});
