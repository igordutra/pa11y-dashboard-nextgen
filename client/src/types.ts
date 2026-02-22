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
}

export interface ScanStep {
    stepName: string;
    issues: Issue[];
    score: number;
    screenshot: string;
    thumbnail: string;
    pageUrl: string;
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
}

export interface Url {
    _id: string;
    url: string;
    name?: string;
    schedule: string;
    standard?: string;
    status: 'active' | 'error' | 'paused';
    lastScanAt?: string;
    lastIssueCount?: number;
    lastScore?: number;
    lastThumbnail?: string;
    actions: Action[];
}
