import { Scan, Url, Issue } from '../types';
import { getIssueDocsUrl } from './issueDocsUrl';
import { getIssueFixSuggestion } from './issueFixes';

/**
 * Generates a self-contained HTML accessibility report based on WCAG-EM Report Tool template.
 */
export function generateHtmlReport(url: Url, scan: Scan): string {
    const date = new Date(scan.timestamp).toLocaleString();
    const apiUrl = import.meta.env.VITE_API_URL || '';
    
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
        * { box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            margin: 0;
            padding: 0;
            background-color: #fff;
        }

        .container {
            width: 100%;
            max-width: 1000px;
            margin: 0 auto;
            padding: 2rem;
        }

        header {
            padding-bottom: 2rem;
            margin-bottom: 3rem;
            border-bottom: 1px solid #e2e8f0;
        }

        h1 { 
            margin: 0 0 1.5rem 0; 
            font-size: 2.25rem; 
            font-weight: 800; 
            letter-spacing: -0.025em;
            color: #0f172a;
        }

        h2 { 
            margin: 3rem 0 1.5rem; 
            font-size: 1.5rem; 
            font-weight: 700;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        h2::before {
            content: '';
            display: block;
            width: 4px;
            height: 1.5rem;
            background-color: #3b82f6;
            border-radius: 99px;
        }

        .meta {
            display: grid;
            grid-template-cols: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            padding: 1.5rem;
            background-color: #f8fafc;
            border: 1px solid #f1f5f9;
            border-radius: 1rem;
            font-size: 0.9rem;
        }

        .meta-item strong {
            display: block;
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #94a3b8;
            margin-bottom: 0.25rem;
        }

        .stats {
            display: flex;
            gap: 1rem;
            margin: 2.5rem 0;
            width: 100%;
        }

        .stat-card {
            flex: 1;
            padding: 1.25rem;
            background-color: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 1rem;
            text-align: center;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .stat-value { 
            font-size: 2rem; 
            font-weight: 900; 
            line-height: 1;
            margin-bottom: 0.5rem;
        }

        .stat-label { 
            font-size: 0.65rem; 
            font-weight: 800;
            color: #64748b; 
            text-transform: uppercase; 
            letter-spacing: 0.1em;
        }

        .issue-card {
            border: 1px solid #e2e8f0;
            border-radius: 1.25rem;
            margin-bottom: 2rem;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .issue-header {
            padding: 1.25rem 1.5rem;
            background-color: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
        }

        .badge {
            font-size: 0.65rem;
            font-weight: 900;
            padding: 0.25rem 0.75rem;
            border-radius: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .badge-error { background-color: #ef4444; color: #fff; }
        .badge-warning { background-color: #f59e0b; color: #fff; }
        .badge-notice { background-color: #3b82f6; color: #fff; }

        .issue-body { padding: 1.5rem; }
        .issue-message { font-size: 1.1rem; font-weight: 700; margin: 0 0 1.5rem 0; color: #0f172a; }
        
        .code-block {
            background-color: #f8fafc;
            padding: 1.25rem;
            border-radius: 0.75rem;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 0.8rem;
            overflow-x: auto;
            margin: 1rem 0;
            border: 1px solid #e2e8f0;
            color: #334155;
        }

        .code-block strong {
            display: block;
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #94a3b8;
            margin-bottom: 0.5rem;
        }

        .fix-suggestion {
            margin-top: 1.5rem;
            padding: 1.25rem;
            background-color: #f0fdf4;
            border: 1px solid #dcfce7;
            border-radius: 1rem;
            font-size: 0.95rem;
            color: #166534;
        }

        .fix-suggestion strong { 
            display: block;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #15803d;
            margin-bottom: 0.5rem;
        }

        .fix-suggestion a {
            display: inline-block;
            margin-top: 0.75rem;
            font-weight: 700;
            color: #166534;
            text-decoration: none;
            font-size: 0.85rem;
            border-bottom: 2px solid #bbf7d0;
        }

        .screenshot-container {
            margin: 1.5rem 0;
            border: 1px solid #e2e8f0;
            border-radius: 1rem;
            overflow: hidden;
            background-color: #f8fafc;
        }

        .footer {
            margin-top: 6rem;
            padding: 2rem 0;
            border-top: 1px solid #e2e8f0;
            font-size: 0.8rem;
            color: #94a3b8;
            text-align: center;
            font-weight: 600;
        }

        @media print {
            .container { width: 100%; padding: 0; }
            .issue-card { page-break-inside: avoid; }
        }

        @media (max-width: 600px) {
            .stats { flex-wrap: wrap; }
            .stat-card { flex: 1 1 40%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Accessibility Report</h1>
            <div class="meta">
                <div class="meta-item"><strong>Target</strong> ${url.name || url.url}</div>
                <div class="meta-item"><strong>URL</strong> <a href="${url.url}" style="color: #3b82f6; text-decoration: none;">${url.url}</a></div>
                <div class="meta-item"><strong>Date</strong> ${date}</div>
                <div class="meta-item"><strong>Standard</strong> ${url.standard || 'WCAG2AA'}</div>
            </div>
        </header>

        <section>
            <h2>Executive Summary</h2>
            <p style="color: #64748b; font-size: 1rem; margin-bottom: 2rem;">Automated accessibility audit results for <strong>${url.url}</strong>.</p>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-value" style="color: #0f172a">${scan.score || 'N/A'}</div>
                    <div class="stat-label">Overall Score</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #ef4444">${errors}</div>
                    <div class="stat-label">Errors</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #f59e0b">${warnings}</div>
                    <div class="stat-label">Warnings</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #3b82f6">${notices}</div>
                    <div class="stat-label">Notices</div>
                </div>
            </div>
        </section>

        <section>
            <h2 style="margin-top: 4rem;">Detailed Findings</h2>
            ${(scan.steps && scan.steps.length > 0) ? 
                scan.steps.map((step, sIdx) => `
                <div class="step-section" style="margin-bottom: 4rem;">
                    <h3 style="font-size: 1.25rem; font-weight: 800; color: #334155; margin-bottom: 1rem; padding-left: 1rem; border-left: 4px solid #e2e8f0;">
                        Step ${sIdx + 1}: ${step.stepName}
                    </h3>
                    <div style="margin-bottom: 2rem; font-size: 0.9rem; color: #64748b; font-weight: 600;">
                        Score: <span style="color: #0f172a">${step.score}</span> | 
                        Issues: <span style="color: #0f172a">${step.issues?.length || 0}</span>
                    </div>
                    
                    ${(step.issues && step.issues.length > 0) ? 
                        step.issues.map((issue: Issue) => renderIssue(issue)).join('') : 
                        '<div class="fix-suggestion" style="background-color: #f0fdf4; border-color: #dcfce7; color: #166534;">No accessibility issues found in this step! 🎉</div>'
                    }
                </div>
                `).join('')
                : 
                (allIssues.length > 0 ? 
                    allIssues.map((issue: Issue) => renderIssue(issue)).join('') :
                    '<div class="fix-suggestion">No accessibility issues were found during this scan.</div>'
                )
            }
        </section>

        <div class="footer">
            Report generated by Pa11y Dashboard NextGen. <br>
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
                    <span style="font-family: monospace; font-size: 0.75rem; font-weight: 700; color: #64748b;">${issue.code}</span>
                </div>
                <div class="issue-body">
                    <div class="issue-message">${issue.message}</div>
                    
                    ${issue.snippetUrl ? `
                    <div class="screenshot-container">
                        <div style="padding: 0.75rem 1rem; font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; font-weight: 800; letter-spacing: 0.1em; border-bottom: 1px solid #f1f5f9; background-color: #fff;">
                            Visual Snippet
                        </div>
                        <img src="${apiUrl}${issue.snippetUrl}" alt="Visual snippet of the issue" style="max-width: 100%; height: auto; display: block;">
                    </div>
                    ` : ''}

                    <div class="code-block">
                        <strong>Selector</strong>
                        ${escapeHtml(issue.selector)}
                    </div>
                    
                    ${issue.context ? `
                    <div class="code-block">
                        <strong>Context</strong>
                        ${escapeHtml(issue.context)}
                    </div>
                    ` : ''}

                    <div class="fix-suggestion">
                        <strong>Remediation Guide</strong>
                        ${fix}
                        ${docsUrl ? `<br><a href="${docsUrl}" target="_blank">Documentation &rarr;</a>` : ''}
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
