/**
 * Code Snippet Template Generation
 *
 * Deterministic snippet generation with support for different module
 * types and Effect versions. All generation is pure functions - no
 * code evaluation or execution.
 */
import { Pattern } from "./schemas/pattern.js";
import { ModuleType } from "./schemas/generate.js";
/**
 * Sanitize user input to prevent template injection
 *
 * @param input - Raw user input
 * @returns Sanitized string safe for template usage
 */
export declare function sanitizeInput(input: string): string;
/**
 * Build a code snippet from a pattern
 *
 * Generates deterministic, sanitized code snippets based on pattern
 * examples. Supports module type variations and Effect version
 * comments.
 *
 * @param pattern - Pattern to generate snippet from
 * @param name - Optional custom name for the example
 * @param input - Optional custom input parameter
 * @param moduleType - Module type (esm or cjs)
 * @param effectVersion - Optional Effect version to include in comment
 * @returns Generated code snippet
 */
export declare function buildSnippet(pattern: Pattern, name?: string, input?: string, moduleType?: ModuleType, effectVersion?: string): string;
/**
 * Generate a minimal usage example for a pattern
 *
 * @param pattern - Pattern to generate example for
 * @returns Simple usage example code
 */
export declare function generateUsageExample(pattern: Pattern): string;
//# sourceMappingURL=template.d.ts.map