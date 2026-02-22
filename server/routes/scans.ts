import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ScanModel } from '../models/index.js';

// Middleware to check if dashboard is in readonly mode
const checkReadonly = async (request: any, reply: any) => {
    const { getConfig } = await import('../config/index.js');
    const currentConfig = getConfig();
    if (currentConfig.readonly) {
        reply.status(403).send({ error: 'Forbidden', message: 'Dashboard is in read-only mode' });
    }
};

export default async function scanRoutes(fastify: FastifyInstance) {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // ACTION: Trigger Scan
    f.post('/api/urls/:id/scan', {
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
        const { scanQueue } = await import('../lib/scheduler.js');
        scanQueue.enqueue(id, true);
        return { message: 'Scan enqueued' };
    });

    // READ: Get History
    f.get('/api/urls/:id/history', {
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
    f.get('/api/urls/:id/latest-scan', {
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
    f.get('/api/scans/:scanId', {
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
}
