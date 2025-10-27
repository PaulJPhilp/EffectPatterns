/**
 * Code Snippet Template Generation
 *
 * Deterministic snippet generation with support for different module
 * types and Effect versions. All generation is pure functions - no
 * code evaluation or execution.
 */
import type { ModuleType } from './schemas/generate.js';
import type { Pattern } from './schemas/pattern.js';
/**
 * Sanitize user input to prevent template injection
 *
 * @param input - Raw user input
 * @returns Sanitized string safe for template usage
 */
export declare function sanitizeInput(input: string): string;
/**
 * Parameters for building a code snippet
 */
export interface BuildSnippetParams {
    /** Pattern to generate snippet from */
    pattern: Pattern;
    /** Optional custom name for the example function/const */
    customName?: string;
    /** Optional custom input value */
    customInput?: string;
    /** Module type (default: 'esm') */
    moduleType?: ModuleType;
    /** Optional Effect version to include in comment */
    effectVersion?: string;
}
/**
 * Build a code snippet from a pattern
 *
 * Generates deterministic, sanitized code snippets based on pattern
 * examples. Supports module type variations and Effect version
 * comments.
 *
 * @param params - Snippet generation parameters
 * @returns Generated code snippet
 * @example
 * ```typescript
 * const snippet = buildSnippet({
 *   pattern: myPattern,
 *   customName: "retryRequest",
 *   moduleType: "esm"
 * })
 * ```
 */
export declare function buildSnippet(params: BuildSnippetParams): string;
/**
 * Generate a minimal usage example for a pattern
 *
 * @param pattern - Pattern to generate example for
 * @returns Simple usage example code
 */
export declare function generateUsageExample(pattern: Pattern): string;
//# sourceMappingURL=template.d.ts.map