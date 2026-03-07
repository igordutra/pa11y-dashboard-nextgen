export interface Job {
    urlId: string;
    url?: string;
    name?: string;
    enqueuedAt: string;
    startedAt?: string;
    priority: boolean;
    status: 'pending' | 'running';
    durationMs?: number;
}

export interface FailedJob {
    urlId: string;
    url?: string;
    name?: string;
    enqueuedAt: string;
    startedAt: string;
    failedAt: string;
    error: string;
    priority: boolean;
}

export interface ScheduledTask {
    urlId: string;
    url: string;
    name?: string;
    schedule: string;
    frequency: string;
    nextRun: string;
}

export interface JobsResponse {
    running: Job[];
    queue: Job[];
    failed: FailedJob[];
    scheduled: ScheduledTask[];
}

export interface Action {
    type: 'click' | 'wait' | 'type' | 'wait-for-url' | 'screen-capture';
    value: string;
    label?: string;
}

export interface Issue {
    code: string;
    type: string;
    typeCode: number;
    message: string;
    context: string;
    selector: string;
    runner: string;
    runnerExtras?: unknown;
    boundingBox?: { x: number; y: number; width: number; height: number; };
    snippetUrl?: string;
}

export interface ScanStep {
    stepName: string;
    issues: Issue[];
    score: number;
    screenshot: string;
    thumbnail: string;
    pageUrl: string;
    viewport?: { width: number; height: number };
}

export interface Scan {
    _id: string;
    urlId: string;
    timestamp: string;
    issues: Issue[];
    score: number;
    screenshot: string;
    thumbnail: string;
    steps?: ScanStep[];
    issuesCount?: number;
    stepsCount?: number;
    browserVersion?: string;
    standard?: string;
    runners?: string[];
}

export interface Url {
    _id: string;
    url: string;
    name?: string;
    schedule: string;
    standard?: string;
    status: 'active' | 'error' | 'paused' | 'scanning';
    lastScanAt?: string;
    lastIssueCount?: number;
    lastScore?: number;
    lastThumbnail?: string;
    actions: Action[];
    categoryId?: string | null;
}
