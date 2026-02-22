import Fastify from 'fastify';
import cors from '@fastify/cors';
import mongoose from 'mongoose';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { UrlModel, ScanModel } from './models/index.js';
import { SettingsModel, getSettings } from './models/settings.js';
import { CategoryModel, CATEGORY_ICONS } from './models/category.js';
import { z } from 'zod';
import config from './config/index.js';

// Shared Zod schema for per-URL overrides
const overridesSchema = z.object({
  runners: z.array(z.enum(['axe', 'htmlcs'])).optional(),
  includeNotices: z.boolean().optional(),
  includeWarnings: z.boolean().optional(),
  timeout: z.number().optional(),
  wait: z.number().optional(),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
    isMobile: z.boolean().optional()
  }).optional(),
  hideElements: z.string().optional(),
  rootElement: z.string().optional(),
  userAgent: z.string().optional(),
  ignore: z.array(z.string()).optional(),
  headers: z.record(z.string()).optional()
}).optional();

const fastify = Fastify({
  logger: true
}).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

import fastifyHelmet from '@fastify/helmet';

// Middleware to check if dashboard is in readonly mode
const checkReadonly = async (request: any, reply: any) => {
  if (config.readonly) {
    reply.status(403).send({ error: 'Forbidden', message: 'Dashboard is in read-only mode' });
  }
};

// Initialize application (routes and plugins) without starting server
export const initApp = async () => {
  try {
    await fastify.register(cors, {
      origin: [config.clientUrl],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    });

    await fastify.register(fastifyHelmet, {
      crossOriginResourcePolicy: false, // Required to serve images to the frontend
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

    await mongoose.connect(config.mongoUri);
    fastify.log.info('Connected to MongoDB');

    // Ensure screenshots directory exists
    const fs = await import('fs/promises');
    const path = await import('path');
    const screenshotsDir = config.screenshotsDir;
    try {
      await fs.access(screenshotsDir);
    } catch {
      await fs.mkdir(screenshotsDir, { recursive: true });
    }

    // Serve static files
    const fastifyStatic = await import('@fastify/static');
    await fastify.register(fastifyStatic, {
      root: screenshotsDir,
      prefix: '/screenshots/',
    });

    // In production, serve the frontend React application
    if (config.nodeEnv === 'production') {
      const { fileURLToPath } = await import('url');
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
    fastify.get('/', async function handler(request, reply) {
      return { hello: 'world', service: 'pa11y-dashboard-nextgen-api', readonly: config.readonly, noindex: config.noindex };
    });

    // CRUD: Get all URLs
    fastify.get('/api/urls', {
      schema: {
        description: 'Get all monitored URLs',
        tags: ['urls'],
        response: {
          200: z.array(z.object({
            _id: z.any(),
            url: z.string(),
            name: z.string().optional(),
            schedule: z.string(),
            standard: z.string().optional(),
            status: z.string(),
            lastScanAt: z.date().optional(),
            lastIssueCount: z.number().optional(),
            lastScore: z.number().optional(),
            lastThumbnail: z.string().optional(),
            lastScreenshot: z.string().optional(),
            actions: z.array(z.object({
              type: z.string(),
              value: z.string(),
              label: z.string().optional()
            })).optional(),
            overrides: overridesSchema,
            categoryId: z.any().optional()
          }))
        }
      }
    }, async (req, reply) => {
      const urls = await UrlModel.find().sort({ createdAt: -1 });
      return urls;
    });

    // CRUD: Add URL
    fastify.post('/api/urls', {
      preHandler: checkReadonly,
      schema: {
        description: 'Add a new URL to monitor',
        tags: ['urls'],
        body: z.object({
          url: z.string().url(),
          name: z.string().optional(),
          schedule: z.string().default('0 * * * *'),
          standard: z.enum([
            'WCAG2A', 'WCAG2AA', 'WCAG2AAA',
            'WCAG21A', 'WCAG21AA', 'WCAG21AAA',
            'WCAG22A', 'WCAG22AA', 'WCAG22AAA'
          ]).default('WCAG2AA'),
          actions: z.array(z.object({
            type: z.enum(['click', 'wait', 'type', 'wait-for-url', 'screen-capture']),
            value: z.string(),
            label: z.string().optional()
          })).optional().default([]),
          overrides: overridesSchema,
          categoryId: z.string().nullable().optional()
        }),
        response: {
          200: z.object({
            _id: z.any(),
            url: z.string(),
            name: z.string().optional(),
            schedule: z.string(),
            standard: z.string(),
            status: z.string()
          }),
          403: z.object({
            error: z.string(),
            message: z.string()
          }),
          404: z.object({
            error: z.string()
          })
        }
      }
    }, async (req, reply) => {
      const { url, name, schedule, standard, actions, overrides, categoryId } = req.body;
      const newUrl = await UrlModel.create({ url, name, schedule, standard, actions, overrides, ...(categoryId ? { categoryId } : {}) });
      return newUrl;
    });

    // CRUD: Delete URL
    fastify.delete('/api/urls/:id', {
      preHandler: checkReadonly,
      schema: {
        description: 'Delete a URL',
        tags: ['urls'],
        params: z.object({
          id: z.string()
        }),
        response: {
          204: z.null(),
          403: z.object({
            error: z.string(),
            message: z.string()
          })
        }
      }
    }, async (req, reply) => {
      const { id } = req.params;
      await UrlModel.findByIdAndDelete(id);
      await ScanModel.deleteMany({ urlId: id });
      reply.status(204).send();
    });

    // CRUD: Update URL
    fastify.put('/api/urls/:id', {
      preHandler: checkReadonly,
      schema: {
        description: 'Update a URL',
        tags: ['urls'],
        params: z.object({
          id: z.string()
        }),
        body: z.object({
          name: z.string().optional(),
          schedule: z.string().optional(),
          standard: z.enum([
            'WCAG2A', 'WCAG2AA', 'WCAG2AAA',
            'WCAG21A', 'WCAG21AA', 'WCAG21AAA',
            'WCAG22A', 'WCAG22AA', 'WCAG22AAA'
          ]).optional(),
          actions: z.array(z.object({
            type: z.enum(['click', 'wait', 'type', 'wait-for-url', 'screen-capture']),
            value: z.string(),
            label: z.string().optional()
          })).optional(),
          overrides: overridesSchema,
          categoryId: z.string().nullable().optional()
        }),
        response: {
          200: z.object({
            _id: z.any(),
            url: z.string(),
            name: z.string().optional(),
            schedule: z.string(),
            standard: z.string(),
            status: z.string()
          }),
          403: z.object({
            error: z.string(),
            message: z.string()
          })
        }
      }
    }, async (req, reply) => {
      const { id } = req.params;
      const updated = await UrlModel.findByIdAndUpdate(id, req.body, { new: true });
      if (!updated) return reply.status(404).send({ error: 'Not found' });
      return updated;
    });

    // ACTION: Trigger Scan
    fastify.post('/api/urls/:id/scan', {
      preHandler: checkReadonly,
      schema: {
        description: 'Trigger an immediate scan',
        tags: ['scans'],
        params: z.object({
          id: z.string()
        }),
        response: {
          200: z.object({
            message: z.string()
          }),
          403: z.object({
            error: z.string(),
            message: z.string()
          })
        }
      }
    }, async (req, reply) => {
      const { id } = req.params;
      const { runScan } = await import('./lib/runner.js');
      await runScan(id);
      return { message: 'Scan completed' };
    });

    // READ: Get History
    fastify.get('/api/urls/:id/history', {
      schema: {
        description: 'Get scan history for a URL',
        tags: ['scans'],
        params: z.object({
          id: z.string()
        }),
        response: {
          200: z.array(z.object({
            _id: z.any(),
            timestamp: z.date(),
            issuesCount: z.number(),
            documentTitle: z.string().optional(),
            score: z.number().optional()
          }))
        }
      }
    }, async (req, reply) => {
      const { id } = req.params;
      const scans = await ScanModel.find({ urlId: id }).sort({ timestamp: -1 }).limit(20);
      return scans.map(s => ({
        _id: s._id,
        timestamp: s.timestamp,
        issuesCount: s.issues.length,
        documentTitle: s.documentTitle,
        score: s.score
      }));
    });

    // READ: Get Latest Scan Details
    fastify.get('/api/urls/:id/latest-scan', {
      schema: {
        description: 'Get details of the latest scan for a URL',
        tags: ['scans'],
        params: z.object({
          id: z.string()
        }),
        response: {
          200: z.object({
            _id: z.any(),
            timestamp: z.date(),
            issues: z.array(z.any()),
            documentTitle: z.string().optional(),
            pageUrl: z.string().optional(),
            score: z.number().optional(),
            screenshot: z.string().optional(),
            thumbnail: z.string().optional(),
            steps: z.array(z.object({
              stepName: z.string(),
              issues: z.array(z.any()),
              score: z.number().optional(),
              screenshot: z.string().optional(),
              thumbnail: z.string().optional(),
              pageUrl: z.string().optional(),
              viewport: z.object({
                width: z.number().optional(),
                height: z.number().optional()
              }).nullish()
            })).optional()
          }).nullable()
        }
      }
    }, async (req, reply) => {
      const { id } = req.params;
      const scan = await ScanModel.findOne({ urlId: id }).sort({ timestamp: -1 });
      if (!scan) return null;
      return scan;
    });

    // READ: Get a specific scan by scan ID
    fastify.get('/api/scans/:scanId', {
      schema: {
        description: 'Get a specific scan by its ID',
        tags: ['scans'],
        params: z.object({
          scanId: z.string()
        }),
        response: {
          200: z.object({
            _id: z.any(),
            urlId: z.any(),
            timestamp: z.date(),
            issues: z.array(z.any()),
            documentTitle: z.string().optional(),
            pageUrl: z.string().optional(),
            score: z.number().optional(),
            screenshot: z.string().optional(),
            thumbnail: z.string().optional(),
            steps: z.array(z.object({
              stepName: z.string(),
              issues: z.array(z.any()),
              score: z.number().optional(),
              screenshot: z.string().optional(),
              thumbnail: z.string().optional(),
              pageUrl: z.string().optional(),
              viewport: z.object({
                width: z.number().optional(),
                height: z.number().optional()
              }).nullish()
            })).optional()
          }).nullable()
        }
      }
    }, async (req, reply) => {
      const { scanId } = req.params;
      const scan = await ScanModel.findById(scanId);
      if (!scan) return null;
      return scan;
    });

    // ========================
    // CATEGORIES API
    // ========================

    // GET all categories
    fastify.get('/api/categories', {
      schema: {
        description: 'Get all categories',
        tags: ['categories'],
        response: {
          200: z.array(z.object({
            _id: z.any(),
            name: z.string(),
            description: z.string().optional(),
            icon: z.string(),
            color: z.string(),
            order: z.number()
          }))
        }
      }
    }, async (req, reply) => {
      const categories = await CategoryModel.find().sort({ order: 1, name: 1 });
      return categories;
    });

    // POST create category
    fastify.post('/api/categories', {
      schema: {
        description: 'Create a new category',
        tags: ['categories'],
        body: z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          icon: z.enum(CATEGORY_ICONS as any).optional(),
          color: z.string().optional(),
          order: z.number().optional()
        })
      }
    }, async (req, reply) => {
      const category = new CategoryModel(req.body);
      await category.save();
      return category;
    });

    // PUT update category
    fastify.put('/api/categories/:id', {
      schema: {
        description: 'Update a category',
        tags: ['categories'],
        params: z.object({ id: z.string() }),
        body: z.object({
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          icon: z.enum(CATEGORY_ICONS as any).optional(),
          color: z.string().optional(),
          order: z.number().optional()
        })
      }
    }, async (req, reply) => {
      const category = await CategoryModel.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
      );
      if (!category) return reply.status(404).send({ error: 'Category not found' });
      return category;
    });

    // DELETE category (unassigns URLs, does not delete them)
    fastify.delete('/api/categories/:id', {
      schema: {
        description: 'Delete a category and unassign its URLs',
        tags: ['categories'],
        params: z.object({ id: z.string() })
      }
    }, async (req, reply) => {
      const category = await CategoryModel.findByIdAndDelete(req.params.id);
      if (!category) return reply.status(404).send({ error: 'Category not found' });
      // Unassign URLs from this category
      await UrlModel.updateMany(
        { categoryId: new mongoose.Types.ObjectId(req.params.id) },
        { $set: { categoryId: null } }
      );
      return { success: true };
    });

    // ========================
    // SETTINGS API
    // ========================

    // GET global settings
    fastify.get('/api/settings', {
      schema: {
        description: 'Get global Pa11y settings',
        tags: ['settings'],
        response: {
          200: z.object({
            _id: z.any(),
            runners: z.array(z.string()),
            includeNotices: z.boolean(),
            includeWarnings: z.boolean(),
            viewport: z.object({
              width: z.number(),
              height: z.number(),
              isMobile: z.boolean().optional()
            }),
            timeout: z.number(),
            wait: z.number(),
            hideElements: z.string(),
            rootElement: z.string(),
            userAgent: z.string(),
            ignore: z.array(z.string()),
            headers: z.any()
          })
        }
      }
    }, async (req, reply) => {
      const settings = await getSettings();
      return settings;
    });

    // PUT update global settings
    fastify.put('/api/settings', {
      schema: {
        description: 'Update global Pa11y settings',
        tags: ['settings'],
        body: z.object({
          runners: z.array(z.enum(['axe', 'htmlcs'])).optional(),
          includeNotices: z.boolean().optional(),
          includeWarnings: z.boolean().optional(),
          viewport: z.object({
            width: z.number(),
            height: z.number(),
            isMobile: z.boolean().optional()
          }).optional(),
          timeout: z.number().optional(),
          wait: z.number().optional(),
          hideElements: z.string().optional(),
          rootElement: z.string().optional(),
          userAgent: z.string().optional(),
          ignore: z.array(z.string()).optional(),
          headers: z.record(z.string()).optional()
        }),
        response: {
          200: z.object({
            _id: z.any(),
            runners: z.array(z.string()),
            includeNotices: z.boolean(),
            includeWarnings: z.boolean(),
            viewport: z.object({
              width: z.number(),
              height: z.number(),
              isMobile: z.boolean().optional()
            }),
            timeout: z.number(),
            wait: z.number(),
            hideElements: z.string(),
            rootElement: z.string(),
            userAgent: z.string(),
            ignore: z.array(z.string()),
            headers: z.any()
          })
        }
      }
    }, async (req, reply) => {
      // Ensure settings document exists
      let settings = await SettingsModel.findOne();
      if (!settings) {
        settings = await SettingsModel.create(req.body);
      } else {
        Object.assign(settings, req.body);
        await settings.save();
      }
      return settings;
    });

    // GET environment info
    fastify.get('/api/environment', {
      schema: {
        description: 'Get environment details (Pa11y version, Node, Chromium)',
        tags: ['settings'],
        response: {
          200: z.object({
            pa11yVersion: z.string(),
            nodeVersion: z.string(),
            availableRunners: z.array(z.string()),
            availableStandards: z.array(z.string())
          })
        }
      }
    }, async (req, reply) => {
      let pa11yVersion = 'unknown';
      try {
        const pa11yPkg = await import('pa11y/package.json', { with: { type: 'json' } });
        pa11yVersion = pa11yPkg.default.version;
      } catch {
        try {
          const fs = await import('fs/promises');
          const pkg = JSON.parse(await fs.readFile('node_modules/pa11y/package.json', 'utf8'));
          pa11yVersion = pkg.version;
        } catch { /* ignore */ }
      }
      return {
        pa11yVersion,
        nodeVersion: process.version,
        availableRunners: ['axe', 'htmlcs'],
        availableStandards: [
          'WCAG2A', 'WCAG2AA', 'WCAG2AAA',
          'WCAG21A', 'WCAG21AA', 'WCAG21AAA',
          'WCAG22A', 'WCAG22AA', 'WCAG22AAA'
        ]
      };
    });

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
  try {
    await initApp();
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

export const app = fastify;

if (process.env.NODE_ENV !== 'test') {
  start();
}
