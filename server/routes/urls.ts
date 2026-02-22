import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { UrlModel, ScanModel } from '../models/index.js';

// Shared Zod schema for per-URL overrides (copied from index.ts or should be moved to a shared file)
export const overridesSchema = z.object({
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
  headers: z.record(z.string(), z.string()).optional()
}).optional();

// Middleware to check if dashboard is in readonly mode
// In a real refactor, this would be in a separate plugin or decorator
const checkReadonly = async (request: any, reply: any) => {
    const { getConfig } = await import('../config/index.js');
    const currentConfig = getConfig();
    if (currentConfig.readonly) {
        reply.status(403).send({ error: 'Forbidden', message: 'Dashboard is in read-only mode' });
    }
};

export default async function urlRoutes(fastify: FastifyInstance) {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // CRUD: Get all URLs
    f.get('/api/urls', {
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
    f.post('/api/urls', {
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
        const newUrl = await UrlModel.create({
            url,
            name,
            schedule,
            standard,
            actions,
            overrides: overrides as any,
            ...(categoryId ? { categoryId } : {})
        });
        return newUrl;
    });

    // CRUD: Delete URL
    f.delete('/api/urls/:id', {
        preHandler: checkReadonly,
        schema: {
            description: 'Delete a URL',
            tags: ['urls'],
            params: z.object({
                id: z.string()
            }),
            response: {
                204: z.any(),
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
        reply.status(204).send({});
    });

    // CRUD: Update URL
    f.put('/api/urls/:id', {
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
                }),
                404: z.object({
                    error: z.string(),
                    message: z.string()
                })
            }
        }
    }, async (req, reply) => {
        const { id } = req.params;
        const updated = await UrlModel.findByIdAndUpdate(id, req.body, { new: true });
        if (!updated) return reply.status(404).send({ error: 'Not found', message: `URL with ID ${id} not found` });
        return updated;
    });
}
