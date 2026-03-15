import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { AxiosError } from 'axios';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
    Play, 
    Trash2, 
    ExternalLink, 
    Loader2, 
    MoreHorizontal, 
    Edit, 
    AlertCircle,
    Layers,
    Clock,
    CheckCircle2
} from 'lucide-react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogDescription,
    DialogFooter
} from './ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { EditUrlDialog } from './EditUrlDialog';
import { Url } from '../types';
import { useAuth } from '../lib/AuthContext';

interface UrlCardProps {
    url: Url;
}

export function UrlCard({ url }: UrlCardProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleteScansDialogOpen, setIsDeleteScansDialogOpen] = useState(false);
    const [errorDialog, setErrorDialog] = useState<{ open: boolean, message: string }>({ open: false, message: '' });

    const { data: env } = useQuery({
        queryKey: ['environment'],
        queryFn: async () => (await api.get('/api/environment')).data,
    });

    const isReadonly = env?.readonly;
    const isDemoMode = env?.demoMode;

    const scanMutation = useMutation({
        mutationFn: async () => {
            return api.post(`/api/urls/${url._id}/scan`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['urls'] });
        },
        onError: (err: AxiosError<{ message?: string }>) => {
            const message = err.response?.data?.message || 'Failed to trigger scan';
            setErrorDialog({ open: true, message });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            return api.delete(`/api/urls/${url._id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['urls'] });
        }
    });

    const deleteScansMutation = useMutation({
        mutationFn: async () => {
            return api.delete(`/api/urls/${url._id}/scans`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['urls'] });
        }
    });

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600 stroke-green-600';
        if (score >= 50) return 'text-amber-500 stroke-amber-500';
        return 'text-red-600 stroke-red-600';
    };

    const getScoreBg = (score: number) => {
        if (score >= 90) return 'bg-green-50';
        if (score >= 50) return 'bg-amber-50';
        return 'bg-red-50';
    };

    const score = url.lastScore ?? 0;
    const hasScore = url.lastScore !== undefined;

    return (
        <div className="h-full">
            <Card className="flex flex-col border-none bg-slate-50/50 rounded-2xl shadow-none hover:shadow-md transition-all duration-300 group overflow-hidden h-full">
                <CardContent className="p-0 flex flex-col h-full">
                    {/* Header Section with Score and Info */}
                    <div className="p-5 pb-0 flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-lg text-slate-800 truncate" title={url.name || url.url}>
                                    {url.name || url.url}
                                </h3>
                                {url.status === 'scanning' && (
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                )}
                                {url.status === 'error' && (
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                )}
                            </div>
                            <a 
                                href={url.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-sm text-slate-600 flex items-center hover:text-blue-700 transition-colors truncate mb-3"
                                aria-label={`Visit ${url.url} (opens in new tab)`}
                            >
                                {url.url.replace(/^https?:\/\//, '')} <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" aria-hidden="true" />
                            </a>

                            <div className="flex flex-wrap gap-2 mb-4">
                                <Badge variant="outline" className="bg-white/50 border-slate-200 text-slate-700 font-medium py-0.5">
                                    {url.standard || 'WCAG2AA'}
                                </Badge>
                                {url.actions && url.actions.length > 0 && (
                                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-medium py-0.5">
                                        <Layers className="h-3 w-3 mr-1" />
                                        {url.actions.length} {url.actions.length === 1 ? 'Step' : 'Steps'}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Circular Score Indicator */}
                        <Link 
                            to={`/report/${url._id}`} 
                            className="flex-shrink-0 relative group/score"
                            aria-label={`View detailed accessibility report for ${url.name || url.url}. Current score: ${hasScore ? score : 'not scanned'}`}
                        >
                            <div className={`h-16 w-16 rounded-full flex items-center justify-center ${hasScore ? getScoreBg(score) : 'bg-slate-100'} transition-transform group-hover/score:scale-105`}>
                                <svg className="h-16 w-16 -rotate-90 transform">
                                    <circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        className="text-slate-200"
                                    />
                                    {hasScore && (
                                        <circle
                                            cx="32"
                                            cy="32"
                                            r="28"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            strokeDasharray={175.9}
                                            strokeDashoffset={175.9 * (1 - score / 100)}
                                            strokeLinecap="round"
                                            className={`${getScoreColor(score)} transition-all duration-1000 ease-out`}
                                        />
                                    )}
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-lg font-bold ${hasScore ? getScoreColor(score).split(' ')[0] : 'text-slate-400'}`}>
                                        {hasScore ? score : '--'}
                                    </span>
                                    <span className="text-[8px] uppercase font-bold text-slate-400 -mt-1">Score</span>
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* Thumbnail Section */}
                    <div className="px-5 mb-4">
                        <Link 
                            to={`/report/${url._id}`}
                            className="block relative aspect-video rounded-xl overflow-hidden bg-slate-200 border border-slate-200/50 group-hover:border-slate-300 transition-all hover:ring-2 hover:ring-blue-600/20"
                            aria-label={`View detailed report for ${url.name || url.url}`}
                        >
                            {url.lastThumbnail ? (
                                <img
                                    src={`${import.meta.env.VITE_API_URL || ''}${url.lastThumbnail}?t=${new Date(url.lastScanAt || '').getTime()}`}
                                    alt={`Screenshot of ${url.name || url.url}`}
                                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                    <ExternalLink className="h-8 w-8 mb-2 opacity-20" aria-hidden="true" />
                                    <span className="text-xs font-medium opacity-50">No screenshot yet</span>
                                </div>
                            )}
                            
                            {/* Status Overlay */}
                            {url.status === 'scanning' && (
                                <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-[1px] flex items-center justify-center">
                                    <div className="bg-white/90 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                        <span className="text-xs font-bold text-blue-700">Scanning...</span>
                                    </div>
                                </div>
                            )}
                            {url.status === 'error' && (
                                <div className="absolute inset-0 bg-red-600/5 flex items-end p-2">
                                    <div className="bg-red-600 text-white px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 shadow-sm">
                                        <AlertCircle className="h-3 w-3" />
                                        Scan Failed
                                    </div>
                                </div>
                            )}
                        </Link>
                    </div>

                    {/* Info Footer */}
                    <div className="px-5 pb-5 flex-1 flex flex-col justify-end">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-4">
                            <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" aria-hidden="true" />
                                <span>Last scan: {url.lastScanAt ? formatDistanceToNow(new Date(url.lastScanAt), { addSuffix: true }) : 'Never'}</span>
                            </div>
                            {url.lastIssueCount !== undefined && (
                                <div className="flex items-center gap-1">
                                    {url.lastIssueCount === 0 ? (
                                        <>
                                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                                            <span className="text-green-600">No issues</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="h-3 w-3 text-red-500" />
                                            <span className="text-red-600">{url.lastIssueCount} {url.lastIssueCount === 1 ? 'Issue' : 'Issues'}</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {(user?.role === 'admin' || user?.role === 'editor') && (
                                <>
                                    <Button
                                        className="flex-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm rounded-xl font-bold transition-all active:scale-[0.95]"
                                        variant="outline"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            scanMutation.mutate();
                                        }}
                                        disabled={scanMutation.isPending || url.status === 'scanning' || (isReadonly && !isDemoMode)}
                                    >
                                        {scanMutation.isPending || url.status === 'scanning' ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Play className="mr-2 h-4 w-4 fill-current" />
                                        )}
                                        {url.status === 'scanning' ? 'Scanning' : 'Run Scan'}
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button 
                                                variant="outline" 
                                                className="w-10 px-0 bg-white hover:bg-slate-100 border border-slate-200 shadow-sm rounded-xl text-slate-600"
                                                aria-label="More actions"
                                            >
                                                <MoreHorizontal className="h-5 w-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 p-1 rounded-xl border-slate-200 shadow-xl">
                                            <DropdownMenuItem 
                                                onClick={() => setIsEditDialogOpen(true)}
                                                disabled={isReadonly}
                                                className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Edit className="h-4 w-4" />
                                                <span className="font-medium">Edit Details</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                                onClick={() => setIsDeleteScansDialogOpen(true)}
                                                disabled={isReadonly}
                                                className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer text-amber-600 hover:text-amber-700 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="font-medium">Clear History</span>
                                            </DropdownMenuItem>
                                            <div className="h-px bg-slate-100 my-1 mx-1" />
                                            <DropdownMenuItem 
                                                onClick={() => setIsDeleteDialogOpen(true)}
                                                disabled={isReadonly}
                                                className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="font-medium">Delete URL</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Error Dialog */}
            <Dialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog(prev => ({ ...prev, open }))}>
                <DialogContent className="rounded-3xl border-none shadow-2xl max-w-sm">
                    <DialogHeader className="flex flex-col items-center text-center pt-4">
                        <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="h-8 w-8 text-rose-500" />
                        </div>
                        <DialogTitle className="text-xl font-black tracking-tight text-slate-800">Unable to Start Scan</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium px-4">
                            {errorDialog.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center pb-4 pt-2">
                        <Button 
                            onClick={() => setErrorDialog({ open: false, message: '' })}
                            className="rounded-xl font-bold bg-slate-800 hover:bg-slate-900 px-8"
                        >
                            Understood
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <EditUrlDialog 
                urlData={url} 
                open={isEditDialogOpen} 
                onOpenChange={setIsEditDialogOpen} 
                showTrigger={false}
            />

            {/* Delete URL Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black tracking-tight text-slate-800">Delete monitored target?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 font-medium">
                            This will permanently remove <span className="font-bold text-slate-700">{url.name || url.url}</span> and all its scan history. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl font-bold border-slate-200">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => deleteMutation.mutate()}
                            className="rounded-xl font-bold bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200"
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete Target'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Clear History Dialog */}
            <AlertDialog open={isDeleteScansDialogOpen} onOpenChange={setIsDeleteScansDialogOpen}>
                <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black tracking-tight text-slate-800">Clear scan history?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 font-medium">
                            This will remove all previous accessibility reports for <span className="font-bold text-slate-700">{url.name || url.url}</span>. The URL itself will remain in your dashboard.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl font-bold border-slate-200">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => deleteScansMutation.mutate()}
                            className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200"
                        >
                            {deleteScansMutation.isPending ? 'Clearing...' : 'Yes, Clear History'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
