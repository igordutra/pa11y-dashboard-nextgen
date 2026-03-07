import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { JobsResponse } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Loader2, Play, Clock, ListChecks, ArrowRight, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * JobMonitoringPage - Provides real-time visibility into the scan queue and active jobs.
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

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-primary">
                    <Activity size={24} />
                    <h1 className="text-3xl font-bold tracking-tight">Job Monitoring</h1>
                </div>
                <p className="text-muted-foreground">
                    Monitor real-time accessibility scans and queue status.
                </p>
            </header>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm overflow-hidden relative">
                    <div className="absolute right-[-10px] top-[-10px] opacity-10">
                        <Play size={80} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase tracking-wider font-semibold">Active Scans</CardDescription>
                        <CardTitle className="text-4xl">{runningCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Currently processing by Puppeteer</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 shadow-sm overflow-hidden relative">
                    <div className="absolute right-[-10px] top-[-10px] opacity-10">
                        <ListChecks size={80} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase tracking-wider font-semibold">Queued Tasks</CardDescription>
                        <CardTitle className="text-4xl">{queueCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Waiting for an available slot</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 shadow-sm overflow-hidden relative">
                    <div className="absolute right-[-10px] top-[-10px] opacity-10">
                        <Clock size={80} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase tracking-wider font-semibold">Concurrency</CardDescription>
                        <CardTitle className="text-4xl">3</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Maximum simultaneous scans</p>
                    </CardContent>
                </Card>
            </div>

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
                    <CardDescription>Scans currently in progress.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {runningCount === 0 ? (
                        <div className="p-8 text-center text-muted-foreground italic bg-background/50 text-sm">
                            No scans are currently running.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="pl-6 font-semibold">Target Site</TableHead>
                                    <TableHead className="font-semibold">Started</TableHead>
                                    <TableHead className="font-semibold">Duration</TableHead>
                                    <TableHead className="font-semibold text-right pr-6">Priority</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.running.map((job) => (
                                    <TableRow key={job.urlId} className="group transition-colors hover:bg-muted/30">
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm leading-tight group-hover:text-primary transition-colors">
                                                    {job.name || 'Unnamed URL'}
                                                </span>
                                                <code className="text-[10px] text-muted-foreground mt-1 truncate max-w-[300px]">
                                                    {job.url}
                                                </code>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <Clock size={14} />
                                                {formatDistanceToNow(new Date(job.startedAt || ''), { addSuffix: true })}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-blue-600 font-medium">
                                            {(job.durationMs! / 1000).toFixed(1)}s
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            {job.priority ? (
                                                <Badge variant="default" className="bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20 px-2 py-0">High</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground font-normal px-2 py-0">Normal</Badge>
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
            <Card className="shadow-sm border-muted/40 overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex items-center gap-2">
                        <ListChecks size={18} className="text-orange-500" />
                        <CardTitle className="text-lg">Wait List</CardTitle>
                    </div>
                    <CardDescription>Jobs enqueued and waiting for resources.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {queueCount === 0 ? (
                        <div className="p-8 text-center text-muted-foreground italic bg-background/50 text-sm">
                            The queue is currently empty.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="pl-6 font-semibold w-[40px]">#</TableHead>
                                    <TableHead className="font-semibold">Target Site</TableHead>
                                    <TableHead className="font-semibold">Enqueued</TableHead>
                                    <TableHead className="font-semibold text-right pr-6">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.queue.map((job, idx) => (
                                    <TableRow key={`${job.urlId}-${idx}`} className="transition-colors hover:bg-muted/30">
                                        <TableCell className="pl-6 text-xs text-muted-foreground font-mono">
                                            {idx + 1}
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm leading-tight">
                                                    {job.name || 'Unnamed URL'}
                                                </span>
                                                <code className="text-[10px] text-muted-foreground mt-1 truncate max-w-[300px]">
                                                    {job.url}
                                                </code>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <Clock size={14} />
                                                {formatDistanceToNow(new Date(job.enqueuedAt), { addSuffix: true })}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-2">
                                                {job.priority && (
                                                    <Badge variant="default" className="bg-orange-500/10 text-orange-600 border-orange-500/20 px-2 py-0">Priority</Badge>
                                                )}
                                                <div className="flex items-center gap-1.5 text-orange-500 text-xs font-semibold">
                                                    <Loader2 size={12} className="animate-spin" />
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

            <footer className="pt-4 border-t border-muted/40">
                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                    <ArrowRight size={14} />
                    <p>Page polls automatically every 5 seconds to provide live updates.</p>
                </div>
            </footer>
        </div>
    );
}
