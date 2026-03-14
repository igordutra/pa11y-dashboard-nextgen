import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { UrlModel, ScanModel, CategoryModel } from '../models/index.js';

export default async function analyticsRoutes(fastify: FastifyInstance) {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    f.get('/api/analytics', {
        schema: {
            description: 'Get aggregated accessibility analytics',
            summary: 'Get analytics',
            tags: ['analytics'],
            response: {
                200: z.object({
                    globalStats: z.object({
                        averageScore: z.number(),
                        totalUrls: z.number(),
                        totalScans: z.number(),
                        totalIssues: z.number()
                    }),
                    issueDistribution: z.array(z.object({
                        name: z.string(),
                        value: z.number(),
                        color: z.string()
                    })),
                    scoreTrend: z.array(z.object({
                        date: z.string(),
                        score: z.number()
                    })),
                    topIssues: z.array(z.object({
                        code: z.string(),
                        message: z.string(),
                        count: z.number()
                    })),
                    categoryPerformance: z.array(z.object({
                        name: z.string(),
                        avgScore: z.number(),
                        urlCount: z.number(),
                        color: z.string()
                    }))
                })
            }
        }
    }, async (_req, _reply) => {
        // 1. Basic Counts
        const totalUrls = await UrlModel.countDocuments();
        const totalScans = await ScanModel.countDocuments();

        // 2. Latest Scans for Global Stats and Breakdowns
        // We get the most recent scan for each URL
        const latestScans = await ScanModel.aggregate([
            { $sort: { urlId: 1, timestamp: -1 } },
            {
                $group: {
                    _id: '$urlId',
                    latestScan: { $first: '$$ROOT' }
                }
            }
        ]);

        const validLatestScans = latestScans.map(s => s.latestScan).filter(s => s.score !== undefined);
        
        const averageScore = validLatestScans.length > 0 
            ? validLatestScans.reduce((acc, s) => acc + (s.score || 0), 0) / validLatestScans.length 
            : 0;

        let totalIssues = 0;
        const issueCounts = { error: 0, warning: 0, notice: 0 };
        const ruleFrequencies: Record<string, { count: number, message: string }> = {};

        for (const scan of validLatestScans) {
            const issues = scan.issues || [];
            totalIssues += issues.length;
            
            for (const issue of issues) {
                // Type breakdown
                const type = (issue.type || 'error').toLowerCase();
                if (type in issueCounts) {
                    issueCounts[type as keyof typeof issueCounts]++;
                }

                // Rule breakdown
                const code = issue.code;
                if (code) {
                    if (!ruleFrequencies[code]) {
                        ruleFrequencies[code] = { count: 0, message: issue.message || code };
                    }
                    ruleFrequencies[code].count++;
                }
            }
        }

        const issueDistribution = [
            { name: 'Errors', value: issueCounts.error, color: '#ef4444' },
            { name: 'Warnings', value: issueCounts.warning, color: '#f59e0b' },
            { name: 'Notices', value: issueCounts.notice, color: '#3b82f6' }
        ].filter(d => d.value > 0);

        const topIssues = Object.entries(ruleFrequencies)
            .map(([code, data]) => ({ code, message: data.message, count: data.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // 3. Score Trend (Daily Average for last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyTrend = await ScanModel.aggregate([
            { $match: { timestamp: { $gte: thirtyDaysAgo }, score: { $exists: true } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                    avgScore: { $avg: '$score' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const scoreTrend = dailyTrend.map(d => ({
            date: d._id,
            score: Math.round(d.avgScore * 10) / 10
        }));

        // 4. Category Performance
        const categories = await CategoryModel.find().lean();
        const categoryPerformance = [];

        for (const cat of categories) {
            const urlsInCategory = await UrlModel.find({ categoryId: cat._id }).select('_id');
            const urlIds = urlsInCategory.map(u => u._id);
            
            // Average of the latest scores for URLs in this category
            const catLatestScans = validLatestScans.filter(s => 
                urlIds.some(id => id.toString() === s.urlId.toString())
            );

            const catAvgScore = catLatestScans.length > 0
                ? catLatestScans.reduce((acc, s) => acc + (s.score || 0), 0) / catLatestScans.length
                : 0;

            categoryPerformance.push({
                name: cat.name,
                avgScore: Math.round(catAvgScore * 10) / 10,
                urlCount: urlIds.length,
                color: cat.color || '#6366f1'
            });
        }

        // Add "Uncategorized" if there are URLs without a category
        const uncategorizedUrls = await UrlModel.find({ categoryId: null }).select('_id');
        if (uncategorizedUrls.length > 0) {
            const urlIds = uncategorizedUrls.map(u => u._id);
            const uncatLatestScans = validLatestScans.filter(s => 
                urlIds.some(id => id.toString() === s.urlId.toString())
            );

            const uncatAvgScore = uncatLatestScans.length > 0
                ? uncatLatestScans.reduce((acc, s) => acc + (s.score || 0), 0) / uncatLatestScans.length
                : 0;

            categoryPerformance.push({
                name: 'Uncategorized',
                avgScore: Math.round(uncatAvgScore * 10) / 10,
                urlCount: urlIds.length,
                color: '#94a3b8'
            });
        }

        return {
            globalStats: {
                averageScore: Math.round(averageScore * 10) / 10,
                totalUrls,
                totalScans,
                totalIssues
            },
            issueDistribution,
            scoreTrend,
            topIssues,
            categoryPerformance
        };
    });
}
