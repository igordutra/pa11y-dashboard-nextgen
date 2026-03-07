import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { UrlModel, ScanModel } from '../models/index.js';
import { overridesSchema } from '../types/schemas.js';

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
            summary: 'List all URLs',
            tags: ['urls'],
            response: {
                200: z.array(z.object({
                    _id: z.preprocess((val: any) => val?.toString(), z.string()).describe('Unique identifier for the URL'),
                    url: z.string().describe('The destination URL being monitored'),
                    name: z.string().optional().describe('Human-readable name for the URL'),
                    schedule: z.string().describe('Cron-style schedule string (empty for manual)'),
                    standard: z.string().optional().describe('Accessibility standard (e.g., WCAG22AA)'),
                    status: z.enum(['active', 'error', 'paused', 'scanning']).describe('Current status of the URL monitoring'),
                    lastScanAt: z.date().optional().describe('Timestamp of the most recent completed scan'),
                    lastIssueCount: z.number().optional().describe('Number of accessibility issues found in the last scan'),
                    lastScore: z.number().optional().describe('Overall accessibility score from the last scan (0-100)'),
                    lastThumbnail: z.string().optional().describe('Relative path to the last scan thumbnail'),
                    lastScreenshot: z.string().optional().describe('Relative path to the last scan full screenshot'),
                    actions: z.array(z.object({
                        type: z.enum(['click', 'wait', 'type', 'wait-for-url', 'screen-capture']),
                        value: z.string().describe('Target selector or parameter value for the action'),
                        label: z.string().optional().describe('Optional name/label for the action step')
                    })).optional().describe('List of multi-step interactive actions to perform before scanning'),
                    overrides: overridesSchema,
                    categoryId: z.preprocess((val: any) => val?.toString(), z.string()).optional().describe('Optional ID of the assigned category'),
                    createdAt: z.date().optional(),
                    updatedAt: z.date().optional()
                }))
            }
        }
    }, async (_req, _reply) => {
        const urls = await UrlModel.find().sort({ createdAt: -1 });
        return urls;
    });

    // CRUD: Add URL
    f.post('/api/urls', {
        preHandler: checkReadonly,
        schema: {
            description: 'Add a new URL to monitor and trigger an initial scan',
            summary: 'Add new URL',
            tags: ['urls'],
            body: z.object({
                url: z.string().url().describe('Full URL (including http/https) to monitor'),
                name: z.string().optional().describe('Optional friendly name'),
                schedule: z.string().default('').describe('Cron expression for scheduled scans'),
                standard: z.enum([
                    'WCAG2A', 'WCAG2AA', 'WCAG2AAA',
                    'WCAG21A', 'WCAG21AA', 'WCAG21AAA',
                    'WCAG22A', 'WCAG22AA', 'WCAG22AAA'
                ]).default('WCAG22AA').describe('Target accessibility standard'),
                actions: z.array(z.object({
                    type: z.enum(['click', 'wait', 'type', 'wait-for-url', 'screen-capture']),
                    value: z.string().describe('Target selector or value'),
                    label: z.string().optional()
                })).optional().default([]).describe('Interactive script steps'),
                overrides: overridesSchema,
                categoryId: z.string().nullable().optional().describe('ID of the category to assign')
            }),
            response: {
                200: z.object({
                    _id: z.preprocess((val: any) => val?.toString(), z.string()),
                    url: z.string(),
                    name: z.string().optional(),
                    schedule: z.string(),
                    standard: z.string(),
                    status: z.string()
                }),
                400: z.object({
                    error: z.string(),
                    message: z.string(),
                    statusCode: z.number()
                }).describe('Validation error'),
                403: z.object({
                    error: z.string(),
                    message: z.string()
                }).describe('Read-only mode restriction'),
                404: z.object({
                    error: z.string()
                })
            }
        }
    }, async (req, _reply) => {
        const { url, name, schedule, standard, actions, overrides, categoryId } = req.body;
        const newUrl = await UrlModel.create({
            url,
            name,
            schedule,
            standard,
            actions,
            overrides: overrides as any,
            status: 'scanning',
            ...(categoryId ? { categoryId } : {})
        });

        // Trigger initial scan straight away
        const { scanQueue } = await import('../lib/scheduler.js');
        scanQueue.enqueue(newUrl._id.toString(), true);

        return newUrl;
    });

    // CRUD: Delete URL
    f.delete('/api/urls/:id', {
        preHandler: checkReadonly,
        schema: {
            description: 'Permanently remove a URL and all its scan history',
            summary: 'Delete URL',
            tags: ['urls'],
            params: z.object({
                id: z.string().describe('The URL ID to delete')
            }),
            response: {
                204: z.null().describe('Successfully deleted'),
                403: z.object({
                    error: z.string(),
                    message: z.string()
                }).describe('Read-only mode restriction')
            }
        }
    }, async (req, reply) => {
        const { id } = req.params;
        await UrlModel.findByIdAndDelete(id);
        await ScanModel.deleteMany({ urlId: id });
        reply.status(204).send(null);
    });

    // CRUD: Update URL
    f.put('/api/urls/:id', {
        preHandler: checkReadonly,
        schema: {
            description: 'Update settings or schedule for an existing URL',
            summary: 'Update URL',
            tags: ['urls'],
            params: z.object({
                id: z.string().describe('The URL ID to update')
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
                    _id: z.preprocess((val: any) => val?.toString(), z.string()),
                    url: z.string(),
                    name: z.string().optional(),
                    schedule: z.string(),
                    standard: z.string(),
                    status: z.string()
                }),
                403: z.object({
                    error: z.string(),
                    message: z.string()
                }).describe('Read-only mode restriction'),
                404: z.object({
                    error: z.string(),
                    message: z.string()
                }).describe('URL not found')
            }
        }
    }, async (req, reply) => {
        const { id } = req.params;
        const updated = await UrlModel.findByIdAndUpdate(id, req.body, { new: true });
        if (!updated) return reply.status(404).send({ error: 'Not found', message: `URL with ID ${id} not found` });
        return updated;
    });
}
