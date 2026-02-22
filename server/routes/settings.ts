import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { SettingsModel, getSettings } from '../models/settings.js';

export default async function settingsRoutes(fastify: FastifyInstance) {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // GET global settings
    f.get('/api/settings', {
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
    f.put('/api/settings', {
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
                headers: z.record(z.string(), z.string()).optional()
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
    f.get('/api/environment', {
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
}
