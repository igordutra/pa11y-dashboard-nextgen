import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Play, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { HistoryDialog } from './HistoryDialog';
import { EditUrlDialog } from './EditUrlDialog';
import { Url } from '../types';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from './ui/alert-dialog';

interface UrlCardProps {
    url: Url;
}

export function UrlCard({ url }: UrlCardProps) {
    const queryClient = useQueryClient();

    const scanMutation = useMutation({
        mutationFn: async () => {
            console.log('Sending scan request for:', url._id);
            return api.post(`/api/urls/${url._id}/scan`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['urls'] });
        },
        onError: (error) => {
            console.error('Scan request failed:', error);
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

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="truncate pr-4">{url.name || url.url}</CardTitle>
                    <div className="flex gap-2">
                        {(url.lastScore !== undefined) && (
                            <Badge variant={
                                url.lastScore >= 90 ? 'success' :
                                    url.lastScore >= 50 ? 'warning' : 'destructive'
                            } className="mr-2 cursor-pointer hover:opacity-80">
                                Score: {url.lastScore}
                            </Badge>
                        )}

                        {url.status === 'error' && url.lastScore === undefined ? (
                            <Link to={`/report/${url._id}`}>
                                <Badge variant="destructive" className="cursor-pointer hover:opacity-80">
                                    Error
                                </Badge>
                            </Link>
                        ) : url.lastIssueCount !== undefined && url.lastIssueCount > 0 ? (
                            <Link to={`/report/${url._id}`}>
                                <Badge variant="destructive" className="cursor-pointer hover:bg-destructive/80">
                                    {url.lastIssueCount} Issues
                                </Badge>
                            </Link>
                        ) : url.lastScore !== undefined ? (
                            <Link to={`/report/${url._id}`}>
                                <Badge variant="success" className="cursor-pointer hover:opacity-80">
                                    Pass
                                </Badge>
                            </Link>
                        ) : null}
                    </div>
                </div>
                <CardDescription className="truncate">
                    <a href={url.url} target="_blank" rel="noreferrer" className="flex items-center hover:underline">
                        {url.url} <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                {url.lastThumbnail && (
                    <div className="mb-4 rounded-md overflow-hidden border">
                        <img
                            src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${url.lastThumbnail}`}
                            alt={`Thumbnail for ${url.name || url.url}`}
                            className="w-full h-32 object-cover object-top"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                )}
                <div className="text-sm text-muted-foreground space-y-1">
                    <p>Standard: <span className="font-medium">{url.standard || 'WCAG2AA'}</span></p>
                    <p>Schedule: <span className="font-mono text-[10px]">{url.schedule}</span></p>
                    <p>Last Scan: {url.lastScanAt ? new Date(url.lastScanAt).toLocaleString() : 'Never'}</p>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center gap-2">
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => scanMutation.mutate()}
                        disabled={scanMutation.isPending}
                    >
                        {scanMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Play className="mr-2 h-4 w-4" />
                        )}
                        Scan
                    </Button>
                    <HistoryDialog urlId={url._id} urlName={url.name || url.url} />
                    <EditUrlDialog urlData={url} />
                </div>

                <div className="flex gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="z-50">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the URL "{url.name || url.url}" and all its history.
                                    This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardFooter>
        </Card>
    );
}
