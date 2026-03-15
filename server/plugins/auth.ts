import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import fastifyOauth2 from '@fastify/oauth2';
import { FastifyReply, FastifyRequest } from 'fastify';
import { getConfig } from '../config/index.js';

export interface JwtPayload {
  userId: string;
  role: 'admin' | 'editor' | 'viewer';
  email: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    verifyAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (roles: ('admin' | 'editor' | 'viewer')[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    githubOAuth2?: any;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

export default fp(async (fastify) => {
  const config = getConfig();

  if (config.authEnabled) {
    fastify.register(fastifyJwt, {
      secret: config.jwtSecret
    });

    if (config.githubClientId && config.githubClientSecret) {
      fastify.register(fastifyOauth2, {
        name: 'githubOAuth2',
        credentials: {
          client: {
            id: config.githubClientId,
            secret: config.githubClientSecret
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          auth: (fastifyOauth2 as any).GITHUB_CONFIGURATION
        },
        startRedirectPath: '/api/auth/github/login',
        callbackUri: `${config.clientUrl}/api/auth/github/callback`,
        scope: ['user:email'],
        redirectStateCookieName: 'pa11y_oauth_state',
        cookie: {
          path: '/',
          sameSite: 'lax',
          secure: config.nodeEnv === 'production'
        }
      });
    }

    fastify.decorate('verifyAuth', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        reply.status(401).send({ error: 'Unauthorized' });
      }
    });

    fastify.decorate('requireRole', (roles: ('admin' | 'editor' | 'viewer')[]) => {
      return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          await request.jwtVerify();
          if (!roles.includes(request.user.role)) {
            reply.status(403).send({ error: 'Forbidden', message: 'Insufficient permissions' });
          }
        } catch {
          reply.status(401).send({ error: 'Unauthorized' });
        }
      };
    });
  } else {
    // Dummy decorators when auth is disabled
    fastify.decorate('verifyAuth', async () => {});
    fastify.decorate('requireRole', () => async () => {});
  }
});