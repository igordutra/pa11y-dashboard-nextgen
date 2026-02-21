/**
 * Generates a documentation URL for an accessibility issue code.
 *
 * HTMLCS codes follow the pattern:
 *   WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail
 *   → technique "G18" → https://www.w3.org/TR/WCAG20-TECHS/G18.html
 *
 * Axe rule IDs:
 *   color-contrast, image-alt, etc.
 *   → https://dequeuniversity.com/rules/axe/4.10/<rule-id>
 */

/**
 * Returns a URL to documentation explaining how to fix the given issue,
 * or null if the code format is unrecognised.
 */
export function getIssueDocsUrl(code: string): string | null {
    if (!code) return null;

    // HTMLCS format: WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail
    // The technique code (e.g. G18, H37, F65) is a segment matching [A-Z]+[0-9]+
    // It may or may not be the last segment (often followed by .Fail, .BgImage, etc.)
    if (code.startsWith('WCAG2')) {
        const segments = code.split('.');
        // Search from the end for a technique code segment
        for (let i = segments.length - 1; i >= 0; i--) {
            if (/^[A-Z]+\d+$/.test(segments[i])) {
                return `https://www.w3.org/TR/WCAG20-TECHS/${segments[i]}.html`;
            }
        }
    }

    // Axe rule IDs are lowercase-with-hyphens (e.g. color-contrast, image-alt)
    if (/^[a-z][a-z0-9-]+$/.test(code)) {
        return `https://dequeuniversity.com/rules/axe/4.10/${code}`;
    }

    return null;
}
