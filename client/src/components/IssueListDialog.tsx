import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { getIssueDocsUrl } from '../lib/issueDocsUrl';

interface Issue {
    code: string;
    message: string;
    context: string;
    selector: string;
    type: string;
}

interface IssueListDialogProps {
    urlId: string;
    urlName: string;
    trigger?: React.ReactNode;
}

export function IssueListDialog({ urlId, urlName, trigger }: IssueListDialogProps) {
    const { data: scan, isLoading } = useQuery({
        queryKey: ['latest-scan', urlId],
        queryFn: async () => {
            const res = await api.get(`/api/urls/${urlId}/latest-scan`);
            return res.data;
        },
        enabled: !!urlId,
    });

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        Issues
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Latest Issues: {urlName}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                    {isLoading ? (
                        <div className="p-4">Loading issues...</div>
                    ) : scan && scan.issues && scan.issues.length > 0 ? (
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-4 p-1">
                                {scan.issues.map((issue: Issue, index: number) => (
                                    <div key={index} className="border rounded-lg p-4 bg-card text-card-foreground shadow-sm">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <Badge variant="outline" className="font-mono text-xs">{issue.code}</Badge>
                                            <div className="flex items-center gap-2 ml-auto">
                                                {(() => {
                                                    const docsUrl = getIssueDocsUrl(issue.code);
                                                    return docsUrl ? (
                                                        <a
                                                            href={docsUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                                            aria-label={`Learn how to fix issue ${issue.code} (opens in new tab)`}
                                                        >
                                                            How to fix
                                                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                                        </a>
                                                    ) : null;
                                                })()}
                                                <Badge variant="destructive" className="uppercase text-[10px]">{issue.type}</Badge>
                                            </div>
                                        </div>
                                        <p className="font-medium mb-2">{issue.message}</p>

                                        {issue.selector && (
                                            <div className="mb-2">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase">Selector:</span>
                                                <code className="block bg-muted p-1 rounded text-xs mt-1 break-all">{issue.selector}</code>
                                            </div>
                                        )}

                                        {issue.context && (
                                            <div>
                                                <span className="text-xs font-semibold text-muted-foreground uppercase">Context:</span>
                                                <pre className="block bg-muted p-2 rounded text-xs mt-1 overflow-x-auto">
                                                    {issue.context}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="p-4 flex flex-col items-center justify-center text-muted-foreground h-40">
                            <AlertCircle className="h-8 w-8 mb-2" />
                            <p>No issues found in the latest scan.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
