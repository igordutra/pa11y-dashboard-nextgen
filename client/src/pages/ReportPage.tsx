import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
    ArrowLeft, 
    RefreshCw, 
    AlertTriangle, 
    AlertCircle, 
    Info, 
    Loader2, 
    ExternalLink, 
    Layers, 
    Clock, 
    CheckCircle2,
    Activity,
    FileDown 
} from 'lucide-react';
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
    const { data: selectedScan } = useQuery({
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

    const { data: env } = useQuery({
        queryKey: ['environment'],
        queryFn: async () => (await api.get('/api/environment')).data,
    });

    const isReadonly = env?.readonly;

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
    
    // Filter out standalone wait steps from the UI as requested, unless they are the only steps
    let visibleSteps = activeScan?.steps || [];
    if (hasSteps) {
        visibleSteps = activeScan.steps.filter((step: ScanStep) => {
            const lowerName = step.stepName.toLowerCase();
            return !lowerName.includes('wait for nav') && !lowerName.startsWith('wait step');
        });
        // Fallback in case everything was filtered out
        if (visibleSteps.length === 0) visibleSteps = activeScan.steps;
    }

    const currentData = hasSteps ? visibleSteps[Math.min(selectedStepIndex, visibleSteps.length - 1)] : activeScan;

    const issues = currentData?.issues || [];
    const filteredIssues = activeFilter === 'all' ? issues : issues.filter((i: Issue) => i.type === activeFilter);
    const errorCount = issues.filter((i: Issue) => i.type === 'error').length;
    const warningCount = issues.filter((i: Issue) => i.type === 'warning').length;
    const noticeCount = issues.filter((i: Issue) => i.type === 'notice').length;

    const handleSelectScan = (scanId: string) => {
        if (history && history.length > 0 && history[0]._id === scanId) {
            setSelectedScanId(null);
        } else {
            setSelectedScanId(scanId);
        }
    };

    const activeScanId = selectedScanId || latestScan?._id;
    const score = currentData?.score ?? 0;
    const hasScore = currentData?.score !== undefined;

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="ghost" 
                        onClick={() => navigate('/')}
                        className="rounded-xl hover:bg-slate-100 text-slate-600 h-10 w-10 p-0"
                        aria-label="Back to dashboard"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-800">{urlData.name || urlData.url}</h1>
                            <Badge variant="outline" className="bg-slate-100/50 border-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-lg">
                                {urlData.standard || 'WCAG2AA'}
                            </Badge>
                        </div>
                        <a 
                            href={urlData.url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-slate-500 flex items-center hover:text-blue-600 transition-colors text-sm font-medium" 
                            aria-label={`Visit ${urlData.name || urlData.url} (opens in new tab)`}
                        >
                            {urlData.url} <ExternalLink className="h-3 w-3 ml-1.5 opacity-60" />
                        </a>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {selectedScanId && (
                        <Button 
                            variant="outline" 
                            onClick={() => setSelectedScanId(null)}
                            className="rounded-xl border-slate-200 text-slate-700 font-bold shadow-sm"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Latest Scan
                        </Button>
                    )}
                    <Button 
                        onClick={() => scanMutation.mutate()} 
                        disabled={scanMutation.isPending || urlData.status === 'scanning' || isReadonly}
                        className="rounded-xl bg-slate-800 hover:bg-slate-900 font-bold px-6 shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isReadonly ? "Scanning is disabled in read-only/demo mode" : ""}
                    >
                        {scanMutation.isPending || urlData.status === 'scanning' ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Re-Scan Now
                    </Button>
                </div>
            </header>

            {/* Viewing historical scan indicator */}
            {selectedScanId && activeScan && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2" role="status">
                    <div className="flex items-center gap-3 text-amber-800 font-medium">
                        <div className="bg-amber-100 p-1.5 rounded-lg">
                            <Info className="h-4 w-4" />
                        </div>
                        <span>Viewing historical scan from <span className="font-bold">{new Date(activeScan.timestamp).toLocaleString()}</span></span>
                    </div>
                    <Button 
                        variant="link" 
                        size="sm" 
                        className="text-amber-700 hover:text-amber-900 font-bold decoration-amber-200 hover:decoration-amber-400" 
                        onClick={() => setSelectedScanId(null)}
                    >
                        Back to latest
                    </Button>
                </div>
            )}

            {/* Main Grid Content */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Left Column: Screenshot and Issues */}
                <div className="xl:col-span-8 space-y-8">
                    {/* Scan Details Card */}
                    <Card className="border-none bg-slate-50/50 rounded-2xl shadow-none border border-slate-200/60">
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard</span>
                                    <span className="font-bold text-slate-700">{activeScan?.standard || urlData.standard}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Runners</span>
                                    <span className="font-bold text-slate-700 capitalize">{activeScan?.runners?.join(', ') || 'axe'}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Environment</span>
                                    <span className="font-bold text-slate-700">{activeScan?.browserVersion ? `Chrome ${activeScan.browserVersion.split('/')[1]}` : 'Chromium'}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Viewport</span>
                                    <span className="font-bold text-slate-700">{currentData?.viewport ? `${currentData.viewport.width}x${currentData.viewport.height}` : '1280x1024'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Steps Navigation */}
                    {hasSteps && (
                        <nav className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide" role="tablist" aria-label="Scan steps">
                            {visibleSteps.map((step: ScanStep, index: number) => (
                                <button
                                    key={index}
                                    role="tab"
                                    aria-selected={selectedStepIndex === index}
                                    aria-controls={`step-panel-${index}`}
                                    onClick={() => setSelectedStepIndex(index)}
                                    className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap
                                        ${selectedStepIndex === index 
                                            ? 'bg-slate-800 text-white shadow-md scale-[1.02]' 
                                            : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200/60 shadow-sm'}
                                    `}
                                >
                                    <span className={`h-4 w-4 flex items-center justify-center rounded-md text-[9px] ${selectedStepIndex === index ? 'bg-slate-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {index + 1}
                                    </span>
                                    {step.stepName}
                                    <Badge 
                                        className={`
                                            ml-1 h-4 px-1 rounded text-[9px] font-bold border-none
                                            ${selectedStepIndex === index ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}
                                        `}
                                    >
                                        {step.issues.length}
                                    </Badge>
                                </button>
                            ))}
                        </nav>
                    )}

                    {/* Screenshot Viewer */}
                    <Card className="border-none bg-slate-50/50 rounded-2xl shadow-none overflow-hidden" id={`step-panel-${selectedStepIndex}`} role="tabpanel">
                        <CardHeader className="px-6 py-4 border-b border-slate-200/50 flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Layers className="h-4 w-4 text-slate-400" />
                                Visual Report {hasSteps && <span className="text-slate-400 font-medium">— {currentData.stepName}</span>}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {currentData?.screenshot ? (
                                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-inner max-h-[600px] overflow-y-auto">
                                    <ScreenshotOverlay
                                        screenshot={currentData.screenshot.startsWith('data:') ? currentData.screenshot : `${import.meta.env.VITE_API_URL || ''}${currentData.screenshot}`}
                                        issues={issues}
                                        viewport={currentData.viewport}
                                        selectedIssueIndex={selectedIssueIndex}
                                        onSelectIssue={setSelectedIssueIndex}
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-80 bg-slate-100/50 rounded-xl text-slate-400 border-2 border-dashed border-slate-200">
                                    <ExternalLink className="h-10 w-10 mb-3 opacity-20" />
                                    <span className="font-bold opacity-50">Screenshot rendering in progress...</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Filters - MOVED ABOVE ISSUES */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3" role="tablist" aria-label="Issue filters">
                        {[
                            { id: 'all' as const, label: 'Total', count: issues.length, icon: Layers, color: 'slate' },
                            { id: 'error' as const, label: 'Errors', count: errorCount, icon: AlertCircle, color: 'red' },
                            { id: 'warning' as const, label: 'Warnings', count: warningCount, icon: AlertTriangle, color: 'amber' },
                            { id: 'notice' as const, label: 'Notices', count: noticeCount, icon: Info, color: 'blue' },
                        ].map((filter) => (
                            <button
                                key={filter.id}
                                role="tab"
                                aria-selected={activeFilter === filter.id}
                                className={`
                                    p-4 rounded-2xl transition-all duration-300 border text-left flex flex-col justify-between group
                                    ${activeFilter === filter.id 
                                        ? 'bg-white border-blue-400 shadow-md ring-1 ring-blue-50' 
                                        : 'bg-white border-transparent hover:border-slate-200 shadow-sm opacity-70 hover:opacity-100'}
                                `}
                                onClick={() => setActiveFilter(filter.id)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`p-1.5 rounded-lg ${activeFilter === filter.id ? `bg-${filter.color}-50 text-${filter.color}-500` : 'bg-slate-50 text-slate-400 group-hover:text-slate-600'}`}>
                                        <filter.icon className="h-4 w-4" aria-hidden="true" />
                                    </div>
                                    <span className={`text-xl font-bold ${activeFilter === filter.id ? `text-${filter.color}-600` : 'text-slate-700'}`}>
                                        {filter.count}
                                    </span>
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${activeFilter === filter.id ? `text-${filter.color}-700` : 'text-slate-400'}`}>
                                    {filter.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Issues List Card */}
                    <Card className="border-none bg-slate-50/50 rounded-2xl shadow-none overflow-hidden">
                        <CardHeader className="px-6 py-5 border-b border-slate-200/50 flex flex-row items-center justify-between">
                            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-slate-400" />
                                Identified Issues
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-white border border-slate-200 text-slate-600 font-bold rounded-lg px-2">
                                    {filteredIssues.length} Shown
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[650px] px-6 py-6">
                                {filteredIssues.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                        <CheckCircle2 className="h-16 w-16 mb-4 text-green-500/30" />
                                        <p className="text-xl font-bold text-slate-500">No issues detected! 🎉</p>
                                        <p className="text-sm">Great job, your page meets the selected standard.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {filteredIssues.map((issue: Issue) => {
                                            const originalIndex = issues.indexOf(issue);
                                            const isSelected = selectedIssueIndex === originalIndex;
                                            return (
                                                <div
                                                    key={originalIndex}
                                                    ref={(el) => { issueRefs.current[originalIndex] = el; }}
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-expanded={isSelected}
                                                    className={`
                                                        group p-5 rounded-2xl transition-all duration-300 cursor-pointer border
                                                        ${isSelected 
                                                            ? 'bg-blue-50/40 border-blue-400 shadow-sm' 
                                                            : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}
                                                    `}
                                                    onClick={() => setSelectedIssueIndex(isSelected ? null : originalIndex)}
                                                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedIssueIndex(isSelected ? null : originalIndex)}
                                                >
                                                    <div className="flex items-start justify-between gap-4 mb-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge
                                                                className={`
                                                                    rounded-lg font-bold px-2.5 py-1 text-[10px] uppercase tracking-wider
                                                                    ${issue.type === 'error' ? 'bg-red-500 text-white' : issue.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}
                                                                `}
                                                            >
                                                                {issue.type}
                                                            </Badge>
                                                            <span className="font-mono text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                                                                {issue.code}
                                                            </span>
                                                        </div>
                                                        
                                                        {(() => {
                                                            const docsUrl = getIssueDocsUrl(issue.code);
                                                            return docsUrl ? (
                                                                <a
                                                                    href={docsUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    REMEDIATION GUIDE
                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                </a>
                                                            ) : null;
                                                        })()}
                                                    </div>

                                                    <h4 className="font-bold text-slate-800 leading-tight mb-4 group-hover:text-blue-700 transition-colors">
                                                        {issue.message}
                                                    </h4>

                                                    {issue.snippetUrl && (
                                                        <div className="mb-4 rounded-xl border border-slate-100 overflow-hidden bg-slate-50 p-2 group-hover:border-slate-200 transition-colors">
                                                            <img 
                                                                src={`${import.meta.env.VITE_API_URL || ''}${issue.snippetUrl}`} 
                                                                alt="Element causing the issue" 
                                                                className="max-h-24 w-auto object-contain mx-auto"
                                                            />
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Selector</p>
                                                            <code className="text-[11px] font-mono break-all text-slate-600 leading-relaxed">{issue.selector}</code>
                                                        </div>
                                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Code Context</p>
                                                            <code className="text-[11px] font-mono break-all text-slate-600 leading-relaxed">{issue.context}</code>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Score, Trend, History */}
                <div className="xl:col-span-4 space-y-8">
                    {/* Large Score Card - LIGHT THEME */}
                    <Card className="border-none bg-slate-50/50 rounded-3xl shadow-none overflow-hidden relative border border-slate-200/60">
                        <div className="absolute top-0 right-0 p-6 opacity-5" aria-hidden="true">
                            <Activity className="h-32 w-32 text-slate-900" />
                        </div>
                        <CardContent className="p-8 flex flex-col items-center justify-center relative z-10">
                            <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mb-6">Accessibility Score</div>
                            <div className="relative group/score-large">
                                <div className={`h-48 w-48 rounded-full flex items-center justify-center bg-white shadow-xl shadow-slate-200/50 transition-transform group-hover/score-large:scale-105 duration-500`}>
                                    <svg className="h-48 w-48 -rotate-90 transform">
                                        <circle
                                            cx="96"
                                            cy="96"
                                            r="88"
                                            fill="none"
                                            stroke="#f1f5f9"
                                            strokeWidth="12"
                                        />
                                        {hasScore && (
                                            <circle
                                                cx="96"
                                                cy="96"
                                                r="88"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="12"
                                                strokeDasharray={552.9}
                                                strokeDashoffset={552.9 * (1 - score / 100)}
                                                strokeLinecap="round"
                                                className={`${score >= 90 ? 'text-green-500' : score >= 50 ? 'text-amber-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                                            />
                                        )}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className={`text-6xl font-black tracking-tighter ${hasScore ? 'text-slate-800' : 'text-slate-300'}`}>
                                            {hasScore ? score : '--'}
                                        </span>
                                        <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] mt-1 uppercase">Percent</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 flex gap-3 w-full">
                                <div className="flex-1 bg-white rounded-2xl p-4 text-center border border-slate-100 shadow-sm">
                                    <div className="text-2xl font-black text-red-500">{errorCount}</div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Errors</div>
                                </div>
                                <div className="flex-1 bg-white rounded-2xl p-4 text-center border border-slate-100 shadow-sm">
                                    <div className="text-2xl font-black text-amber-500">{warningCount}</div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Warnings</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Trend Chart Card */}
                    <Card className="border-none bg-slate-50/50 rounded-2xl shadow-none overflow-hidden border border-slate-200/60">
                        <CardHeader className="px-6 py-4 border-b border-slate-200/50">
                            <CardTitle className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-[0.2em]">
                                <Clock className="h-4 w-4 text-slate-300" />
                                Score Trend
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="px-2 pt-4 pb-2">
                                <TrendChart history={history || []} onSelectScan={handleSelectScan} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* History List Card */}
                    <Card className="border-none bg-slate-50/50 rounded-2xl shadow-none overflow-hidden border border-slate-200/60">
                        <CardHeader className="px-6 py-4 border-b border-slate-200/50 flex items-center justify-between">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Scan History</CardTitle>
                            <Badge variant="outline" className="text-[9px] font-black rounded-lg border-slate-200 text-slate-400 uppercase">20 Latest</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[400px] p-6">
                                <div className="space-y-3">
                                    {history?.map((scan: Scan) => {
                                        // Ensure we get the correct count from backend provided issuesCount
                                        const totalIssuesCount = scan.issuesCount !== undefined 
                                            ? scan.issuesCount 
                                            : (scan.steps && scan.steps.length > 0 
                                                ? scan.steps.reduce((sum, step) => sum + (step.issues?.length || 0), 0)
                                                : (scan.issues?.length || 0));

                                        return (
                                            <div
                                                key={scan._id}
                                                role="button"
                                                tabIndex={0}
                                                aria-pressed={activeScanId === scan._id}
                                                className={`
                                                    p-4 rounded-xl transition-all duration-300 border
                                                    ${activeScanId === scan._id
                                                        ? 'bg-blue-50/40 border-blue-500 shadow-sm opacity-100 z-10'
                                                        : 'bg-white border-transparent opacity-50 hover:opacity-100 hover:border-slate-200 shadow-sm'}
                                                `}
                                                onClick={() => handleSelectScan(scan._id)}
                                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelectScan(scan._id)}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{new Date(scan.timestamp).toLocaleDateString()}</div>
                                                        <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{new Date(scan.timestamp).toLocaleTimeString()}</div>
                                                    </div>
                                                    <div className={`text-sm font-black ${scan.score && scan.score >= 90 ? 'text-green-500' : scan.score && scan.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                                        {scan.score ?? '--'}%
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-end justify-between mt-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        <Badge className={`text-[9px] font-bold rounded px-1.5 h-4 border-none shadow-none ${totalIssuesCount > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                            {totalIssuesCount} Issues
                                                        </Badge>
                                                    </div>
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        <ExportReportModal 
                                                            url={urlData} 
                                                            scan={scan} 
                                                            trigger={
                                                                <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] font-bold rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50">
                                                                    <FileDown className="mr-1 h-3 w-3" />
                                                                    REPORT
                                                                </Button>
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
