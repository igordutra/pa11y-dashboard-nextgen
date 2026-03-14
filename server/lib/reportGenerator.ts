import { IScan, IUrl } from '../models/index.js';
import { getConfig } from '../config/index.js';

/**
 * Provides human-readable fix suggestions for common accessibility issue codes.
 */
function getIssueFixSuggestion(code: string): string {
    if (!code) return "Review the issue details and follow WCAG guidelines for remediation.";

    const axeFixes: Record<string, string> = {
        'aria-prohibited-attr': "This element does not support the ARIA attribute used. Remove the prohibited attribute or change the element's role to one that supports it.",
        'color-contrast': "Increase the contrast ratio between the text and its background to at least 4.5:1 (or 3:1 for large text).",
        'image-alt': "Add a meaningful 'alt' attribute to the <img> element that describes the image's purpose.",
        'label': "Ensure this form field has a programmatically associated <label> using 'for' and 'id' attributes.",
        'button-name': "Ensure the button has a discernible name (text content or aria-label) so screen readers can announce its purpose.",
        'link-name': "Ensure the link has discernible text content so users know where it leads.",
        'empty-heading': "Headings must have text content to be useful for navigation.",
        'html-has-lang': "Add a 'lang' attribute to the <html> element (e.g., <html lang=\"en\">).",
        'valid-lang': "Ensure the 'lang' attribute has a valid BCP 47 language code.",
        'bypass': "Add a 'Skip to Main Content' link at the top of the page.",
        'region': "Ensure all content is contained within landmark regions (main, nav, header, footer).",
        'page-has-main': "The page must have a <main> landmark.",
        'document-title': "Add a descriptive <title> to the document.",
        'heading-order': "Ensure headings follow a logical nested order (h1, then h2, etc.).",
        'aria-roles': "Ensure ARIA roles used are valid for the element.",
        'aria-valid-attr': "Ensure ARIA attributes used are valid and correctly spelled.",
        'duplicate-id': "The 'id' attribute must be unique in the document. Rename or remove duplicate IDs."
    };

    if (axeFixes[code]) return axeFixes[code];

    if (code.includes('G18') || code.includes('1_4_3')) return "Ensure the contrast ratio between text and background is at least 4.5:1.";
    if (code.includes('H37') || code.includes('1_1_1')) return "Provide a text alternative for non-text content using the 'alt' attribute.";
    if (code.includes('H44') || code.includes('1_3_1')) return "Associate labels with form controls using the 'for' and 'id' attributes.";

    return "Review the element's implementation and ensure it meets the relevant WCAG success criteria.";
}

/**
 * Returns a URL to documentation explaining how to fix the given issue.
 */
function getIssueDocsUrl(code: string): string | null {
    if (!code) return null;
    if (code.startsWith('WCAG2')) {
        const segments = code.split('.');
        for (let i = segments.length - 1; i >= 0; i--) {
            if (/^[A-Z]+\d+$/.test(segments[i])) {
                return `https://www.w3.org/TR/WCAG20-TECHS/${segments[i]}.html`;
            }
        }
    }
    if (/^[a-z][a-z0-9-]+$/.test(code)) {
        return `https://dequeuniversity.com/rules/axe/4.10/${code}`;
    }
    return null;
}

interface ReportIssue {
    type: string;
    code: string;
    message: string;
    selector: string;
    context?: string;
    snippetUrl?: string;
    runnerExtras?: { impact?: string };
}

/**
 * Generates an enhanced HTML report suitable for PDF conversion.
 */
export function generateHtmlReport(url: IUrl, scan: IScan): string {
    const config = getConfig();
    const date = new Date(scan.timestamp).toLocaleString();
    const baseUrl = process.env.BASE_URL || `http://localhost:${config.port}`;
    
    const allIssues: ReportIssue[] = scan.steps && scan.steps.length > 0 
        ? scan.steps.flatMap(s => s.issues || []) 
        : (scan.issues || []);
        
    const errors = allIssues.filter(i => i.type === 'error').length;
    const warnings = allIssues.filter(i => i.type === 'warning').length;
    const notices = allIssues.filter(i => i.type === 'notice').length;

    const impactCounts = allIssues.reduce((acc: Record<string, number>, curr: ReportIssue) => {
        const impact = curr.runnerExtras?.impact || 'moderate';
        acc[impact] = (acc[impact] || 0) + 1;
        return acc;
    }, {});

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Report: ${escapeHtml(url.name || url.url)}</title>
    <style>
        :root {
            --primary: #3b82f6;
            --secondary: #64748b;
            --success: #10b981;
            --error: #ef4444;
            --warning: #f59e0b;
            --info: #3b82f6;
            --background: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --text-light: #94a3b8;
            --border: #e2e8f0;
        }

        * { box-sizing: border-box; }
        
        body {
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.4;
            color: var(--text-main);
            margin: 0;
            padding: 0;
            background-color: #fff;
            -webkit-print-color-adjust: exact;
        }

        .container {
            width: 100%;
            max-width: 1100px;
            margin: 0 auto;
            padding: 2rem;
        }

        header {
            padding-bottom: 1rem;
            margin-bottom: 1.5rem;
            border-bottom: 1px solid var(--border);
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            margin-bottom: 1rem;
            font-weight: 900;
            font-size: 1.1rem;
            letter-spacing: -0.05em;
        }

        .brand-icon {
            background-color: #1e293b;
            color: white;
            padding: 0.15rem 0.35rem;
            border-radius: 0.35rem;
        }

        h1 { 
            margin: 0 0 0.2rem 0; 
            font-size: 1.75rem; 
            font-weight: 800; 
            letter-spacing: -0.04em;
            color: #0f172a;
        }

        .report-subtitle {
            color: var(--text-muted);
            font-size: 0.85rem;
            margin-bottom: 1rem;
        }

        h2 { 
            margin: 2.5rem 0 0.75rem; 
            font-size: 1.35rem; 
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.02em;
        }

        .meta-grid {
            display: flex;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
            width: 100%;
        }

        .meta-card {
            flex: 1;
            padding: 0.65rem;
            background-color: var(--background);
            border-radius: 0.5rem;
            min-width: 0;
        }

        .meta-label {
            font-size: 0.55rem;
            text-transform: uppercase;
            font-weight: 800;
            letter-spacing: 0.1em;
            color: var(--text-light);
            margin-bottom: 0.2rem;
            display: block;
        }

        .meta-value {
            font-weight: 700;
            font-size: 0.75rem;
            word-break: break-all;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .summary-grid {
            display: flex !important;
            flex-direction: row !important;
            gap: 0.75rem;
            margin: 1.5rem 0;
            width: 100%;
        }

        .stat-card {
            flex: 1 !important;
            padding: 1rem 0.5rem;
            background-color: var(--background);
            border-radius: 0.75rem;
            text-align: center;
            min-width: 0;
        }

        .stat-value { 
            font-size: 1.75rem; 
            font-weight: 900; 
            line-height: 1;
            margin-bottom: 0.2rem;
        }

        .stat-label { 
            font-size: 0.55rem; 
            font-weight: 800;
            color: var(--text-muted); 
            text-transform: uppercase; 
            letter-spacing: 0.1em;
        }

        .impact-breakdown {
            display: flex;
            gap: 0.4rem;
            margin-top: 0.5rem;
            flex-wrap: wrap;
        }

        .impact-tag {
            font-size: 0.5rem;
            font-weight: 800;
            padding: 0.15rem 0.4rem;
            border-radius: 0.25rem;
            text-transform: uppercase;
            background: #f1f5f9;
            color: #475569;
        }

        .impact-critical { background: #fee2e2; color: #991b1b; }
        .impact-serious { background: #ffedd5; color: #9a3412; }

        .issue-card {
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            margin-bottom: 1.25rem;
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.01);
            page-break-inside: avoid;
        }

        .issue-header {
            padding: 0.6rem 1rem;
            background-color: var(--background);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
        }

        .badge {
            font-size: 0.55rem;
            font-weight: 900;
            padding: 0.15rem 0.5rem;
            border-radius: 0.3rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .badge-error { background-color: var(--error); color: #fff; }
        .badge-warning { background-color: var(--warning); color: #fff; }
        .badge-notice { background-color: var(--info); color: #fff; }

        .issue-body { padding: 1rem; }
        .issue-message { font-size: 0.95rem; font-weight: 800; margin: 0 0 0.75rem 0; color: #0f172a; line-height: 1.3; }
        
        .code-container {
            display: flex;
            gap: 0.75rem;
            margin: 0.75rem 0;
        }

        .code-block {
            flex: 1;
            background-color: #f8fafc;
            padding: 0.65rem;
            border-radius: 0.4rem;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 0.6rem;
            border: 1px solid var(--border);
            color: #334155;
            word-break: break-all;
            min-width: 0;
        }

        .code-block strong {
            display: block;
            font-size: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--text-light);
            margin-bottom: 0.3rem;
        }

        .fix-suggestion {
            padding: 0.75rem;
            background-color: #f0fdf4;
            border: 1px solid #dcfce7;
            border-radius: 0.5rem;
            font-size: 0.8rem;
            color: #166534;
        }

        .fix-suggestion strong { 
            display: block;
            font-size: 0.55rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #15803d;
            margin-bottom: 0.3rem;
        }

        .fix-suggestion a {
            display: inline-block;
            margin-top: 0.4rem;
            font-weight: 800;
            color: #166534;
            text-decoration: none;
            font-size: 0.7rem;
            padding: 0.1rem 0.3rem;
            background: #fff;
            border-radius: 0.25rem;
            border: 1px solid #dcfce7;
        }

        .screenshot-container {
            margin: 0.75rem 0;
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            overflow: hidden;
            background-color: var(--background);
        }

        .screenshot-label {
            padding: 0.3rem 0.6rem;
            font-size: 0.55rem;
            color: var(--text-light);
            text-transform: uppercase;
            font-weight: 800;
            letter-spacing: 0.1em;
            border-bottom: 1px solid var(--border);
            background-color: #fff;
        }

        .footer {
            margin-top: 3rem;
            padding: 1.5rem 0;
            border-top: 1px solid var(--border);
            font-size: 0.7rem;
            color: var(--text-light);
            text-align: center;
            font-weight: 600;
        }

        @media print {
            @page {
                size: A4;
                margin: 1.5cm;
            }
            body { 
                background-color: #fff; 
                font-size: 9px; 
            }
            .container { max-width: 100%; padding: 0; }
            h1 { font-size: 1.5rem; }
            h2 { font-size: 1.1rem; margin-top: 1.5rem; }
            .meta-card, .stat-card { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
            .summary-grid { gap: 0.5rem; display: flex !important; flex-direction: row !important; }
            .stat-card { padding: 0.75rem 0.25rem !important; }
            .stat-value { font-size: 1.5rem !important; }
            .issue-card { border-radius: 0.4rem; margin-bottom: 0.75rem; }
            .issue-body { padding: 0.75rem; }
            .issue-message { font-size: 0.85rem; }
            .code-block { font-size: 0.55rem; }
            .fix-suggestion { font-size: 0.7rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="brand">
                <span class="brand-icon">A11y</span> Pa11y Dashboard NextGen
            </div>
            <h1>Accessibility Audit</h1>
            <div class="report-subtitle">Detailed compliance report for <strong>${escapeHtml(url.name || url.url)}</strong></div>
            
            <div class="meta-grid">
                <div class="meta-card">
                    <span class="meta-label">Target URL</span>
                    <div class="meta-value"><a href="${escapeHtml(url.url)}" style="color: var(--primary); text-decoration: none;">${escapeHtml(url.url)}</a></div>
                </div>
                <div class="meta-card">
                    <span class="meta-label">Scan Date</span>
                    <div class="meta-value">${date}</div>
                </div>
                <div class="meta-card">
                    <span class="meta-label">Environment</span>
                    <div class="meta-value">
                        ${scan.browserVersion ? `Chrome ${scan.browserVersion.split('/')[1]}` : 'Chromium'} | 
                        ${scan.steps?.[0]?.viewport ? `${scan.steps[0].viewport.width}x${scan.steps[0].viewport.height}` : '1280x1024'}
                    </div>
                </div>
                <div class="meta-card">
                    <span class="meta-label">Standard & Runners</span>
                    <div class="meta-value">
                        ${scan.standard || url.standard || 'WCAG22AA'} | 
                        ${scan.runners?.join(', ') || 'axe'}
                    </div>
                </div>
            </div>
        </header>

        <section>
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <h2 style="margin: 0;">Executive Summary</h2>
                ${impactCounts.critical || impactCounts.serious ? `
                <div class="impact-breakdown">
                    ${impactCounts.critical ? `<span class="impact-tag impact-critical">${impactCounts.critical} Critical</span>` : ''}
                    ${impactCounts.serious ? `<span class="impact-tag impact-serious">${impactCounts.serious} Serious</span>` : ''}
                </div>
                ` : ''}
            </div>
            
            <div class="summary-grid">
                <div class="stat-card">
                    <div class="stat-value" style="color: #0f172a">${scan.score || 'N/A'}</div>
                    <div class="stat-label">Health Score</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: var(--error)">${errors}</div>
                    <div class="stat-label">Errors</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: var(--warning)">${warnings}</div>
                    <div class="stat-label">Warnings</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: var(--info)">${notices}</div>
                    <div class="stat-label">Notices</div>
                </div>
            </div>
        </section>

        <section>
            <h2>Detailed Findings</h2>
            ${(scan.steps && scan.steps.length > 0) ? 
                scan.steps.map((step, sIdx) => `
                <div class="step-section" style="margin-bottom: 2rem;">
                    <div style="display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3rem;">
                        <h3 style="font-size: 1.1rem; font-weight: 800; color: #334155; margin: 0;">
                            Step ${sIdx + 1}: ${escapeHtml(step.stepName)}
                        </h3>
                        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">
                            Score: <span style="color: #0f172a">${step.score}</span> | 
                            Issues: <span style="color: #0f172a">${step.issues?.length || 0}</span>
                        </span>
                    </div>
                    
                    ${(step.issues && step.issues.length > 0) ? 
                        step.issues.map((issue: ReportIssue) => renderIssue(issue, baseUrl)).join('') : 
                        '<div class="fix-suggestion" style="background-color: #f0fdf4; border-color: #dcfce7; color: #166534; text-align: center; font-weight: 700; padding: 0.5rem;">No accessibility issues found! 🎉</div>'
                    }
                </div>
                `).join('')
                : 
                (allIssues.length > 0 ? 
                    allIssues.map((issue: ReportIssue) => renderIssue(issue, baseUrl)).join('') :
                    '<div class="fix-suggestion" style="text-align: center; font-weight: 700; padding: 0.5rem;">No accessibility issues were found.</div>'
                )
            }
        </section>

        <div class="footer">
            Generated by Pa11y Dashboard NextGen v0.3.0 <br>
            <span style="font-weight: 400; opacity: 0.8;">Automated tools detect ~40% of accessibility issues. Manual verification required.</span>
        </div>
    </div>
</body>
</html>
    `;

    return html;
}

function renderIssue(issue: ReportIssue, baseUrl: string) {
    const fix = getIssueFixSuggestion(issue.code);
    const docsUrl = getIssueDocsUrl(issue.code);
    const badgeClass = issue.type === 'error' ? 'badge-error' : issue.type === 'warning' ? 'badge-warning' : 'badge-notice';
    const impact = issue.runnerExtras?.impact;

    return `
        <div class="issue-card">
            <div class="issue-header">
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <span class="badge ${badgeClass}">${issue.type}</span>
                    ${impact ? `<span class="impact-tag ${impact === 'critical' || impact === 'serious' ? `impact-${impact}` : ''}">${impact} impact</span>` : ''}
                </div>
                <span style="font-family: monospace; font-size: 0.55rem; font-weight: 700; color: var(--text-light);">${issue.code}</span>
            </div>
            <div class="issue-body">
                <div class="issue-message">${escapeHtml(issue.message)}</div>
                
                ${issue.snippetUrl ? `
                <div class="screenshot-container">
                    <div class="screenshot-label">Visual Evidence</div>
                    <img src="${baseUrl}${issue.snippetUrl}" alt="Visual snippet of the issue" style="max-width: 100%; height: auto; display: block;">
                </div>
                ` : ''}

                <div class="code-container">
                    <div class="code-block">
                        <strong>Selector</strong>
                        ${escapeHtml(issue.selector)}
                    </div>
                    <div class="code-block">
                        <strong>Code Context</strong>
                        ${escapeHtml(issue.context || 'N/A')}
                    </div>
                </div>

                <div class="fix-suggestion">
                    <strong>Suggested Fix</strong>
                    ${fix}
                    ${docsUrl ? `<br><a href="${docsUrl}" target="_blank">Remediation Guide &rarr;</a>` : ''}
                </div>
            </div>
        </div>
    `;
}

function escapeHtml(text: string | number | null | undefined): string {
    if (text === null || text === undefined) return '';
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, (m: string) => map[m]);
}
