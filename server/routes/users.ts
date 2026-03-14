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
}
