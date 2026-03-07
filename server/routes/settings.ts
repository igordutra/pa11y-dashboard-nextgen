import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { SettingsModel, getSettings } from '../models/settings.js';
import { settingsSchema } from '../types/schemas.js';

export default async function settingsRoutes(fastify: FastifyInstance) {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // GET global settings
    f.get('/api/settings', {
        schema: {
            description: 'Retrieve global Pa11y/Lighthouse configuration used as defaults for all scans',
            summary: 'Get settings',
            tags: ['settings'],
            response: {
                200: z.object({
                    _id: z.preprocess((val: any) => val?.toString(), z.string()),
                    runners: z.array(z.string()).describe('Default accessibility runners (axe, htmlcs)'),
                    includeNotices: z.boolean().describe('Include Pa11y notices in results'),
                    includeWarnings: z.boolean().describe('Include Pa11y warnings in results'),
                    viewport: z.object({
                        width: z.number().describe('Default viewport width'),
                        height: z.number().describe('Default viewport height'),
                        isMobile: z.boolean().optional().describe('Simulate mobile device')
                    }),
                    timeout: z.number().describe('Maximum time (ms) allowed for each scan step'),
                    wait: z.number().describe('Fixed delay (ms) before starting each step'),
                    hideElements: z.string().describe('CSS selectors for elements to hide during scan'),
                    rootElement: z.string().describe('Restrict scan to this CSS selector'),
                    userAgent: z.string().describe('Custom User-Agent header string'),
                    ignore: z.array(z.string()).describe('Accessibility rules/codes to ignore'),
                    headers: z.record(z.string(), z.string()).optional().describe('Key-value pairs for custom HTTP headers')
                })
            }
        }
    }, async (_req, _reply) => {
        const settings = await getSettings();
        return {
            ...settings.toObject(),
            headers: Object.fromEntries(settings.headers || new Map())
        };
    });

    // PUT update global settings
    f.put('/api/settings', {
        schema: {
            description: 'Modify global configuration parameters. Changes apply to all future scans.',
            summary: 'Update settings',
            tags: ['settings'],
            body: settingsSchema,
            response: {
                200: z.object({
                    _id: z.preprocess((val: any) => val?.toString(), z.string()),
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
                    headers: z.record(z.string(), z.string()).optional()
                })
            }
        }
    }, async (req, _reply) => {
        // Ensure settings document exists
        let settings = await SettingsModel.findOne();
        if (!settings) {
            settings = await SettingsModel.create(req.body);
        } else {
            Object.assign(settings, req.body);
            await settings.save();
        }
        return {
            ...settings.toObject(),
            headers: Object.fromEntries(settings.headers || new Map())
        };
    });

    // GET environment info
    f.get('/api/environment', {
        schema: {
            description: 'Retrieve technical details about the server environment, versions, and supported standards',
            summary: 'Get environment',
            tags: ['settings'],
            response: {
                200: z.object({
                    pa11yVersion: z.string().describe('Installed version of pa11y'),
                    nodeVersion: z.string().describe('Node.js runtime version'),
                    availableRunners: z.array(z.string()).describe('List of supported audit engines'),
                    availableStandards: z.array(z.string()).describe('List of supported WCAG versions')
                })
            }
        }
    }, async (_req, _reply) => {
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
