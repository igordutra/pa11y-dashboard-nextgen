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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    googleOAuth2?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    auth0OAuth2?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keycloakOAuth2?: any;
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
        redirectStateCookieName: 'pa11y_oauth_github_state',
        cookie: {
          path: '/',
          sameSite: 'lax',
          secure: config.nodeEnv === 'production'
        }
      });
    }

    if (config.googleClientId && config.googleClientSecret) {
      fastify.register(fastifyOauth2, {
        name: 'googleOAuth2',
        credentials: {
          client: {
            id: config.googleClientId,
            secret: config.googleClientSecret
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          auth: (fastifyOauth2 as any).GOOGLE_CONFIGURATION
        },
        startRedirectPath: '/api/auth/google/login',
        callbackUri: `${config.clientUrl}/api/auth/google/callback`,
        scope: ['profile', 'email'],
        redirectStateCookieName: 'pa11y_oauth_google_state',
        cookie: {
          path: '/',
          sameSite: 'lax',
          secure: config.nodeEnv === 'production'
        }
      });
    }

    if (config.auth0ClientId && config.auth0ClientSecret && config.auth0Domain) {
      fastify.register(fastifyOauth2, {
        name: 'auth0OAuth2',
        credentials: {
          client: {
            id: config.auth0ClientId,
            secret: config.auth0ClientSecret
          },
          auth: {
            authorizeHost: `https://${config.auth0Domain}`,
            authorizePath: '/authorize',
            tokenHost: `https://${config.auth0Domain}`,
            tokenPath: '/oauth/token'
          }
        },
        startRedirectPath: '/api/auth/auth0/login',
        callbackUri: `${config.clientUrl}/api/auth/auth0/callback`,
        scope: ['openid', 'profile', 'email'],
        redirectStateCookieName: 'pa11y_oauth_auth0_state',
        cookie: {
          path: '/',
          sameSite: 'lax',
          secure: config.nodeEnv === 'production'
        }
      });
    }

    if (config.keycloakClientId && config.keycloakClientSecret && config.keycloakBaseUrl) {
      fastify.register(fastifyOauth2, {
        name: 'keycloakOAuth2',
        credentials: {
          client: {
            id: config.keycloakClientId,
            secret: config.keycloakClientSecret
          },
          auth: {
            authorizeHost: config.keycloakBaseUrl,
            authorizePath: '/protocol/openid-connect/auth',
            tokenHost: config.keycloakBaseUrl,
            tokenPath: '/protocol/openid-connect/token'
          }
        },
        startRedirectPath: '/api/auth/keycloak/login',
        callbackUri: `${config.clientUrl}/api/auth/keycloak/callback`,
        scope: ['openid', 'profile', 'email'],
        redirectStateCookieName: 'pa11y_oauth_keycloak_state',
        cookie: {
          path: '/',
          sameSite: 'lax',
          secure: config.nodeEnv === 'production'
        }
      });
    }

    fastify.decorate('verifyAuth', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Support token in query string for iframes/media (e.g. /api/proxy?token=...)
        if (!request.headers.authorization && (request.query as any).token) {
          request.headers.authorization = `Bearer ${(request.query as any).token}`;
        }
        await request.jwtVerify();
      } catch {
        reply.status(401).send({ error: 'Unauthorized' });
      }
    });

    fastify.decorate('requireRole', (roles: ('admin' | 'editor' | 'viewer')[]) => {
      return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          // Support token in query string for iframes/media
          if (!request.headers.authorization && (request.query as any).token) {
            request.headers.authorization = `Bearer ${(request.query as any).token}`;
          }
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