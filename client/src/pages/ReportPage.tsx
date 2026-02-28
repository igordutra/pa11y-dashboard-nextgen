import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, RefreshCw, AlertTriangle, AlertCircle, Info, Loader2, ExternalLink } from 'lucide-react';
import { ScrollArea } from '../components/ui/scroll-area';
import { TrendChart } from '../components/TrendChart';
import { getIssueDocsUrl } from '../lib/issueDocsUrl';
import { ScreenshotOverlay } from '../components/ScreenshotOverlay';
import { ExportReportModal } from '../components/ExportReportModal';
import { Issue, Scan, ScanStep, Url } from '../types';

export function ReportPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedStepIndex, setSelectedStepIndex] = useState(0);
    const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<'all' | 'error' | 'warning' | 'notice'>('all');

    const { data: urlData, isLoading: isUrlLoading } = useQuery({
        queryKey: ['url', id],
        queryFn: async () => (await api.get(`/api/urls`)).data.find((u: Url) => u._id === id),
        enabled: !!id,
        refetchInterval: (query) => {
            const url = (query.state.data as Url);
            return url?.status === 'scanning' ? 5000 : false;
        }
    });

    const { data: latestScan, isLoading: isLatestLoading } = useQuery({
        queryKey: ['latest-scan', id],
        queryFn: async () => (await api.get(`/api/urls/${id}/latest-scan`)).data,
        enabled: !!id
    });

    // Fetch a specific scan when user clicks on history
    const { data: selectedScan, isLoading: isSelectedLoading } = useQuery({
        queryKey: ['scan', selectedScanId],
        queryFn: async () => (await api.get(`/api/scans/${selectedScanId}`)).data,
        enabled: !!selectedScanId
    });

    const { data: history } = useQuery({
        queryKey: ['history', id],
        queryFn: async () => (await api.get(`/api/urls/${id}/history`)).data,
        enabled: !!id
    });

    // The active scan is either the selected historical scan or the latest
    const activeScan = selectedScanId ? selectedScan : latestScan;
    const isScanLoading = selectedScanId ? isSelectedLoading : isLatestLoading;

    // Stable state synchronization
    const [selectedIssueIndex, setSelectedIssueIndex] = useState<number | null>(null);
    const [prevActiveScanId, setPrevActiveScanId] = useState<string | null>(null);
    const [prevStepIndex, setPrevStepIndex] = useState(0);

    // Only synchronize when activeScan is actually loaded and changed
    if (activeScan && activeScan._id !== prevActiveScanId) {
        setPrevActiveScanId(activeScan._id);
        
        // Reset selection when scan changes
        if (activeScan.steps?.length) {
            let maxIssues = -1;
            let bestIndex = 0;
            activeScan.steps.forEach((step: ScanStep, i: number) => {
                if (step.issues?.length > maxIssues) {
                    maxIssues = step.issues.length;
                    bestIndex = i;
                }
            });
            setSelectedStepIndex(bestIndex);
            setPrevStepIndex(bestIndex); // Keep indices in sync
        } else {
            setSelectedStepIndex(0);
            setPrevStepIndex(0);
        }
        
        if (selectedIssueIndex !== null) {
            setSelectedIssueIndex(null);
        }
    }

    // Reset issue selection when step manually changes
    if (selectedStepIndex !== prevStepIndex) {
        setPrevStepIndex(selectedStepIndex);
        if (selectedIssueIndex !== null) {
            setSelectedIssueIndex(null);
        }
    }

    const issueRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Scroll issue into view when selected from overlay
    useEffect(() => {
        if (selectedIssueIndex !== null && issueRefs.current[selectedIssueIndex]) {
            issueRefs.current[selectedIssueIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selectedIssueIndex]);

    const scanMutation = useMutation({
        mutationFn: async () => {
            return api.post(`/api/urls/${id}/scan`);
        },
        onSuccess: () => {
            setSelectedScanId(null); // Go back to latest scan view
            queryClient.invalidateQueries({ queryKey: ['latest-scan', id] });
            queryClient.invalidateQueries({ queryKey: ['history', id] });
            queryClient.invalidateQueries({ queryKey: ['url', id] });
        }
    });
    // Update document title for SEO
    useEffect(() => {
        if (urlData) {
            document.title = `${urlData.name || urlData.url} - Pa11y Accessibility Report`;
        }
        return () => {
            document.title = 'Pa11y Dashboard - Web Accessibility Auditor';
        };
    }, [urlData]);


    if (isUrlLoading || isLatestLoading) return <div className="p-8">Loading report...</div>;
    if (!urlData) return <div className="p-8">URL not found</div>;

    // Determine which data to show (Step data or Main data)
    const hasSteps = activeScan?.steps && activeScan.steps.length > 0;
    const currentData = hasSteps ? activeScan.steps[selectedStepIndex] : activeScan;

    const issues = currentData?.issues || [];
    const filteredIssues = activeFilter === 'all' ? issues : issues.filter((i: Issue) => i.type === activeFilter);
    const errorCount = issues.filter((i: Issue) => i.type === 'error').length;
    const warningCount = issues.filter((i: Issue) => i.type === 'warning').length;
    const noticeCount = issues.filter((i: Issue) => i.type === 'notice').length;

    const handleSelectScan = (scanId: string) => {
        // If selecting the latest scan, clear selection to use the latestScan query
        if (history && history.length > 0 && history[0]._id === scanId) {
            setSelectedScanId(null);
        } else {
            setSelectedScanId(scanId);
        }
    };



    // Determine which scan ID is currently active for highlighting
    const activeScanId = selectedScanId || latestScan?._id;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/')}>
                    <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                    Back
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{urlData.name || urlData.url}</h1>
                    <a href={urlData.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:underline" aria-label={`Visit ${urlData.name || urlData.url} (opens in new tab)`}>
                        {urlData.url}
                    </a>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {selectedScanId && (
                        <Button variant="outline" onClick={() => setSelectedScanId(null)}>
                            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Latest Scan
                        </Button>
                    )}
                    <Button onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending || urlData.status === 'scanning'}>
                        {scanMutation.isPending || urlData.status === 'scanning' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />}
                        Re-Scan
                    </Button>
                </div>
            </div>

            {/* Viewing historical scan indicator */}
            {selectedScanId && activeScan && (
                <div className="bg-muted/50 border rounded-lg px-4 py-2 text-sm text-muted-foreground flex items-center gap-2" role="status">
                    <Info className="h-4 w-4" aria-hidden="true" />
                    Viewing scan from <span className="font-medium text-foreground">{new Date(activeScan.timestamp).toLocaleString()}</span>
                    <Button variant="link" size="sm" className="h-auto p-0 ml-1" onClick={() => setSelectedScanId(null)}>
                        View latest
                    </Button>
                </div>
            )}

            {/* Loading state for selected scan */}
            {isScanLoading && (
                <div className="flex items-center justify-center py-8 text-muted-foreground" role="status" aria-busy="true">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                    Loading scan data...
                </div>
            )}

            {!isScanLoading && activeScan && (
                <>
                    {hasSteps && (
                        <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Scan steps">
                            {activeScan.steps.map((step: ScanStep, index: number) => (
                                <Button
                                    key={index}
                                    role="tab"
                                    aria-selected={selectedStepIndex === index}
                                    aria-controls={`step-panel-${index}`}
                                    variant={selectedStepIndex === index ? 'default' : 'outline'}
                                    onClick={() => setSelectedStepIndex(index)}
                                    className="whitespace-nowrap"
                                    size="sm"
                                >
                                    <span className="mr-2 font-mono text-xs" aria-hidden="true">{index + 1}.</span>
                                    {step.stepName}
                                    <Badge variant={step.issues.length > 0 ? "secondary" : "outline"} className="ml-2 h-5 px-1.5">
                                        {step.issues.length}
                                        <span className="sr-only"> issues</span>
                                    </Badge>
                                </Button>
                            ))}
                        </div>
                    )}

                    <div className="grid gap-6 md:grid-cols-3">
                        <Card className="md:col-span-2" id={`step-panel-${selectedStepIndex}`} role="tabpanel">
                            <CardHeader>
                                <CardTitle>Screenshot {hasSteps && `- ${currentData.stepName}`}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {currentData?.screenshot ? (
                                    <ScreenshotOverlay
                                        screenshot={currentData.screenshot.startsWith('data:') ? currentData.screenshot : `${import.meta.env.VITE_API_URL || ''}${currentData.screenshot}`}
                                        issues={issues}
                                        viewport={currentData.viewport}
                                        selectedIssueIndex={selectedIssueIndex}
                                        onSelectIssue={setSelectedIssueIndex}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-64 bg-muted text-muted-foreground" aria-hidden="true">
                                        No screenshot available
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex flex-col gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Accessibility Score</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center justify-center py-8">
                                    {currentData?.score !== undefined ? (
                                        <div className="text-center">
                                            <div className={`text-6xl font-bold mb-2 ${currentData.score >= 90 ? 'text-green-500' :
                                                currentData.score >= 50 ? 'text-yellow-500' : 'text-red-500'
                                                }`}>
                                                {currentData.score}
                                            </div>
                                            <div className="text-muted-foreground">out of 100</div>
                                        </div>
                                    ) : (
                                        <div className="text-muted-foreground">No score available</div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Trend History</CardTitle>
                                </CardHeader>
                                <CardContent className="p-2">
                                    <TrendChart history={history || []} onSelectScan={handleSelectScan} />
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4" role="tablist" aria-label="Issue filters">
                        <Card
                            role="tab"
                            aria-selected={activeFilter === 'all'}
                            tabIndex={0}
                            className={`cursor-pointer transition-all ${activeFilter === 'all' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
                            onClick={() => setActiveFilter('all')}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveFilter('all')}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
                                <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{issues.length}</div>
                            </CardContent>
                        </Card>
                        <Card
                            role="tab"
                            aria-selected={activeFilter === 'error'}
                            tabIndex={0}
                            className={`cursor-pointer transition-all ${activeFilter === 'error' ? 'ring-2 ring-red-500' : 'hover:bg-muted/50'}`}
                            onClick={() => setActiveFilter('error')}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveFilter('error')}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Errors</CardTitle>
                                <AlertCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-500">{errorCount}</div>
                            </CardContent>
                        </Card>
                        <Card
                            role="tab"
                            aria-selected={activeFilter === 'warning'}
                            tabIndex={0}
                            className={`cursor-pointer transition-all ${activeFilter === 'warning' ? 'ring-2 ring-yellow-500' : 'hover:bg-muted/50'}`}
                            onClick={() => setActiveFilter('warning')}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveFilter('warning')}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Warnings</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-yellow-500">{warningCount}</div>
                            </CardContent>
                        </Card>
                        <Card
                            role="tab"
                            aria-selected={activeFilter === 'notice'}
                            tabIndex={0}
                            className={`cursor-pointer transition-all ${activeFilter === 'notice' ? 'ring-2 ring-blue-500' : 'hover:bg-muted/50'}`}
                            onClick={() => setActiveFilter('notice')}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveFilter('notice')}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Notices</CardTitle>
                                <Info className="h-4 w-4 text-blue-500" aria-hidden="true" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-500">{noticeCount}</div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            <div className="grid gap-6 md:grid-cols-4">

                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle>Issues {hasSteps && `- ${currentData?.stepName}`}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[600px] pr-4">
                            {filteredIssues.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No issues found for this filter! 🎉</div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredIssues.map((issue: Issue) => {
                                        const originalIndex = issues.indexOf(issue);
                                        return (
                                            <div
                                                key={originalIndex}
                                                ref={(el) => { issueRefs.current[originalIndex] = el; }}
                                                role="button"
                                                tabIndex={0}
                                                aria-expanded={selectedIssueIndex === originalIndex}
                                                className={`border rounded-lg p-4 space-y-2 cursor-pointer transition-all duration-150 ${selectedIssueIndex === originalIndex
                                                    ? 'ring-2 ring-primary border-primary bg-primary/5'
                                                    : 'hover:border-primary/50'
                                                    }`}
                                                onClick={() => setSelectedIssueIndex(selectedIssueIndex === originalIndex ? null : originalIndex)}
                                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedIssueIndex(selectedIssueIndex === originalIndex ? null : originalIndex)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={issue.type === 'error' ? 'destructive' : issue.type === 'warning' ? 'warning' : 'default'}
                                                    >
                                                        {issue.type}
                                                    </Badge>
                                                    <span className="font-mono text-xs text-muted-foreground">{issue.code}</span>
                                                    {issue.boundingBox && (
                                                        <span className="text-[10px] text-muted-foreground" title="This issue has a visual overlay on the screenshot" aria-label="Has visual overlay">📍</span>
                                                    )}
                                                    {(() => {
                                                        const docsUrl = getIssueDocsUrl(issue.code);
                                                        return docsUrl ? (
                                                            <a
                                                                href={docsUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline ml-auto"
                                                                onClick={(e) => e.stopPropagation()}
                                                                aria-label={`Learn how to fix issue ${issue.code} (opens in new tab)`}
                                                            >
                                                                How to fix
                                                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                                            </a>
                                                        ) : null;
                                                    })()}
                                                </div>
                                                <p className="text-sm font-medium">{issue.message}</p>
                                                {issue.snippetUrl && (
                                                    <div className="mt-2 rounded border overflow-hidden bg-muted/20">
                                                        <img 
                                                            src={`${import.meta.env.VITE_API_URL || ''}${issue.snippetUrl}`} 
                                                            alt="Element snippet" 
                                                            className="max-h-32 w-auto object-contain"
                                                        />
                                                    </div>
                                                )}
                                                <div className="bg-muted p-2 rounded text-xs font-mono break-all">
                                                    <span className="sr-only">Selector: </span>
                                                    {issue.selector}
                                                </div>
                                                <div className="bg-muted/50 p-2 rounded text-xs font-mono break-all text-muted-foreground">
                                                    <span className="sr-only">Context: </span>
                                                    {issue.context}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[600px]">
                            <div className="space-y-2">
                                {history?.map((scan: Scan) => (
                                    <div
                                        key={scan._id}
                                        role="button"
                                        tabIndex={0}
                                        aria-pressed={activeScanId === scan._id}
                                        className={`p-2 border rounded cursor-pointer text-sm transition-colors ${activeScanId === scan._id
                                            ? 'bg-primary/10 border-primary ring-1 ring-primary/20'
                                            : 'hover:bg-muted'
                                            }`}
                                        onClick={() => handleSelectScan(scan._id)}
                                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelectScan(scan._id)}
                                    >
                                        <div className="font-medium">{new Date(scan.timestamp).toLocaleDateString()}</div>
                                        <div className="text-muted-foreground text-xs">{new Date(scan.timestamp).toLocaleTimeString()}</div>
                                        <div className="mt-1 flex items-center justify-between">
                                            <div>
                                                <Badge variant={((scan.issuesCount ?? scan.issues?.length) ?? 0) > 0 ? 'destructive' : 'success'} className="active:scale-95 transition-transform">
                                                    {(scan.issuesCount ?? scan.issues?.length) ?? 0} Issues
                                                    <span className="sr-only"> found in this scan</span>
                                                </Badge>
                                                {scan.score !== undefined && (
                                                    <Badge variant={scan.score >= 90 ? 'success' : scan.score >= 50 ? 'warning' : 'destructive'} className="ml-2">
                                                        Score: {scan.score}
                                                        <span className="sr-only"> out of 100</span>
                                                    </Badge>
                                                )}
                                            </div>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <ExportReportModal url={urlData} scan={scan} />
                                            </div>
                                        </div>
                                        {scan.steps && scan.steps.length > 1 && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {scan.steps.length} steps
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
