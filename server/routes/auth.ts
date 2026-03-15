import { FastifyInstance, FastifyRequest } from 'fastify';
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
        return { 
          id: 'guest', 
          email: 'guest@demo.local', 
          role: config.demoMode ? 'viewer' : 'admin' 
        };
      }
      return { id: request.user.userId, email: request.user.email, role: request.user.role };
    }
  );

  /**
   * Reusable OAuth Callback Handler
   */
  const handleOAuthCallback = async (request: FastifyRequest, reply: any, provider: string, oauth2: any, userProfileUrl: string) => {
    if (!oauth2) {
      return reply.status(500).send({ error: `OAuth provider ${provider} not configured` });
    }

    try {
      const token = await oauth2.getAccessTokenFromAuthorizationCodeFlow(request);
      
      const userRes = await fetch(userProfileUrl, {
        headers: {
          Authorization: `Bearer ${token.token.access_token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      const userData = await userRes.json();
      
      // Normalize email (handling GitHub's specific logic)
      let email = userData.email;
      if (provider === 'github' && !email) {
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
            if (primary) email = primary.email;
          }
        } catch (err) {
          fastify.log.error(err, 'Failed to fetch GitHub emails');
        }
      }

      if (!email) {
        return reply.status(400).send({ error: `No email found on ${provider} account` });
      }

      const providerId = userData.id || userData.sub || userData.email;

      let user = await UserModel.findOne({ provider, providerId: providerId.toString() });
      if (!user) {
        // Also check if email exists with other providers or local
        user = await UserModel.findOne({ email });
        if (user) {
          // Link account
          user.provider = provider as any;
          user.providerId = providerId.toString();
          await user.save();
        } else {
          user = await UserModel.create({
            email,
            provider: provider as any,
            providerId: providerId.toString(),
            role: 'viewer' // Default role for new OAuth users
          });
        }
      }

      const payload = { userId: user._id.toString(), role: user.role, email: user.email };
      const jwtToken = server.jwt.sign(payload, { expiresIn: '7d' });

      const redirectUrl = new URL(config.clientUrl);
      redirectUrl.searchParams.set('token', jwtToken);
      reply.redirect(redirectUrl.toString());
    } catch (err) {
      fastify.log.error(err, `${provider} callback error`);
      return reply.status(500).send({ error: 'Authentication failed' });
    }
  };

  // Register callback routes for each enabled provider
  if (config.githubClientId) {
    server.get('/api/auth/github/callback', async (req, res) => handleOAuthCallback(req, res, 'github', (server as any).githubOAuth2, 'https://api.github.com/user'));
  }
  if (config.googleClientId) {
    server.get('/api/auth/google/callback', async (req, res) => handleOAuthCallback(req, res, 'google', (server as any).googleOAuth2, 'https://www.googleapis.com/oauth2/v2/userinfo'));
  }
  if (config.auth0ClientId) {
    server.get('/api/auth/auth0/callback', async (req, res) => handleOAuthCallback(req, res, 'auth0', (server as any).auth0OAuth2, `https://${config.auth0Domain}/userinfo`));
  }
  if (config.keycloakClientId) {
    server.get('/api/auth/keycloak/callback', async (req, res) => handleOAuthCallback(req, res, 'keycloak', (server as any).keycloakOAuth2, `${config.keycloakBaseUrl}/protocol/openid-connect/userinfo`));
  }
}