/**
 * Split markdown-like content into sections keyed by '##' headings.
 *
 * Behavior:
 * - Splits on "\n##" boundaries.
 * - Trims whitespace from each resulting section.
 * - Filters out empty sections produced by consecutive separators or empty input.
 *
 * Examples:
 * splitSections('# Title\n## One\ncontent\n## Two')
 * => ['# Title', 'One\ncontent', 'Two']
 */
export function splitSections(content) {
    if (!content || typeof content !== 'string')
        return [];
    // Normalize newlines to \n to handle CRLF and other newline styles
    const normalized = content.replace(/\r\n?/g, '\n');
    // Split on a newline followed by optional whitespace and a markdown heading
    // that starts with at least two hashes (##), or any heading level if desired.
    // We use a lookahead split: split at the boundary before a newline+hashes sequence.
    // Pattern explanation: (?:\n)(?=\s*#{1,6}\s)
    // This will split at newlines that precede headings like '\n##', '\n###', etc.
    const parts = normalized.split(/(?:\n)(?=\s*#{1,6}\s)/);
    // Trim whitespace on each section and filter out empty results.
    return (parts
        .map((s) => s.trim())
        // Remove leading '##' (or more) heading markers from sections so that
        // '\n## One' becomes 'One'. Preserve single '#' (top-level title) if present.
        .map((s) => s.replace(/^#{2,6}\s*/, ''))
        .filter((s) => s.length > 0));
}
//# sourceMappingURL=splitSections.js.map