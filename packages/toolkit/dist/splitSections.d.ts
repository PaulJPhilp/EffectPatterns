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
export declare function splitSections(content: string): string[];
//# sourceMappingURL=splitSections.d.ts.map