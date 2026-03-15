import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/index.js';
import { getConfig } from '../config/index.js';

export default async function usersRoutes(fastify: FastifyInstance) {
    const f = fastify.withTypeProvider<ZodTypeProvider>();
    const config = getConfig();

    f.put('/api/users/me/password', {
        preValidation: config.authEnabled ? [f.verifyAuth] : [],
        schema: {
            description: 'Update current user password',
            tags: ['Users'],
            body: z.object({
                currentPassword: z.string(),
                newPassword: z.string().min(6)
            }),
            response: {
                200: z.object({ success: z.boolean() }),
                400: z.object({ error: z.string() }),
                401: z.object({ error: z.string() })
            }
        }
    }, async (request, reply) => {
        if (!config.authEnabled) {
            return reply.status(400).send({ error: 'Authentication is disabled' });
        }

        const { currentPassword, newPassword } = request.body;
        const user = await UserModel.findById(request.user.userId);

        if (!user || !user.passwordHash || user.provider !== 'local') {
            return reply.status(400).send({ error: 'Password change not available for this account' });
        }

        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            return reply.status(400).send({ error: 'Invalid current password' });
        }

        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await user.save();

        return { success: true };
    });

    // ADMIN: List all users
    f.get('/api/users', {
        preValidation: config.authEnabled ? [f.requireRole(['admin'])] : [],
        schema: {
            description: 'List all registered users (Admin only)',
            tags: ['Users'],
            response: {
                200: z.array(z.object({
                    _id: z.string(),
                    email: z.string(),
                    role: z.string(),
                    provider: z.string(),
                    createdAt: z.any()
                }))
            }
        }
    }, async () => {
        const users = await UserModel.find().sort({ createdAt: -1 });
        return users.map(u => ({
            ...u.toObject(),
            _id: u._id.toString()
        }));
    });

    // ADMIN: Update user role
    f.put('/api/users/:id/role', {
        preValidation: config.authEnabled ? [f.requireRole(['admin'])] : [],
        schema: {
            description: 'Update user role (Admin only)',
            tags: ['Users'],
            params: z.object({ id: z.string() }),
            body: z.object({
                role: z.enum(['admin', 'editor', 'viewer'])
            }),
            response: {
                200: z.object({ success: z.boolean() }),
                400: z.object({ error: z.string() }),
                403: z.object({ error: z.string() }),
                404: z.object({ error: z.string() })
            }
        }
    }, async (request, reply) => {
        const { id } = request.params;
        const { role } = request.body;

        // Prevent changing own role
        if (id === request.user.userId) {
            return reply.status(400).send({ error: 'You cannot change your own role' });
        }

        const user = await UserModel.findByIdAndUpdate(id, { role }, { new: true });
        if (!user) {
            return reply.status(404).send({ error: 'User not found' });
        }

        return { success: true };
    });

    // ADMIN: Delete user
    f.delete('/api/users/:id', {
        preValidation: config.authEnabled ? [f.requireRole(['admin'])] : [],
        schema: {
            description: 'Delete user account (Admin only)',
            tags: ['Users'],
            params: z.object({ id: z.string() }),
            response: {
                200: z.object({ success: z.boolean() }),
                400: z.object({ error: z.string() }),
                404: z.object({ error: z.string() })
            }
        }
    }, async (request, reply) => {
        const { id } = request.params;

        // Prevent deleting yourself
        if (id === request.user.userId) {
            return reply.status(400).send({ error: 'You cannot delete your own account' });
        }

        const user = await UserModel.findByIdAndDelete(id);
        if (!user) {
            return reply.status(404).send({ error: 'User not found' });
        }

        return { success: true };
    });
}
