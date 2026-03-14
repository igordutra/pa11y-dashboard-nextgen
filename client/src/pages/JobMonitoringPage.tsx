import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { JobsResponse } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { PageHeading } from '../components/ui/PageHeading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Loader2, Play, Clock, ListChecks, Activity, Calendar, AlertTriangle, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * JobMonitoringPage - Provides real-time visibility into the scan queue, scheduled tasks, and recent failures.
 */
export default function JobMonitoringPage() {
    const { data, isLoading, error } = useQuery<JobsResponse>({
        queryKey: ['jobs'],
        queryFn: async () => {
            const res = await api.get('/api/jobs');
            return res.data;
        },
        refetchInterval: 5000, // Poll every 5 seconds for real-time monitoring
    });

    if (isLoading && !data) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="h-8 w-8 text-blue-600 animate-spin" />
                    <p className="text-slate-500 font-medium tracking-tight">Connecting to queue...</p>
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
                            <AlertTriangle className="h-5 w-5" />
                            <CardTitle>Connection Error</CardTitle>
                        </div>
                        <CardDescription>
                            Could not connect to the job monitoring service.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const { runningJobs = [], queue = [], scheduled = [], failures = [] } = data;
    const runningCount = runningJobs.length;
    const queueCount = queue.length;
    const scheduledCount = scheduled.length;
    const failedCount = failures.length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <PageHeading 
                title="Job Monitoring" 
                description="Monitor real-time accessibility scans, schedules, and failures."
            />

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-md shadow-slate-200/50 overflow-hidden relative">
                    <div className="absolute right-[-10px] top-[-10px] opacity-5 text-blue-600">
                        <Play size={80} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active</CardDescription>
                        <CardTitle className="text-3xl font-black text-slate-800">{runningCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Processing now</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md shadow-slate-200/50 overflow-hidden relative">
                    <div className="absolute right-[-10px] top-[-10px] opacity-5 text-orange-500">
                        <ListChecks size={80} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Queued</CardDescription>
                        <CardTitle className="text-3xl font-black text-slate-800">{queueCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Waiting in line</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md shadow-slate-200/50 overflow-hidden relative">
                    <div className="absolute right-[-10px] top-[-10px] opacity-5 text-emerald-500">
                        <Calendar size={80} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scheduled</CardDescription>
                        <CardTitle className="text-3xl font-black text-slate-800">{scheduledCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Recurring tasks</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md shadow-slate-200/50 overflow-hidden relative">
                    <div className="absolute right-[-10px] top-[-10px] opacity-5 text-rose-500">
                        <AlertTriangle size={80} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Failures</CardDescription>
                        <CardTitle className={`text-3xl font-black ${failedCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{failedCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Recent errors</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Currently Running */}
                    <Card className="border-none shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                                    <Activity className="h-4 w-4" />
                                </div>
                                <CardTitle className="text-lg font-black tracking-tight">Currently Running</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {runningJobs.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-slate-100">
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-6">Target</TableHead>
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Started</TableHead>
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pr-6 text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {runningJobs.map((job) => (
                                            <TableRow key={job.urlId} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="py-4 pl-6">
                                                    <p className="text-sm font-black text-slate-700">{job.name || 'Unnamed'}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 truncate max-w-[300px]">{job.url}</p>
                                                </TableCell>
                                                <TableCell className="text-xs font-bold text-slate-500">
                                                    {job.startedAt ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true }) : 'Just now'}
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <Badge className="bg-blue-50 text-blue-600 border-none shadow-none font-bold text-[10px] uppercase tracking-widest">
                                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Scanning
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <p className="text-sm font-medium italic">No scans are currently running.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Wait List */}
                    <Card className="border-none shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-orange-50 rounded-lg text-orange-500">
                                    <Clock className="h-4 w-4" />
                                </div>
                                <CardTitle className="text-lg font-black tracking-tight">Wait List</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {queue.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-slate-100">
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-6">Target</TableHead>
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enqueued</TableHead>
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pr-6 text-right">Priority</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {queue.map((job, idx) => (
                                            <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="py-4 pl-6">
                                                    <p className="text-sm font-black text-slate-700">{job.name || 'Unnamed'}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 truncate max-w-[300px]">{job.url}</p>
                                                </TableCell>
                                                <TableCell className="text-xs font-bold text-slate-500">
                                                    {formatDistanceToNow(new Date(job.enqueuedAt), { addSuffix: true })}
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <Badge variant="outline" className="text-slate-400 border-slate-200 font-bold text-[10px] uppercase tracking-widest">
                                                        #{idx + 1} In Queue
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <p className="text-sm font-medium italic">The queue is currently empty.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Failures */}
                    <Card className="border-none shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600">
                                    <History className="h-4 w-4" />
                                </div>
                                <CardTitle className="text-lg font-black tracking-tight">Recent Failures</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {failures.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-slate-100">
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-6">Target</TableHead>
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Failed</TableHead>
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pr-6 text-right">Error</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {failures.map((job, idx) => (
                                            <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="py-4 pl-6">
                                                    <p className="text-sm font-black text-slate-700">{job.name || 'Unnamed'}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 truncate max-w-[200px]">{job.url}</p>
                                                </TableCell>
                                                <TableCell className="text-xs font-bold text-slate-500">
                                                    {job.failedAt ? formatDistanceToNow(new Date(job.failedAt), { addSuffix: true }) : 'Just now'}
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 text-rose-600 text-xs font-bold">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        Scan Failed
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <p className="text-sm font-medium italic">No recent scan failures recorded.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {/* Scheduled Scans */}
                    <Card className="border-none shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden h-full">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                                    <Calendar className="h-4 w-4" />
                                </div>
                                <CardTitle className="text-lg font-black tracking-tight">Scheduled Scans</CardTitle>
                            </div>
                            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recurring tasks and frequency.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {scheduled.length > 0 ? (
                                <div className="space-y-4">
                                    {scheduled.map((job, idx) => (
                                        <div key={idx} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 group hover:bg-emerald-50/30 transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-sm font-black text-slate-700 truncate max-w-[150px]">{job.name || 'Unnamed'}</p>
                                                <Badge variant="outline" className="bg-white text-emerald-600 border-emerald-100 font-bold text-[9px] uppercase tracking-tighter">Active</Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                                <Clock className="h-3 w-3" />
                                                <span>{job.scheduleText}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <p className="text-sm font-medium italic">No scheduled tasks found.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] pt-4">
                <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                Real-time monitoring active (5s polling)
            </div>
        </div>
    );
}
