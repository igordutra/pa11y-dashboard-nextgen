declare module 'pa11y' {
    interface Pa11yOptions {
        chromeLaunchConfig?: {
            args?: string[];
            executablePath?: string;
        };
        [key: string]: any;
    }

    interface Pa11yResult {
        documentTitle: string;
        pageUrl: string;
        issues: any[];
    }

    function pa11y(url: string, options?: Pa11yOptions): Promise<Pa11yResult>;
    export = pa11y;
}
