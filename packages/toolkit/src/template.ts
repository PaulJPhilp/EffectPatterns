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
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/[`$]/g, '') // Remove backticks and dollar signs
    .replace(/[\r\n]+/g, ' ') // Replace newlines with spaces
    .trim()
    .slice(0, 100); // Limit length
}

/**
 * Generate import statement based on module type
 *
 * @param moduleType - ESM or CJS
 * @returns Import/require statement
 */
function generateImport(moduleType: ModuleType = 'esm'): string {
  if (moduleType === 'cjs') {
    return `const { Effect, pipe } = require("effect");`;
  }
  return `import { Effect, pipe } from "effect";`;
}

/**
 * Generate export statement based on module type
 *
 * @param moduleType - ESM or CJS
 * @param name - Export name
 * @returns Export statement
 */
function generateExport(name: string, moduleType: ModuleType = 'esm'): string {
  if (moduleType === 'cjs') {
    return `module.exports = { ${name} };`;
  }
  return `export { ${name} };`;
}

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
export function buildSnippet(params: BuildSnippetParams): string {
  const {
    pattern,
    customName,
    customInput,
    moduleType = 'esm',
    effectVersion,
  } = params;

  const sanitizedName = customName ? sanitizeInput(customName) : 'example';
  const sanitizedInput = customInput ? sanitizeInput(customInput) : 'input';

  // Use first example if available
  const example = pattern.examples?.[0];

  if (!example) {
    // Generate a minimal placeholder if no example exists
    const header = [
      `// ${pattern.title}`,
      effectVersion ? `// Effect version: ${effectVersion}` : '',
      `// Pattern ID: ${pattern.id}`,
      '',
      generateImport(moduleType),
      '',
      `// ${pattern.description}`,
      '',
      `const ${sanitizedName} = Effect.succeed("${sanitizedInput}");`,
      '',
      generateExport(sanitizedName, moduleType),
    ]
      .filter(Boolean)
      .join('\n');

    return header;
  }

  // Build snippet from example with header
  const header = [
    `// ${pattern.title}`,
    effectVersion ? `// Effect version: ${effectVersion}` : '',
    `// Pattern ID: ${pattern.id}`,
    example.description ? `// ${example.description}` : '',
    '',
    generateImport(moduleType),
    '',
  ]
    .filter(Boolean)
    .join('\n');

  // Process the example code (sanitize but preserve structure)
  const processedCode = example.code
    .split('\n')
    .map((line) => {
      // Replace any template variables if present
      let processedLine = line;
      if (customName) {
        processedLine = processedLine.replace(/\bexample\b/g, sanitizedName);
      }
      if (customInput) {
        processedLine = processedLine.replace(
          /"input"/g,
          `"${sanitizedInput}"`,
        );
      }
      return processedLine;
    })
    .join('\n');

  return `${header}\n${processedCode}`;
}

/**
 * Generate a minimal usage example for a pattern
 *
 * @param pattern - Pattern to generate example for
 * @returns Simple usage example code
 */
export function generateUsageExample(pattern: Pattern): string {
  const example = pattern.examples[0];

  if (!example) {
    return `// ${pattern.title}\n// No example available`;
  }

  return [
    `// ${pattern.title}`,
    `// ${pattern.description}`,
    '',
    example.description || '',
    '',
    example.code,
  ]
    .filter(Boolean)
    .join('\n');
}
