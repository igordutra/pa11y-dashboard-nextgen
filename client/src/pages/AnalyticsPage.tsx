import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../components/ui/card';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { 
    Activity, 
    Globe, 
    MonitorPlay, 
    AlertCircle, 
    BarChart3,
    ArrowUpRight,
    Info
} from 'lucide-react';
import { format } from 'date-fns';

interface AnalyticsData {
    globalStats: {
        averageScore: number;
        totalUrls: number;
        totalScans: number;
        totalIssues: number;
    };
    issueDistribution: {
        name: string;
        value: number;
        color: string;
    }[];
    scoreTrend: {
        date: string;
        score: number;
    }[];
    topIssues: {
        code: string;
        message: string;
        count: number;
    }[];
    categoryPerformance: {
        name: string;
        avgScore: number;
        urlCount: number;
        color: string;
    }[];
}

export function AnalyticsPage() {
    const { data, isLoading, error } = useQuery<AnalyticsData>({
        queryKey: ['analytics'],
        queryFn: async () => (await api.get('/api/analytics')).data,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="h-8 w-8 text-blue-600 animate-spin" />
                    <p className="text-slate-500 font-medium tracking-tight">Gathering insights...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Card className="max-w-md w-full border-red-100 bg-red-50/30">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                            <AlertCircle className="h-5 w-5" />
                            <CardTitle>Error Loading Analytics</CardTitle>
                        </div>
                        <CardDescription>
                            We couldn't load the analytics data. Please try refreshing the page.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const { globalStats, issueDistribution, scoreTrend, topIssues, categoryPerformance } = data;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-800">Analytics Dashboard</h1>
                <p className="text-slate-500 mt-1">High-level overview of accessibility performance across all targets.</p>
            </div>

            {/* Global Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-none shadow-md shadow-slate-200/50 overflow-hidden group">
                    <CardContent className="p-0">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-blue-50 rounded-xl text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                                    <Activity className="h-5 w-5" />
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    <ArrowUpRight className="h-3 w-3" />
                                    <span>LIVE</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avg. Accessibility Score</p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-4xl font-black text-slate-800 tracking-tighter">{globalStats.averageScore}</h2>
                                    <span className="text-xs font-bold text-slate-400">/ 100</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100">
                            <div 
                                className="h-full bg-blue-600 transition-all duration-1000 ease-out" 
                                style={{ width: `${globalStats.averageScore}%` }} 
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md shadow-slate-200/50 overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-purple-50 rounded-xl text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white">
                                <Globe className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Monitored Targets</p>
                            <h2 className="text-4xl font-black text-slate-800 tracking-tighter">{globalStats.totalUrls}</h2>
                            <p className="text-[10px] font-bold text-slate-400">ACTIVELY TRACKED</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md shadow-slate-200/50 overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-amber-50 rounded-xl text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                                <MonitorPlay className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Scans Executed</p>
                            <h2 className="text-4xl font-black text-slate-800 tracking-tighter">{globalStats.totalScans.toLocaleString()}</h2>
                            <p className="text-[10px] font-bold text-slate-400">SINCE DEPLOYMENT</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md shadow-slate-200/50 overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-rose-50 rounded-xl text-rose-600 transition-colors group-hover:bg-rose-600 group-hover:text-white">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Issues Found</p>
                            <h2 className="text-4xl font-black text-slate-800 tracking-tighter">{globalStats.totalIssues.toLocaleString()}</h2>
                            <p className="text-[10px] font-bold text-rose-500">ACROSS LATEST SCANS</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Trend - 2/3 width */}
                <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-black tracking-tight">Accessibility Trend</CardTitle>
                                <CardDescription>Overall score stability over the last 30 days.</CardDescription>
                            </div>
                            <div className="p-2 bg-slate-100 rounded-xl text-slate-400">
                                <BarChart3 className="h-5 w-5" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={scoreTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                    formatter={(value: string) => format(new Date(value), 'MMM dd')}
                                />
                                <YAxis 
                                    domain={[0, 100]} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                    labelStyle={{ fontWeight: 800, marginBottom: '4px', color: '#1e293b' }}
                                    itemStyle={{ fontWeight: 700, fontSize: '12px' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="score" 
                                    stroke="#3b82f6" 
                                    strokeWidth={4} 
                                    fillOpacity={1} 
                                    fill="url(#colorScore)" 
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Issue Distribution - 1/3 width */}
                <Card className="border-none shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden flex flex-col">
                    <CardHeader className="pb-0">
                        <CardTitle className="text-xl font-black tracking-tight">Issue Breakdown</CardTitle>
                        <CardDescription>Severity distribution across latest audits.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[300px] flex items-center justify-center pt-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={issueDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={8}
                                    dataKey="value"
                                    animationBegin={200}
                                    animationDuration={1200}
                                >
                                    {issueDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    iconType="circle"
                                    formatter={(value) => <span className="text-xs font-bold text-slate-600">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Failing Rules */}
                <Card className="border-none shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-xl font-black tracking-tight">Top Violations</CardTitle>
                            <div className="p-1 bg-slate-100 rounded-md text-slate-400 group cursor-help">
                                <Info className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <CardDescription>Most frequent accessibility rule failures detected.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topIssues.map((issue, idx) => (
                                <div key={issue.code} className="group relative">
                                    <div className="flex items-center justify-between mb-1.5 px-1">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center justify-center h-6 w-6 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black leading-none">
                                                {idx + 1}
                                            </span>
                                            <span className="text-xs font-black text-slate-700 font-mono tracking-tight group-hover:text-blue-600 transition-colors">
                                                {issue.code}
                                            </span>
                                        </div>
                                        <span className="text-xs font-black text-slate-400">{issue.count} instances</span>
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-500 leading-relaxed pl-9 mb-3 line-clamp-1 group-hover:line-clamp-none transition-all">
                                        {issue.message}
                                    </p>
                                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-slate-200 group-hover:bg-blue-400 transition-all duration-700 ease-out"
                                            style={{ 
                                                width: `${(issue.count / topIssues[0].count) * 100}%`,
                                                transitionDelay: `${idx * 100}ms`
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {topIssues.length === 0 && (
                                <div className="text-center py-10 text-slate-400 font-medium italic text-sm">
                                    No issues recorded yet.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Category Performance */}
                <Card className="border-none shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-xl font-black tracking-tight">Category Comparison</CardTitle>
                        <CardDescription>Performance breakdown by logical URL groupings.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryPerformance} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    width={80}
                                    tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar 
                                    dataKey="avgScore" 
                                    radius={[0, 8, 8, 0]} 
                                    barSize={24}
                                    animationDuration={1500}
                                >
                                    {categoryPerformance.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
