import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
    // Runner
    runners: ('axe' | 'htmlcs')[];

    // Reporting
    includeNotices: boolean;
    includeWarnings: boolean;

    // Viewport
    viewport: {
        width: number;
        height: number;
        isMobile: boolean;
    };

    // Timing
    timeout: number;  // ms
    wait: number;     // ms before running tests

    // Advanced
    hideElements: string;   // CSS selectors to hide, comma-separated
    rootElement: string;    // CSS selector to limit testing scope
    userAgent: string;      // Custom User-Agent header
    ignore: string[];       // Rule codes to ignore
    headers: Map<string, string>; // Custom HTTP headers
}

const SettingsSchema = new Schema<ISettings>({
    runners: {
        type: [String],
        enum: ['axe', 'htmlcs'],
        default: ['axe']
    },
    includeNotices: { type: Boolean, default: false },
    includeWarnings: { type: Boolean, default: true },
    viewport: {
        width: { type: Number, default: 1280 },
        height: { type: Number, default: 1024 },
        isMobile: { type: Boolean, default: false }
    },
    timeout: { type: Number, default: 30000 },
    wait: { type: Number, default: 0 },
    hideElements: { type: String, default: '' },
    rootElement: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    ignore: { type: [String], default: [] },
    headers: { type: Map, of: String, default: {} }
}, { timestamps: true });

export const SettingsModel = mongoose.model<ISettings>('Settings', SettingsSchema);

/**
 * Get the global settings singleton. Creates defaults if none exist.
 */
export async function getSettings(): Promise<ISettings> {
    let settings = await SettingsModel.findOne();
    if (!settings) {
        settings = await SettingsModel.create({});
    }
    return settings;
}
