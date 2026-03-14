import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/index.js';
import { getConfig } from '../config/index.js';

export default async function (fastify: FastifyInstance) {
  const config = getConfig();
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.post(
    '/api/auth/login',
    {
      schema: {
        description: 'Login with email and password',
        tags: ['Auth'],
        body: z.object({
          email: z.string().email(),
          password: z.string()
        }),
        response: {
          200: z.object({ token: z.string(), user: z.object({ id: z.string(), email: z.string(), role: z.string() }) }),
          401: z.object({ error: z.string() }),
          500: z.object({ error: z.string() })
        }
      }
    },
    async (request, reply) => {
      if (!config.authEnabled) {
        return reply.status(401).send({ error: 'Authentication is disabled' });
      }

      const { email, password } = request.body;
      
      try {
        const user = await UserModel.findOne({ email, provider: 'local' });

        if (!user || !user.passwordHash) {
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const payload = { userId: user._id.toString(), role: user.role, email: user.email };
        const token = server.jwt.sign(payload, { expiresIn: '7d' });

        return { token, user: { id: payload.userId, email: payload.email, role: payload.role } };
      } catch (err) {
        fastify.log.error(err, 'Login error');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  server.get(
    '/api/auth/me',
    {
      preValidation: config.authEnabled ? [server.verifyAuth] : [],
      schema: {
        description: 'Get current user profile',
        tags: ['Auth'],
        response: {
          200: z.object({ id: z.string(), email: z.string(), role: z.string() }),
          401: z.object({ error: z.string() }),
          500: z.object({ error: z.string() })
        }
      }
    },
    async (request, _reply) => {
      if (!config.authEnabled) {
        return { id: 'admin', email: 'admin@demo.local', role: 'admin' };
      }
      return { id: request.user.userId, email: request.user.email, role: request.user.role };
    }
  );

  if (config.githubClientId && config.githubClientSecret) {
    server.get('/api/auth/github/callback', async function (request, reply) {
      if (!this.githubOAuth2) {
        return reply.status(500).send({ error: 'OAuth not configured' });
      }
      const token = await this.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token.token.access_token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      const userData = await userRes.json();
      
      if (!userData.email) {
        // Fallback to fetch emails
        try {
          const emailsRes = await fetch('https://api.github.com/user/emails', {
            headers: {
              Authorization: `Bearer ${token.token.access_token}`,
              Accept: 'application/vnd.github.v3+json'
            }
          });
          const emails = await emailsRes.json();
          
          if (Array.isArray(emails)) {
            const primary = emails.find((e: any) => e.primary) || emails[0];
            if (primary) userData.email = primary.email;
          } else {
            fastify.log.warn({ emails }, 'GitHub emails response is not an array');
          }
        } catch (err) {
          fastify.log.error(err, 'Failed to fetch GitHub emails');
        }
      }

      if (!userData.email) {
        return reply.status(400).send({ error: 'No email found on GitHub account' });
      }

      let user = await UserModel.findOne({ provider: 'github', providerId: userData.id.toString() });
      if (!user) {
        // Also check if email exists with local provider
        const existingLocal = await UserModel.findOne({ email: userData.email });
        if (existingLocal) {
          // Link account
          existingLocal.provider = 'github';
          existingLocal.providerId = userData.id.toString();
          await existingLocal.save();
          user = existingLocal;
        } else {
          user = await UserModel.create({
            email: userData.email,
            provider: 'github',
            providerId: userData.id.toString(),
            role: 'viewer' // Default role for new OAuth users
          });
        }
      }

      const payload = { userId: user._id.toString(), role: user.role, email: user.email };
      const jwtToken = server.jwt.sign(payload, { expiresIn: '7d' });

      // Redirect to frontend with token (this assumes frontend handles ?token=xyz)
      const redirectUrl = new URL(config.clientUrl);
      redirectUrl.searchParams.set('token', jwtToken);
      reply.redirect(redirectUrl.toString());
    });
  }
}