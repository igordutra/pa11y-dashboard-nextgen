import { Scan, Url, Issue } from '../types';
import { getIssueDocsUrl } from './issueDocsUrl';
import { getIssueFixSuggestion } from './issueFixes';

/**
 * Generates a self-contained HTML accessibility report based on WCAG-EM Report Tool template.
 */
export function generateHtmlReport(url: Url, scan: Scan): string {
    const date = new Date(scan.timestamp).toLocaleString();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    // Calculate stats across all steps if available, or just from the main issues list
    const allIssues = scan.steps && scan.steps.length > 0 
        ? scan.steps.flatMap(s => s.issues || []) 
        : (scan.issues || []);
        
    const errors = allIssues.filter(i => i.type === 'error').length;
    const warnings = allIssues.filter(i => i.type === 'warning').length;
    const notices = allIssues.filter(i => i.type === 'notice').length;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Report: ${url.name || url.url}</title>
    <style>
        :root {
            --primary: #0f172a;
            --primary-foreground: #f8fafc;
            --secondary: #f1f5f9;
            --secondary-foreground: #0f172a;
            --muted: #f1f5f9;
            --muted-foreground: #64748b;
            --accent: #f1f5f9;
            --accent-foreground: #0f172a;
            --destructive: #ef4444;
            --destructive-foreground: #f8fafc;
            --border: #e2e8f0;
            --input: #e2e8f0;
            --ring: #0f172a;
            --radius: 0.5rem;
            --success: #15803d;
            --warning: #a16207;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.5;
            color: var(--primary);
            margin: 0;
            padding: 0;
            background-color: #fff;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 2rem;
        }

        header {
            border-bottom: 2px solid var(--border);
            padding-bottom: 1rem;
            margin-bottom: 2rem;
        }

        h1 { margin: 0; font-size: 1.875rem; }
        h2 { margin: 2rem 0 1rem; font-size: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
        h3 { margin: 1.5rem 0 1rem; font-size: 1.25rem; }

        .meta {
            display: grid;
            grid-template-cols: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
            font-size: 0.875rem;
            color: var(--muted-foreground);
        }

        .stats {
            display: grid;
            grid-template-cols: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin: 2rem 0;
        }

        .stat-card {
            padding: 1rem;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            text-align: center;
        }

        .stat-value { font-size: 1.5rem; font-weight: bold; }
        .stat-label { font-size: 0.75rem; color: var(--muted-foreground); text-transform: uppercase; }

        .issue-card {
            border: 1px solid var(--border);
            border-radius: var(--radius);
            margin-bottom: 1.5rem;
            overflow: hidden;
        }

        .issue-header {
            padding: 0.75rem 1rem;
            background-color: var(--secondary);
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .badge {
            font-size: 0.75rem;
            font-weight: bold;
            padding: 0.125rem 0.5rem;
            border-radius: 9999px;
            text-transform: uppercase;
        }

        .badge-error { background-color: var(--destructive); color: var(--destructive-foreground); }
        .badge-warning { background-color: var(--warning); color: #fff; }
        .badge-notice { background-color: #3b82f6; color: #fff; }
        .badge-score { background-color: var(--primary); color: var(--primary-foreground); }

        .issue-body { padding: 1rem; }
        .issue-code { font-family: monospace; font-size: 0.75rem; color: var(--muted-foreground); }
        .issue-message { font-weight: 500; margin: 0.5rem 0; }
        
        .code-block {
            background-color: var(--muted);
            padding: 0.75rem;
            border-radius: 0.25rem;
            font-family: monospace;
            font-size: 0.8125rem;
            overflow-x: auto;
            margin: 0.5rem 0;
            border: 1px solid var(--border);
        }

        .fix-suggestion {
            margin-top: 1rem;
            padding: 0.75rem;
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 0.25rem;
            font-size: 0.875rem;
        }

        .fix-suggestion strong { color: #166534; }

        .screenshot-container {
            margin: 1rem 0;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            overflow: hidden;
        }

        .screenshot-img { width: 100%; height: auto; display: block; }

        .footer {
            margin-top: 4rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border);
            font-size: 0.75rem;
            color: var(--muted-foreground);
            text-align: center;
        }

        @media print {
            .container { width: 100%; padding: 0; }
            .issue-card { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Accessibility Evaluation Report</h1>
            <div class="meta">
                <div><strong>Target:</strong> ${url.name || url.url}</div>
                <div><strong>URL:</strong> <a href="${url.url}">${url.url}</a></div>
                <div><strong>Date:</strong> ${date}</div>
                <div><strong>Standard:</strong> ${url.standard || 'WCAG2AA'}</div>
            </div>
        </header>

        <section>
            <h2>Executive Summary</h2>
            <p>This report documents the accessibility audit results for <strong>${url.url}</strong>. The audit was performed using automated tools (Pa11y and Axe-core) to identify barriers for users with disabilities.</p>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-value">${scan.score || 'N/A'}</div>
                    <div class="stat-label">Overall Score</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: var(--destructive)">${errors}</div>
                    <div class="stat-label">Errors</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: var(--warning)">${warnings}</div>
                    <div class="stat-label">Warnings</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #3b82f6">${notices}</div>
                    <div class="stat-label">Notices</div>
                </div>
            </div>
        </section>

        <section>
            <h2>Detailed Findings</h2>
            ${(scan.steps && scan.steps.length > 0) ? 
                scan.steps.map((step, sIdx) => `
                <div class="step-section">
                    <h3>Step ${sIdx + 1}: ${step.stepName}</h3>
                    <p>Accessibility Score for this step: <strong>${step.score}</strong> | Issues: <strong>${step.issues?.length || 0}</strong></p>
                    ${step.screenshot ? `
                        <div class="screenshot-container">
                            <img src="${apiUrl}${step.screenshot}" alt="Screenshot of ${step.stepName}" class="screenshot-img">
                        </div>
                    ` : ''}
                    
                    ${(step.issues && step.issues.length > 0) ? 
                        step.issues.map((issue: Issue) => renderIssue(issue)).join('') : 
                        '<p class="fix-suggestion" style="background-color: #f0fdf4; border-color: #bbf7d0; color: #166534;">No accessibility issues found in this step! 🎉</p>'
                    }
                </div>
                `).join('')
                : 
                (allIssues.length > 0 ? 
                    allIssues.map((issue: Issue) => renderIssue(issue)).join('') :
                    '<p class="fix-suggestion">No accessibility issues were found during this scan.</p>'
                )
            }
        </section>

        <div class="footer">
            Report generated by Pa11y Dashboard NextGen. 
            All audits are automated and may not capture all accessibility barriers. 
            Manual testing is recommended for full compliance.
        </div>
    </div>
</body>
</html>
    `;

    function renderIssue(issue: Issue) {
        const fix = getIssueFixSuggestion(issue.code);
        const docsUrl = getIssueDocsUrl(issue.code);
        const badgeClass = issue.type === 'error' ? 'badge-error' : issue.type === 'warning' ? 'badge-warning' : 'badge-notice';

        return `
            <div class="issue-card">
                <div class="issue-header">
                    <span class="badge ${badgeClass}">${issue.type}</span>
                    <span class="issue-code">${issue.code}</span>
                </div>
                <div class="issue-body">
                    <div class="issue-message">${issue.message}</div>
                    
                    <div class="code-block">
                        <strong>Selector:</strong> ${escapeHtml(issue.selector)}
                    </div>
                    
                    ${issue.context ? `
                    <div class="code-block">
                        <strong>Context:</strong><br>
                        ${escapeHtml(issue.context)}
                    </div>
                    ` : ''}

                    <div class="fix-suggestion">
                        <strong>How to fix:</strong> ${fix}
                        ${docsUrl ? `<br><small><a href="${docsUrl}" target="_blank">View Documentation &rarr;</a></small>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    function escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    return html;
}
