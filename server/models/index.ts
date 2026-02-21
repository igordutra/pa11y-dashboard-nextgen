import mongoose, { Document, Schema } from 'mongoose';

// Action definition for scripted scans
export interface IAction {
    type: 'click' | 'wait' | 'type' | 'wait-for-url' | 'screen-capture';
    value: string;
    label?: string;
}

// Per-URL overrides for Pa11y settings (all optional — falls back to global)
export interface IUrlOverrides {
    runners?: ('axe' | 'htmlcs')[];
    includeNotices?: boolean;
    includeWarnings?: boolean;
    timeout?: number;
    wait?: number;
    viewport?: { width: number; height: number; isMobile: boolean };
    hideElements?: string;
    rootElement?: string;
    userAgent?: string;
    ignore?: string[];
    headers?: Record<string, string>;
}

export interface IUrl extends Document {
    url: string;
    name?: string;
    frequency: number; // in minutes
    schedule?: string;
    standard: 'WCAG2A' | 'WCAG2AA' | 'WCAG2AAA' | 'WCAG21A' | 'WCAG21AA' | 'WCAG21AAA' | 'WCAG22A' | 'WCAG22AA' | 'WCAG22AAA';
    lastScanAt?: Date;
    lastIssueCount?: number;
    lastScore?: number;
    lastScreenshot?: string;
    lastThumbnail?: string;
    status: 'active' | 'error' | 'paused';
    actions: IAction[];
    overrides?: IUrlOverrides;
    categoryId?: mongoose.Types.ObjectId;
}

const UrlSchema = new Schema<IUrl>({
    url: { type: String, required: true },
    name: { type: String },
    frequency: { type: Number, default: 60 }, // minutes (legacy)
    schedule: { type: String }, // Cron expression (e.g. "0 0 * * *")
    standard: {
        type: String,
        enum: [
            'WCAG2A', 'WCAG2AA', 'WCAG2AAA',
            'WCAG21A', 'WCAG21AA', 'WCAG21AAA',
            'WCAG22A', 'WCAG22AA', 'WCAG22AAA'
        ],
        default: 'WCAG2AA'
    },
    lastScanAt: { type: Date },
    lastIssueCount: { type: Number, default: 0 },
    lastScore: { type: Number },
    lastScreenshot: { type: String }, // Path to full image
    lastThumbnail: { type: String },  // Path to thumbnail
    status: { type: String, enum: ['active', 'error', 'paused'], default: 'active' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    actions: {
        type: [{
            type: { type: String, enum: ['click', 'wait', 'type', 'wait-for-url', 'screen-capture'], required: true },
            value: { type: String, required: true },
            label: { type: String }
        }],
        default: []
    },
    overrides: {
        type: {
            runners: { type: [String], enum: ['axe', 'htmlcs'] },
            includeNotices: { type: Boolean },
            includeWarnings: { type: Boolean },
            timeout: { type: Number },
            wait: { type: Number },
            viewport: {
                width: { type: Number },
                height: { type: Number },
                isMobile: { type: Boolean }
            },
            hideElements: { type: String },
            rootElement: { type: String },
            userAgent: { type: String },
            ignore: { type: [String] },
            headers: { type: Map, of: String }
        },
        default: undefined
    }
}, { timestamps: true });

export const UrlModel = mongoose.model<IUrl>('Url', UrlSchema);

export interface IScanStep {
    stepName: string;
    issues: any[];
    score: number;
    screenshot: string;
    thumbnail: string;
    pageUrl: string;
    viewport?: { width: number; height: number };
}

export interface IScan extends Document {
    urlId: mongoose.Types.ObjectId;
    timestamp: Date;
    issues: any[]; // Pa11y issues (Legacy / Main result)
    documentTitle?: string;
    pageUrl?: string; // Main result page URL
    score?: number; // Accessibility Score (Legacy / Main result)
    screenshot?: string; // Path to full image (Legacy / Main result)
    thumbnail?: string;   // Path to thumbnail (Legacy / Main result)
    steps: IScanStep[]; // Multi-step results
}

const ScanSchema = new Schema<IScan>({
    urlId: { type: Schema.Types.ObjectId, ref: 'Url', required: true },
    timestamp: { type: Date, default: Date.now },
    issues: { type: [Object], default: [] },
    documentTitle: { type: String },
    pageUrl: { type: String },
    score: { type: Number },
    screenshot: { type: String },
    thumbnail: { type: String },
    steps: {
        type: [{
            stepName: { type: String, required: true },
            issues: { type: [Object], default: [] },
            score: { type: Number },
            screenshot: { type: String },
            thumbnail: { type: String },
            pageUrl: { type: String },
            viewport: {
                width: { type: Number },
                height: { type: Number }
            }
        }],
        default: []
    }
});

ScanSchema.index({ urlId: 1, timestamp: -1 });

export const ScanModel = mongoose.model<IScan>('Scan', ScanSchema);
