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

    // READ: Get all current jobs (running and queued)
    f.get('/api/jobs', {
        schema: {
            description: 'Get all currently running and queued scan jobs',
            summary: 'List jobs',
            tags: ['scans'],
            response: {
                200: z.object({
                    running: z.array(z.object({
                        urlId: z.string(),
                        url: z.string().optional(),
                        name: z.string().optional(),
                        enqueuedAt: z.date(),
                        startedAt: z.date(),
                        priority: z.boolean(),
                        status: z.string(),
                        durationMs: z.number()
                    })),
                    queue: z.array(z.object({
                        urlId: z.string(),
                        url: z.string().optional(),
                        name: z.string().optional(),
                        enqueuedAt: z.date(),
                        priority: z.boolean(),
                        status: z.string()
                    }))
                })
            }
        }
    }, async (_req, _reply) => {
        const { scanQueue } = await import('../lib/scheduler.js');
        const { UrlModel } = await import('../models/index.js');
        const jobs = scanQueue.getJobs();

        // Hydrate with URL details
        const urlIds = [...jobs.running.map(j => j.urlId), ...jobs.queue.map(j => j.urlId)];
        const urls = await UrlModel.find({ _id: { $in: urlIds } }, 'url name');
        const urlMap = new Map(urls.map(u => [u._id.toString(), u]));

        return {
            running: jobs.running.map(j => ({
                ...j,
                url: urlMap.get(j.urlId)?.url,
                name: urlMap.get(j.urlId)?.name
            })),
            queue: jobs.queue.map(j => ({
                ...j,
                url: urlMap.get(j.urlId)?.url,
                name: urlMap.get(j.urlId)?.name
            }))
        };
    });

    // ACTION: Trigger Scan
    f.post('/api/urls/:id/scan', {
        preHandler: checkReadonly,
        schema: {
            description: 'Manually trigger an immediate accessibility scan for a specific URL',
            summary: 'Trigger scan',
            tags: ['scans'],
            params: z.object({
                id: z.string().describe('The URL ID to scan')
            }),
            response: {
                200: z.object({
                    message: z.string().describe('Success message')
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
    }, async (req, _reply) => {
        const { id } = req.params;
        const { scanQueue } = await import('../lib/scheduler.js');
        scanQueue.enqueue(id, true);
        return { message: 'Scan enqueued' };
    });

    // ACTION: Delete All Scans for a URL
    f.delete('/api/urls/:id/scans', {
        preHandler: checkReadonly,
        schema: {
            description: 'Clear all scan history and reset last result metrics for a URL',
            summary: 'Clear history',
            tags: ['scans'],
            params: z.object({
                id: z.string().describe('The URL ID to clear')
            }),
            response: {
                204: z.null().describe('Successfully cleared'),
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
        const { UrlModel } = await import('../models/index.js');
        
        await ScanModel.deleteMany({ urlId: id });
        await UrlModel.findByIdAndUpdate(id, {
            $unset: {
                lastScanAt: 1,
                lastIssueCount: 1,
                lastScore: 1,
                lastThumbnail: 1,
                lastScreenshot: 1
            }
        });
        
        reply.status(204).send(null);
    });

    // READ: Get History
    f.get('/api/urls/:id/history', {
        schema: {
            description: 'Retrieve a chronological list of recent scans for a specific URL',
            summary: 'Get history',
            tags: ['scans'],
            params: z.object({
                id: z.string().describe('The URL ID to fetch history for')
            }),
            response: {
                200: z.array(z.object({
                    _id: z.preprocess((val: any) => val?.toString(), z.string()).describe('Scan ID'),
                    timestamp: z.date().describe('When the scan was performed'),
                    issuesCount: z.number().describe('Total number of issues found across all steps'),
                    documentTitle: z.string().optional().describe('HTML document title captured during scan'),
                    score: z.number().optional().describe('Accessibility score (0-100)'),
                    stepsCount: z.number().optional().describe('Number of interactive steps in this scan')
                }))
            }
        }
    }, async (req, _reply) => {
        const { id } = req.params;
        const scans = await ScanModel.find({ urlId: id }).sort({ timestamp: -1 }).limit(20);
        return scans.map(s => {
            const totalIssues = (s.steps && s.steps.length > 0)
                ? s.steps.reduce((sum, step) => sum + (step.issues?.length || 0), 0)
                : (s.issues?.length || 0);
                
            return {
                _id: s._id,
                timestamp: s.timestamp,
                issuesCount: totalIssues,
                documentTitle: s.documentTitle,
                score: s.score,
                stepsCount: s.steps?.length || 0
            };
        });
    });

    // Shared schema for scan steps
    const scanStepSchema = z.object({
        stepName: z.string().describe('Label for this interaction step'),
        issues: z.array(z.unknown()).describe('List of Pa11y/Lighthouse issues found'),
        score: z.number().optional().describe('Accessibility score for this step'),
        screenshot: z.string().optional().describe('Full screenshot path'),
        thumbnail: z.string().optional().describe('Thumbnail path'),
        pageUrl: z.string().optional().describe('URL at the time of the step'),
        viewport: z.object({
            width: z.number().optional(),
            height: z.number().optional()
        }).nullish().describe('Viewport dimensions used')
    });

    // READ: Get Latest Scan Details
    f.get('/api/urls/:id/latest-scan', {
        schema: {
            description: 'Retrieve the most recent scan result for a URL, including all issues and steps',
            summary: 'Get latest scan',
            tags: ['scans'],
            params: z.object({
                id: z.string().describe('The URL ID')
            }),
            response: {
                200: z.object({
                    _id: z.preprocess((val: any) => val?.toString(), z.string()),
                    timestamp: z.date(),
                    issues: z.array(z.unknown()),
                    documentTitle: z.string().optional(),
                    pageUrl: z.string().optional(),
                    score: z.number().optional(),
                    screenshot: z.string().optional(),
                    thumbnail: z.string().optional(),
                    steps: z.array(scanStepSchema).optional()
                }).nullable()
            }
        }
    }, async (req, _reply) => {
        const { id } = req.params;
        const scan = await ScanModel.findOne({ urlId: id }).sort({ timestamp: -1 });
        if (!scan) return null;
        return scan;
    });

    // READ: Get a specific scan by scan ID
    f.get('/api/scans/:scanId', {
        schema: {
            description: 'Retrieve detailed results for a specific scan by its unique identifier',
            summary: 'Get scan details',
            tags: ['scans'],
            params: z.object({
                scanId: z.string().describe('The unique scan ID')
            }),
            response: {
                200: z.object({
                    _id: z.preprocess((val: any) => val?.toString(), z.string()),
                    urlId: z.preprocess((val: any) => val?.toString(), z.string()).describe('The parent URL ID'),
                    timestamp: z.date(),
                    issues: z.array(z.unknown()).describe('Primary issues list (legacy/last step)'),
                    documentTitle: z.string().optional(),
                    pageUrl: z.string().optional(),
                    score: z.number().optional(),
                    screenshot: z.string().optional(),
                    thumbnail: z.string().optional(),
                    runners: z.array(z.string()).optional().describe('Runners used (e.g., axe, htmlcs)'),
                    standard: z.string().optional().describe('Standard used (e.g., WCAG2AA)'),
                    browserVersion: z.string().optional().describe('Puppeteer browser version'),
                    steps: z.array(scanStepSchema).optional()
                }).nullable()
            }
        }
    }, async (req, _reply) => {
        const { scanId } = req.params;
        const scan = await ScanModel.findById(scanId);
        if (!scan) return null;
        return scan;
    });

    // ACTION: Export Scan as PDF
    f.get('/api/scans/:scanId/pdf', {
        schema: {
            description: 'Generate and download a comprehensive PDF accessibility report for a specific scan',
            summary: 'Export PDF',
            tags: ['scans'],
            params: z.object({
                scanId: z.string().describe('The scan ID to export')
            }),
            response: {
                200: z.unknown().describe('PDF binary data'),
                404: z.object({
                    error: z.string(),
                    message: z.string()
                }).describe('Scan not found'),
                500: z.object({
                    error: z.string(),
                    message: z.string()
                }).describe('PDF generation error')
            }
        }
    }, async (req, reply) => {
        const { scanId } = req.params;
        const scan = await ScanModel.findById(scanId);
        if (!scan) return reply.status(404).send({ error: 'Not found', message: 'Scan not found' });

        const { UrlModel } = await import('../models/index.js');
        const url = await UrlModel.findById(scan.urlId);
        if (!url) return reply.status(404).send({ error: 'Not found', message: 'URL not found' });

        const { generateHtmlReport } = await import('../lib/reportGenerator.js');
        const html = generateHtmlReport(url, scan);

        const puppeteer = (await import('puppeteer')).default;
        let browser;
        try {
            const launchOptions: any = {
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--headless=new']
            };
            if (process.env.PUPPETEER_EXECUTABLE_PATH) {
                launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            }
            browser = await puppeteer.launch(launchOptions);
            const page = await browser.newPage();
            
            // Wait for all assets (images) to load
            await page.setContent(html, { waitUntil: 'networkidle0' });
            
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
            });

            const filename = `accessibility-report-${url.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'site'}-${new Date(scan.timestamp).toISOString().split('T')[0]}.pdf`;

            reply
                .header('Content-Type', 'application/pdf')
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .send(pdfBuffer);

        } catch (err) {
            req.log.error(err);
            return reply.status(500).send({ error: 'PDF Generation Failed', message: (err as Error).message });
        } finally {
            if (browser) await browser.close();
        }
    });
}
