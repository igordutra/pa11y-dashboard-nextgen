import Fastify from 'fastify';
import cors from '@fastify/cors';
import mongoose from 'mongoose';
import { serializerCompiler, validatorCompiler, ZodTypeProvider, jsonSchemaTransform } from 'fastify-type-provider-zod';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { getConfig } from './config/index.js';
import fastifyStatic from '@fastify/static';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCookie from '@fastify/cookie';

// Import modular routes
import urlRoutes from './routes/urls.js';
import scanRoutes from './routes/scans.js';
import categoryRoutes from './routes/categories.js';
import settingsRoutes from './routes/settings.js';
import proxyRoutes from './routes/proxy.js';
import analyticsRoutes from './routes/analytics.js';
import authRoutes from './routes/auth.js';
import authPlugin from './plugins/auth.js';
import usersRoutes from './routes/users.js';

const fastify = Fastify({
  logger: true,
  trustProxy: process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production'
}).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

let isInitialized = false;

// Initialize application (routes and plugins) without starting server
export const initApp = async () => {
  if (isInitialized) return fastify;
  
  const currentConfig = getConfig();
  try {
    const origins = currentConfig.clientUrl.split(',').map(url => url.trim());
    await fastify.register(cors, {
      origin: origins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    });

    await fastify.register(fastifyHelmet, {
      crossOriginResourcePolicy: false, // Required to serve images to the frontend
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", "https:", "data:"],
          formAction: ["'self'"],
          frameAncestors: ["'self'", ...origins],
          imgSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", "https:", "'unsafe-inline'"],
          connectSrc: ["'self'", ...origins],
        },
      },
    });

    if (currentConfig.nodeEnv !== 'production') {
      await fastify.register(fastifySwagger, {
        openapi: {
          info: {
            title: 'Pa11y Dashboard NextGen API',
            description: 'API for managing Pa11y scans and results',
            version: '0.8.2',
          },
        },
        transform: jsonSchemaTransform,
      });

      await fastify.register(fastifySwaggerUi, {
        routePrefix: '/documentation',
      });
    }

    await fastify.register(fastifyRateLimit, {
      max: 1000,
      timeWindow: '1 minute',
      skip: (request: any) => !request.url.startsWith('/api')
    } as any);

    await fastify.register(fastifyCookie);

    await mongoose.connect(currentConfig.mongoUri);
    fastify.log.info('Connected to MongoDB');

    // Bootstrap: Create initial admin account if none exists
    const { UserModel } = await import('./models/index.js');
    const adminCount = await UserModel.countDocuments({ role: 'admin' });
    if (adminCount === 0 && currentConfig.authEnabled) {
      const crypto = await import('crypto');
      const bcrypt = await import('bcryptjs');
      const tempPassword = crypto.randomBytes(8).toString('hex');
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      
      await UserModel.create({
        email: 'admin@demo.local',
        passwordHash,
        role: 'admin',
        provider: 'local'
      });

      console.log('\n' + '!'.repeat(60));
      console.log('BOOTSTRAP: No admin account found. Created initial account:');
      console.log('Email:    admin@demo.local');
      console.log(`Password: ${tempPassword}`);
      console.log('IMPORTANT: Please change this password immediately after login!');
      console.log('!'.repeat(60) + '\n');
    }

    // Reset URLs stuck in 'scanning' status to 'active' on startup
    const { UrlModel } = await import('./models/index.js');
    const resetResult = await UrlModel.updateMany(
      { status: 'scanning' },
      { status: 'active' }
    );
    if (resetResult.modifiedCount > 0) {
      fastify.log.info(`Reset ${resetResult.modifiedCount} URLs from 'scanning' to 'active' status.`);
    }

    // Ensure screenshots directory exists
    const screenshotsDir = currentConfig.screenshotsDir;
    try {
      await fs.access(screenshotsDir);
    } catch {
      await fs.mkdir(screenshotsDir, { recursive: true });
    }

    // Serve static files
    await fastify.register(fastifyStatic, {
      root: screenshotsDir,
      prefix: '/screenshots/',
    });

    // In production, serve the frontend React application
    if (currentConfig.nodeEnv === 'production') {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const clientDistDir = path.join(__dirname, '../client/dist');

      await fastify.register(fastifyStatic, {
        root: clientDistDir,
        decorateReply: false,
      });

      // Catch-all to serve index.html for React Router
      fastify.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith('/api/') || request.url.startsWith('/documentation')) {
          return reply.status(404).send({ error: 'Not Found', message: `Route ${request.method}:${request.url} not found` });
        }
        return reply.sendFile('index.html', clientDistDir);
      });
    }

    // Basic Routes
    fastify.get('/api', async function handler(_request, _reply) {
      return { 
        hello: 'world', 
        service: 'pa11y-dashboard-nextgen-api', 
        readonly: currentConfig.readonly, 
        noindex: currentConfig.noindex,
        demoMode: currentConfig.demoMode,
        authEnabled: currentConfig.authEnabled,
        providers: [
          currentConfig.githubClientId && 'github',
          currentConfig.googleClientId && 'google',
          currentConfig.auth0ClientId && 'auth0',
          currentConfig.keycloakClientId && 'keycloak',
        ].filter(Boolean)
      };
    });

    // Register modular routes
    await fastify.register(authPlugin);
    await fastify.register(authRoutes);
    await fastify.register(usersRoutes);
    await fastify.register(urlRoutes);
    await fastify.register(scanRoutes);
    await fastify.register(categoryRoutes);
    await fastify.register(settingsRoutes);
    await fastify.register(proxyRoutes);
    await fastify.register(analyticsRoutes);

    // Global Error Handler
    fastify.setErrorHandler((error, request, reply) => {
      const err = error as any;
      const statusCode = err.statusCode || 500;
      const isRateLimit = statusCode === 429;

      fastify.log.error({ 
        err,
        url: request.url,
        method: request.method,
        body: request.body
      }, isRateLimit ? 'Rate limit hit' : 'Unhandled error');

      reply.status(statusCode).send({
        error: isRateLimit ? 'Too Many Requests' : (err.error || 'Internal Server Error'),
        message: err.message,
        statusCode: statusCode
      });
    });

    // Start Scheduler
    if (currentConfig.demoMode) {
      fastify.log.info('Running in DEMO MODE: Background scheduler disabled.');
    } else {
      const { startScheduler } = await import('./lib/scheduler.js');
      startScheduler();
    }

    await fastify.ready();
    isInitialized = true;
    return fastify;
  } catch (err) {
    fastify.log.error(err);
    throw err;
  }
};

const start = async () => {
  const currentConfig = getConfig();
  try {
    await initApp();
    await fastify.listen({ port: currentConfig.port, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

export const app = fastify;

if (process.env.NODE_ENV !== 'test') {
  start();
}
 
