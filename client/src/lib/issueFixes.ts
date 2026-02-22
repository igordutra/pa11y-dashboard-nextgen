/**
 * Provides human-readable fix suggestions for common accessibility issue codes.
 */
export function getIssueFixSuggestion(code: string, context?: string): string {
    if (!code) return "Review the issue details and follow WCAG guidelines for remediation.";

    // Axe Rules
    const axeFixes: Record<string, string> = {
        'aria-prohibited-attr': "This element does not support the ARIA attribute used. Remove the prohibited attribute or change the element's role to one that supports it.",
        'color-contrast': "Increase the contrast ratio between the text and its background to at least 4.5:1 (or 3:1 for large text).",
        'image-alt': "Add a meaningful 'alt' attribute to the <img> element that describes the image's purpose.",
        'label': "Ensure this form field has a programmatically associated <label> using 'for' and 'id' attributes.",
        'button-name': "Ensure the button has a discernible name (text content or aria-label) so screen readers can announce its purpose.",
        'link-name': "Ensure the link has discernible text content so users know where it leads.",
        'empty-heading': "Headings must have text content to be useful for navigation.",
        'html-has-lang': "Add a 'lang' attribute to the <html> element (e.g., <html lang="en">).",
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

    // HTMLCS / WCAG Techniques
    if (code.includes('G18') || code.includes('1_4_3')) {
        return "Ensure the contrast ratio between text and background is at least 4.5:1.";
    }
    if (code.includes('H37') || code.includes('1_1_1')) {
        return "Provide a text alternative for non-text content using the 'alt' attribute.";
    }
    if (code.includes('H44') || code.includes('1_3_1')) {
        return "Associate labels with form controls using the 'for' and 'id' attributes.";
    }

    return "Review the element's implementation and ensure it meets the relevant WCAG success criteria.";
}
