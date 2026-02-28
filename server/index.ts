import Fastify from 'fastify';
import cors from '@fastify/cors';
import mongoose from 'mongoose';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { getConfig } from './config/index.js';
import fastifyStatic from '@fastify/static';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fastifyHelmet from '@fastify/helmet';

// Import modular routes
import urlRoutes from './routes/urls.js';
import scanRoutes from './routes/scans.js';
import categoryRoutes from './routes/categories.js';
import settingsRoutes from './routes/settings.js';

const fastify = Fastify({
  logger: true
}).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// Initialize application (routes and plugins) without starting server
export const initApp = async () => {
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
          frameAncestors: ["'self'"],
          imgSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", "https:", "'unsafe-inline'"],
          connectSrc: ["'self'", ...origins],
        },
      },
    });

    await fastify.register(fastifySwagger, {
      openapi: {
        info: {
          title: 'Pa11y Dashboard NextGen API',
          description: 'API for managing Pa11y scans and results',
          version: '1.0.0',
        },
      },
    });

    await fastify.register(fastifySwaggerUi, {
      routePrefix: '/documentation',
    });

    await mongoose.connect(currentConfig.mongoUri);
    fastify.log.info('Connected to MongoDB');

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
    fastify.get('/api', async function handler(request, reply) {
      return { hello: 'world', service: 'pa11y-dashboard-nextgen-api', readonly: currentConfig.readonly, noindex: currentConfig.noindex };
    });

    // Register modular routes
    await fastify.register(urlRoutes);
    await fastify.register(scanRoutes);
    await fastify.register(categoryRoutes);
    await fastify.register(settingsRoutes);

    // Start Scheduler
    const { startScheduler } = await import('./lib/scheduler.js');
    startScheduler();

    await fastify.ready();
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
