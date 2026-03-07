import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { JobsResponse } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-destructive">
                <p>Failed to load job status. Please try again later.</p>
            </div>
        );
    }

    const runningCount = data?.running.length || 0;
    const queueCount = data?.queue.length || 0;
    const failedCount = data?.failed.length || 0;
    const scheduledCount = data?.scheduled.length || 0;

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-primary">
                    <Activity size={24} />
                    <h1 className="text-3xl font-bold tracking-tight">Job Monitoring</h1>
                </div>
                <p className="text-muted-foreground">
                    Monitor real-time accessibility scans, schedules, and failures.
                </p>
            </header>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm overflow-hidden relative">
                    <div className="absolute right-[-10px] top-[-10px] opacity-10">
                        <Play size={80} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase tracking-wider font-semibold">Active</CardDescription>
                        <CardTitle className="text-3xl">{runningCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[10px] text-muted-foreground">Processing now</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 shadow-sm overflow-hidden relative">
                    <div className="absolute right-[-10px] top-[-10px] opacity-10">
                        <ListChecks size={80} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase tracking-wider font-semibold">Queued</CardDescription>
                        <CardTitle className="text-3xl">{queueCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[10px] text-muted-foreground">Waiting in line</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 shadow-sm overflow-hidden relative">
                    <div className="absolute right-[-10px] top-[-10px] opacity-10">
                        <Calendar size={80} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase tracking-wider font-semibold">Scheduled</CardDescription>
                        <CardTitle className="text-3xl">{scheduledCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[10px] text-muted-foreground">Recurring tasks</p>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 shadow-sm overflow-hidden relative ${failedCount > 0 ? 'border-l-destructive bg-destructive/5' : 'border-l-slate-300'}`}>
                    <div className="absolute right-[-10px] top-[-10px] opacity-10">
                        <AlertTriangle size={80} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase tracking-wider font-semibold">Failures</CardDescription>
                        <CardTitle className={`text-3xl ${failedCount > 0 ? 'text-destructive' : ''}`}>{failedCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[10px] text-muted-foreground">Recent errors</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Active & Queue */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Active Jobs */}
                    <Card className="shadow-sm border-muted/40">
                        <CardHeader className="bg-muted/30 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Play size={18} className="text-blue-500 fill-blue-500/20" />
                                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                    </span>
                                </div>
                                <CardTitle className="text-lg">Currently Running</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {runningCount === 0 ? (
                                <div className="p-8 text-center text-muted-foreground italic bg-background/50 text-sm">
                                    No scans are currently running.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent text-[11px] uppercase tracking-wider">
                                            <TableHead className="pl-6 h-10">Target Site</TableHead>
                                            <TableHead className="h-10">Started</TableHead>
                                            <TableHead className="h-10">Duration</TableHead>
                                            <TableHead className="h-10 text-right pr-6">Priority</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data?.running.map((job) => (
                                            <TableRow key={job.urlId} className="group transition-colors hover:bg-muted/30">
                                                <TableCell className="pl-6 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
                                                            {job.name || 'Unnamed URL'}
                                                        </span>
                                                        <code className="text-[10px] text-muted-foreground mt-1 truncate max-w-[250px]">
                                                            {job.url}
                                                        </code>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(job.startedAt || ''), { addSuffix: true })}
                                                </TableCell>
                                                <TableCell className="font-mono text-[11px] text-blue-600 font-bold">
                                                    {(job.durationMs! / 1000).toFixed(1)}s
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    {job.priority ? (
                                                        <Badge variant="default" className="bg-orange-500 text-white text-[10px] px-1.5 py-0">High</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Normal</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pending Queue */}
                    <Card className="shadow-sm border-muted/40">
                        <CardHeader className="bg-muted/30 pb-4">
                            <div className="flex items-center gap-2">
                                <ListChecks size={18} className="text-orange-500" />
                                <CardTitle className="text-lg">Wait List</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {queueCount === 0 ? (
                                <div className="p-8 text-center text-muted-foreground italic bg-background/50 text-sm">
                                    The queue is currently empty.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent text-[11px] uppercase tracking-wider">
                                            <TableHead className="pl-6 h-10 w-[40px]">#</TableHead>
                                            <TableHead className="h-10">Target Site</TableHead>
                                            <TableHead className="h-10">Enqueued</TableHead>
                                            <TableHead className="h-10 text-right pr-6">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data?.queue.map((job, idx) => (
                                            <TableRow key={`${job.urlId}-${idx}`} className="transition-colors hover:bg-muted/30">
                                                <TableCell className="pl-6 text-[10px] text-muted-foreground font-mono">
                                                    {idx + 1}
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm leading-tight">
                                                            {job.name || 'Unnamed URL'}
                                                        </span>
                                                        <code className="text-[10px] text-muted-foreground mt-1 truncate max-w-[250px]">
                                                            {job.url}
                                                        </code>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(job.enqueuedAt), { addSuffix: true })}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {job.priority && (
                                                            <Badge variant="default" className="bg-orange-500 text-white text-[10px] px-1.5 py-0">Priority</Badge>
                                                        )}
                                                        <div className="flex items-center gap-1.5 text-orange-500 text-[10px] font-bold uppercase">
                                                            <Loader2 size={10} className="animate-spin" />
                                                            Pending
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Failures */}
                    <Card className="shadow-sm border-muted/40">
                        <CardHeader className="bg-muted/30 pb-4">
                            <div className="flex items-center gap-2">
                                <History size={18} className="text-destructive" />
                                <CardTitle className="text-lg">Recent Failures</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {failedCount === 0 ? (
                                <div className="p-8 text-center text-muted-foreground italic bg-background/50 text-sm">
                                    No recent scan failures recorded.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent text-[11px] uppercase tracking-wider">
                                            <TableHead className="pl-6 h-10">Target Site</TableHead>
                                            <TableHead className="h-10">Failed</TableHead>
                                            <TableHead className="h-10 pr-6">Error Message</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data?.failed.map((job, idx) => (
                                            <TableRow key={`${job.urlId}-${idx}`} className="transition-colors hover:bg-destructive/5">
                                                <TableCell className="pl-6 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm leading-tight text-destructive">
                                                            {job.name || 'Unnamed URL'}
                                                        </span>
                                                        <code className="text-[10px] text-muted-foreground mt-1 truncate max-w-[200px]">
                                                            {job.url}
                                                        </code>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(job.failedAt), { addSuffix: true })}
                                                </TableCell>
                                                <TableCell className="pr-6">
                                                    <p className="text-[11px] leading-tight text-muted-foreground line-clamp-2 max-w-[300px]" title={job.error}>
                                                        {job.error}
                                                    </p>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Scheduled Tasks */}
                <div className="lg:col-span-1">
                    <Card className="shadow-sm border-muted/40 h-full">
                        <CardHeader className="bg-muted/30 pb-4 sticky top-0 z-10">
                            <div className="flex items-center gap-2">
                                <Calendar size={18} className="text-green-600" />
                                <CardTitle className="text-lg">Scheduled Scans</CardTitle>
                            </div>
                            <CardDescription>Recurring tasks and frequency.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {scheduledCount === 0 ? (
                                <div className="p-8 text-center text-muted-foreground italic text-sm">
                                    No scheduled tasks found.
                                </div>
                            ) : (
                                <div className="divide-y border-t">
                                    {data?.scheduled.map((task) => (
                                        <div key={task.urlId} className="p-4 hover:bg-muted/30 transition-colors space-y-2">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm line-clamp-1">{task.name || 'Unnamed URL'}</span>
                                                <code className="text-[10px] text-muted-foreground truncate">{task.url}</code>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 text-green-700 bg-green-50 px-2 py-0.5 rounded text-[10px] font-medium border border-green-100">
                                                    <History size={12} />
                                                    {task.frequency}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                <Clock size={12} />
                                                Next run: <span className="font-semibold">{formatDistanceToNow(new Date(task.nextRun), { addSuffix: true })}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <footer className="pt-4 border-t border-muted/40">
                <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground justify-center uppercase tracking-widest">
                    <Loader2 size={12} className="animate-spin text-primary" />
                    <span>Real-time monitoring active (5s polling)</span>
                </div>
            </footer>
        </div>
    );
}
