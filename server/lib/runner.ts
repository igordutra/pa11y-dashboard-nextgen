import pa11y from 'pa11y';
import { UrlModel, ScanModel } from '../models/index.js';
import { getSettings } from '../models/settings.js';
import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import { URL } from 'url';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { getConfig } from '../config/index.js';

// Pa11y config that will be passed to captureStep
interface Pa11yConfig {
    runners: string[];
    includeNotices: boolean;
    includeWarnings: boolean;
    timeout: number;
    wait: number;
    hideElements?: string;
    rootElement?: string;
    userAgent?: string;
    ignore: string[];
    headers: Record<string, string>;
    viewport: { width: number; height: number; isMobile?: boolean };
}

// Helper to perform the audit (Screenshot + Lighthouse + Pa11y)
const captureStep = async (page: any, browser: any, urlDoc: any, stepName: string, config: Pa11yConfig): Promise<any> => {
    console.log(`Capturing step: ${stepName}`);
    const timestamp = Date.now();
    const currentConfig = getConfig();
    const screenshotsDir = currentConfig.screenshotsDir;

    // 1. Run Lighthouse (Accessibility Score)
    // We do this first in the intended viewport
    let score = null;
    if (stepName === 'Initial Load') {
        const { port } = new URL(browser.wsEndpoint());
        const lighthouseOptions = {
            logLevel: 'error' as const,
            output: 'json' as const,
            onlyCategories: ['accessibility'],
            port: Number(port)
        };
        try {
            const runnerResult = await lighthouse(urlDoc.url, lighthouseOptions);
            score = (runnerResult?.lhr?.categories?.accessibility?.score || 0) * 100;
        } catch (e) {
            console.error('Lighthouse failed:', e);
        }
    }

    // 2. Run Pa11y with merged settings
    // Use ignoreUrl to audit the CURRENT page state without re-navigating
    const currentUrl = await page.url();
    const pa11yOptions: any = {
        browser: browser,
        page: page,
        ignoreUrl: true,
        standard: (urlDoc.standard === 'WCAG22AA' || urlDoc.standard === 'WCAG21AA') ? 'WCAG2AA' :
            (urlDoc.standard === 'WCAG22A' || urlDoc.standard === 'WCAG21A') ? 'WCAG2A' :
                (urlDoc.standard === 'WCAG22AAA' || urlDoc.standard === 'WCAG21AAA') ? 'WCAG2AAA' :
                    urlDoc.standard as any,
        runners: config.runners,
        includeNotices: config.includeNotices,
        includeWarnings: config.includeWarnings,
        timeout: config.timeout,
        wait: config.wait,
        ignore: config.ignore,
        headers: config.headers,
        chromeLaunchConfig: {
            args: []
        }
    };
    if (config.hideElements) pa11yOptions.hideElements = config.hideElements;
    if (config.rootElement) pa11yOptions.rootElement = config.rootElement;
    if (config.userAgent) pa11yOptions.userAgent = config.userAgent;

    const pa11yResult = await pa11y(currentUrl, pa11yOptions);

    // 3. Capture Screenshot and Bounding Boxes
    // To ensure coordinates match the screenshot perfectly, we capture them both 
    // while the same viewport is active. We use a giant viewport to get a full-page
    // capture without scrollbar artifacts or sticky header repetition.
    
    // Calculate body height
    const bodyHeight = await page.evaluate(() => Math.max(
        document.body.scrollHeight, 
        document.documentElement.scrollHeight, 
        document.body.offsetHeight, 
        document.documentElement.offsetHeight, 
        document.body.clientHeight, 
        document.documentElement.clientHeight
    ));

    // Set giant viewport
    const originalViewport = page.viewport();
    await page.setViewport({ 
        width: config.viewport.width, 
        height: Math.max(config.viewport.height, Math.ceil(bodyHeight)) 
    });

    // Wait a brief moment for layout to settle after resize (especially for sticky/vh elements)
    await new Promise(r => setTimeout(r, 500));

    // Capture the full document screenshot
    const screenshotBuffer = await page.screenshot({ encoding: 'binary', fullPage: false }) as Buffer;
    
    // Get the image dimensions from Sharp to ensure we don't extract outside boundaries
    const metadata = await sharp(screenshotBuffer).metadata();
    const imgWidth = metadata.width || config.viewport.width;
    const imgHeight = metadata.height || Math.ceil(bodyHeight);

    // 4. Capture bounding boxes while HUGE viewport is still active
    for (const issue of pa11yResult.issues) {
        if (issue.selector) {
            try {
                const boundingBox = await page.evaluate((sel: string) => {
                    try {
                        const el = document.querySelector(sel);
                        if (!el) return null;
                        const rect = el.getBoundingClientRect();
                        if (rect.width === 0 && rect.height === 0) return null;
                        // Since viewport height == document height, scrollY should be 0
                        return {
                            x: rect.x + window.scrollX,
                            y: rect.y + window.scrollY,
                            width: rect.width,
                            height: rect.height
                        };
                    } catch { return null; }
                }, issue.selector);

                if (boundingBox) {
                    issue.boundingBox = boundingBox;
                    
                    const snippetFilename = `snippet-${urlDoc._id}-${timestamp}-${Math.random().toString(36).substring(2, 9)}.png`;
                    const snippetPath = path.join(screenshotsDir, snippetFilename);

                    const padding = 20;
                    const left = Math.max(0, Math.floor(boundingBox.x) - padding);
                    const top = Math.max(0, Math.floor(boundingBox.y) - padding);
                    
                    // Ensure extraction area is within image boundaries
                    const width = Math.min(Math.ceil(boundingBox.width) + (padding * 2), imgWidth - left);
                    const height = Math.min(Math.ceil(boundingBox.height) + (padding * 2), imgHeight - top);

                    if (width > 0 && height > 0) {
                        try {
                            await sharp(screenshotBuffer)
                                .extract({ left, top, width, height })
                                .toFile(snippetPath);
                            issue.snippetUrl = `/screenshots/${snippetFilename}`;
                        } catch (e) {
                            console.error(`Failed to extract snippet for ${issue.code}:`, e);
                        }
                    }
                }
            } catch {
                issue.boundingBox = null;
            }
        }
    }

    // Restore viewport
    if (originalViewport) {
        await page.setViewport(originalViewport);
    }

    const fullFilename = `scan-${urlDoc._id}-${timestamp}-${stepName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-full.png`;
    const thumbFilename = `scan-${urlDoc._id}-${timestamp}-${stepName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-thumb.png`;
    const fullPath = path.join(screenshotsDir, fullFilename);
    const thumbPath = path.join(screenshotsDir, thumbFilename);

    await fs.writeFile(fullPath, screenshotBuffer);
    await sharp(screenshotBuffer).resize(400).toFile(thumbPath);

    const screenshotUrl = `/screenshots/${fullFilename}`;
    const thumbnailUrl = `/screenshots/${thumbFilename}`;

    // Get viewport dimensions (needed for scaling bounding boxes on the frontend)
    const viewport = page.viewport();

    // If score is null (intermediate steps), calculate a rough score based on issues? 
    // Or just leave null. Let's leave null/undefined for now or carry over?
    // Let's default to 100 and subtract? No, valid score is better.
    // We'll set score to 0 if fails, or maybe 100 if no issues?
    // Let's use a simple heuristic for intermediate steps if LH is skipped:
    // 100 - (errors * 5). Min 0.
    // If score is null (intermediate steps) OR 0 (Lighthouse failed/timeout), 
    // calculate a score based on Pa11y issues.
    if ((score === null || score === 0) && pa11yResult.issues) {
        // IMPROVED SCORING ALGORITHM (Rule-Based Deduction)
        // Deduct per UNIQUE failed rule code instead of per issue instance.
        // This prevents score from zeroing out due to repetitive errors.

        // Weights:
        const RULE_WEIGHTS: Record<string, number> = {
            critical: 15,
            serious: 8,
            moderate: 4,
            minor: 1
        };
        const DEFAULT_RULE_WEIGHT = 5;

        const uniqueIssues = new Map<string, string>(); // code -> max impact
        let instancePenalty = 0;

        for (const issue of pa11yResult.issues) {
            // Determine impact (Axe has runnerExtras.impact, HTMLCS has type)
            let impact = issue.runnerExtras?.impact;
            if (!impact && issue.type) {
                impact = issue.type === 'error' ? 'serious' : issue.type === 'warning' ? 'minor' : 'moderate';
            }
            if (!impact) impact = 'moderate';

            // Register unique rule failure
            if (!uniqueIssues.has(issue.code)) {
                uniqueIssues.set(issue.code, impact);
            }

            // Small penalty for total issue count (0.1 per issue, max 20)
            if (instancePenalty < 20) {
                instancePenalty += 0.1;
            }
        }

        let ruleDeductions = 0;
        uniqueIssues.forEach((impact) => {
            ruleDeductions += RULE_WEIGHTS[impact] || DEFAULT_RULE_WEIGHT;
        });

        const totalDeductions = ruleDeductions + instancePenalty;
        score = Math.max(0, 100 - totalDeductions);

        console.log(`Calculated rule-based score for ${stepName}: ${score.toFixed(1)} (${uniqueIssues.size} unique rules, ${pa11yResult.issues.length} total issues)`);
    } else if (score === null) {
        score = 100;
        console.log('No issues, score 100');
    } else {
        console.log(`Lighthouse score for ${stepName}: ${score}`);
    }

    return {
        stepName,
        issues: pa11yResult.issues,
        score: Math.round(score),
        screenshot: screenshotUrl,
        thumbnail: thumbnailUrl,
        pageUrl: await page.url(),
        viewport: viewport ? { width: viewport.width, height: viewport.height } : { width: config.viewport.width, height: config.viewport.height }
    };
};

export const runScan = async (urlId: string) => {
    const urlDoc = await UrlModel.findById(urlId);
    if (!urlDoc) {
        throw new Error('URL not found');
    }

    console.log(`Starting advanced scan for ${urlDoc.url} with ${urlDoc.actions.length} actions`);

    // Update status to scanning
    urlDoc.status = 'scanning';
    await urlDoc.save();

    // Load global settings and merge with per-URL overrides
    const globalSettings = await getSettings();
    const overrides = urlDoc.overrides || {};
    const config: Pa11yConfig = {
        runners: overrides.runners || globalSettings.runners || ['axe'],
        includeNotices: overrides.includeNotices ?? globalSettings.includeNotices ?? false,
        includeWarnings: overrides.includeWarnings ?? globalSettings.includeWarnings ?? true,
        timeout: overrides.timeout ?? globalSettings.timeout ?? 30000,
        wait: overrides.wait ?? globalSettings.wait ?? 0,
        hideElements: overrides.hideElements ?? globalSettings.hideElements ?? '',
        rootElement: overrides.rootElement ?? globalSettings.rootElement ?? '',
        userAgent: overrides.userAgent ?? globalSettings.userAgent ?? '',
        ignore: overrides.ignore || globalSettings.ignore || [],
        headers: overrides.headers || (globalSettings.headers ? Object.fromEntries(globalSettings.headers) : {}),
        viewport: overrides.viewport || globalSettings.viewport || { width: 1280, height: 1024 }
    };
    console.log(`Using config: runners=[${config.runners}], timeout=${config.timeout}, viewport=${config.viewport.width}x${config.viewport.height}`);

    let browser;
    try {
        // 1. Launch Puppeteer
        const launchArgs = [
            '--disable-dev-shm-usage', 
            '--headless=new'
        ];

        // Disable sandbox only if explicitly requested via environment variable
        if (process.env.PUPPETEER_NO_SANDBOX === 'true') {
            console.log('Puppeteer sandboxing disabled via environment variable.');
            launchArgs.push('--no-sandbox', '--disable-setuid-sandbox');
        }

        const launchOptions: any = {
            args: launchArgs,
            defaultViewport: {
                width: config.viewport.width,
                height: config.viewport.height,
                isMobile: config.viewport.isMobile || false
            }
        };

        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }

        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();
        
        try {
            // Set a global timeout for the whole page session
            page.setDefaultTimeout(config.timeout);

            // Ensure screenshots dir exists
            const currentConfig = getConfig();
            const screenshotsDir = currentConfig.screenshotsDir;
            try { await fs.access(screenshotsDir); } catch { await fs.mkdir(screenshotsDir, { recursive: true }); }

            const steps = [];

            // 2. Initial Load
            await page.goto(urlDoc.url, { waitUntil: 'networkidle2', timeout: config.timeout });
            const initialStep = await captureStep(page, browser, urlDoc, 'Initial Load', config);
            steps.push(initialStep);

            // 3. Execute Actions
            let pendingActionName: string | null = null;

            for (const [index, action] of urlDoc.actions.entries()) {
                console.log(`Executing action: ${action.type} - ${action.value}`);
                try {
                    switch (action.type) {
                        case 'wait': {
                            const ms = parseInt(action.value, 10);
                            await new Promise(r => setTimeout(r, ms));
                            break;
                        }
                        case 'click':
                            if (action.value.includes(' >>> ')) {
                                const [frameSelector, elementSelector] = action.value.split(' >>> ');
                                const frameHandle = await page.waitForSelector(frameSelector, { timeout: 10000 });
                                const frame = await frameHandle?.contentFrame();
                                if (!frame) throw new Error(`Could not find iframe with selector: ${frameSelector}`);
                                await frame.waitForSelector(elementSelector, { timeout: 10000 });
                                await frame.click(elementSelector);
                            } else {
                                await page.waitForSelector(action.value, { timeout: 10000 });
                                await page.click(action.value);
                            }
                            break;
                        case 'type': {
                            // Format: "selector|text" OR "iframe >>> selector|text"
                            const [fullSelector, text] = action.value.split('|');
                            if (fullSelector && text) {
                                if (fullSelector.includes(' >>> ')) {
                                    const [frameSelector, elementSelector] = fullSelector.split(' >>> ');
                                    const frameHandle = await page.waitForSelector(frameSelector, { timeout: 10000 });
                                    const frame = await frameHandle?.contentFrame();
                                    if (!frame) throw new Error(`Could not find iframe with selector: ${frameSelector}`);
                                    await frame.waitForSelector(elementSelector, { timeout: 10000 });
                                    await frame.type(elementSelector, text);
                                } else {
                                    await page.waitForSelector(fullSelector, { timeout: 10000 });
                                    await page.type(fullSelector, text);
                                }
                            }
                            break;
                        }
                        case 'wait-for-url':
                            // Simplification: check URL or wait for network idle
                            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => console.log('Wait for nav timeout, continuing'));
                            break;
                    }

                    // Allow some settling time after action
                    await new Promise(r => setTimeout(r, 1000));

                    // Check if we should skip capturing to merge with a subsequent wait step
                    const nextAction = urlDoc.actions[index + 1];
                    const isNextWait = nextAction && (nextAction.type === 'wait' || nextAction.type === 'wait-for-url');
                    const isCurrentWait = action.type === 'wait' || action.type === 'wait-for-url';

                    if (isNextWait) {
                        // If next action is a wait, save this action's name so the wait step can use it
                        if (!isCurrentWait) {
                            pendingActionName = action.label || `Step ${index + 1}`;
                        }
                        console.log(`Skipping capture for step ${index + 1}, delegating to subsequent wait action.`);
                        continue;
                    }

                    let finalStepName = action.label || (isCurrentWait ? `Wait step ${index + 1}` : `Step ${index + 1}`);
                    
                    if (isCurrentWait && pendingActionName) {
                        finalStepName = pendingActionName;
                        pendingActionName = null; // reset
                    }

                    const stepResult = await captureStep(page, browser, urlDoc, finalStepName, config);
                    steps.push(stepResult);

                } catch (err) {
                    console.error(`Action failed: ${action.type}`, err);
                    const errMessage = err instanceof Error ? err.message : String(err);
                    let recommendation = 'An unexpected error occurred during this step.';

                    if (errMessage.includes('TimeoutError') || errMessage.includes('waiting for selector')) {
                        recommendation = `The element "${action.value}" could not be found within the timeout. Please check if the selector is correct and the element is visible on the page before this step executes.`;
                    } else if (errMessage.includes('not clickable') || errMessage.includes('is detached')) {
                        recommendation = `The element "${action.value}" was found but could not be clicked. It might be hidden, covered by another element (like a modal), or removed from the DOM.`;
                    } else if (errMessage.includes('Navigation') || errMessage.includes('net::ERR')) {
                        recommendation = `The page took too long to navigate or failed to load. The server might be slow, or the action did not trigger a navigation as expected.`;
                    }

                    steps.push({
                        stepName: `Failed: ${action.label || action.type}`,
                        issues: [{
                            type: 'error',
                            code: 'step-execution-failure',
                            message: `Action '${action.type}' failed.`,
                            selector: action.value,
                            context: recommendation
                        }],
                        score: 0,
                        screenshot: '',
                        thumbnail: '',
                        pageUrl: page.url()
                    });
                    break; // Stop executing actions on error
                }
            }

            // 4. Save Scan with Steps
            // Calculate average score from valid steps (excluding technical failures)
            const validSteps = steps.filter(s => !s.stepName.startsWith('Failed:'));
            const totalScore = validSteps.reduce((acc, s) => acc + (s.score || 0), 0);
            const averageScore = validSteps.length > 0 ? Math.round(totalScore / validSteps.length) : 0;

            // Use the LAST step as the main result for legacy compatibility (for screenshot/url)
            // But use average score for the record
            const lastStep = steps[steps.length - 1];

            const scan = await ScanModel.create({
                urlId: urlDoc._id,
                timestamp: new Date(),
                steps: steps,
                // Legacy fields from last step
                issues: lastStep.issues,
                score: averageScore, // Use average score
                screenshot: lastStep.screenshot,
                thumbnail: lastStep.thumbnail,
                pageUrl: lastStep.pageUrl,
                documentTitle: await page.title(),
                // Enriched Meta
                runners: config.runners,
                standard: urlDoc.standard,
                browserVersion: await browser.version()
            });

            // 5. Update URL Status and Last Result
            // Use first step for thumbnail (always has a valid screenshot)
            const firstStep = steps[0];
            // Use the overall scan score and total issues across ALL steps
            const totalIssues = steps.reduce((sum, s) => sum + (s.issues?.length || 0), 0);
            urlDoc.status = 'active';
            urlDoc.lastScanAt = new Date();
            urlDoc.lastIssueCount = totalIssues;
            urlDoc.lastScore = averageScore; // Use average score
            urlDoc.lastScreenshot = firstStep.screenshot;
            urlDoc.lastThumbnail = firstStep.thumbnail;
            await urlDoc.save();

            console.log(`Scan complete for ${urlDoc.url}. Steps: ${steps.length}`);
            return scan;
        } finally {
            await browser.close();
        }
    } catch (error) {
        console.error(`Scan failed for ${urlDoc.url}:`, error);
        
        // Find the most recent doc state in case it changed
        const latestUrlDoc = await UrlModel.findById(urlId);
        if (latestUrlDoc) {
            // Reset status from 'scanning'
            if (latestUrlDoc.lastScore === undefined || latestUrlDoc.lastScore === null) {
                latestUrlDoc.status = 'error';
            } else {
                latestUrlDoc.status = 'active';
            }
            // Always record the failure time so the user knows when it last tried
            latestUrlDoc.lastScanAt = new Date();
            await latestUrlDoc.save();
        }
        
        throw error;
    }
};
