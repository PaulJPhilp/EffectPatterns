/**
 * Core TypeScript code generator for stress testing
 * Generates realistic code with controllable size and complexity
 */

export interface CodeGenerationOptions {
  sizeTarget: number; // Target file size in bytes
  functionCount: number; // Number of functions to generate
  nestingDepth: number; // Max Effect.gen nesting depth
  issueCount: number; // Number of anti-patterns to inject
  complexity: 'simple' | 'moderate' | 'complex';
  seed?: number; // Reproducibility seed
}

/**
 * Simple PRNG for reproducible randomness
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number = Math.random() * 2147483647) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  range(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}

/**
 * Generate TypeScript code with realistic structure
 */
export function generateTypeScriptFile(options: CodeGenerationOptions): string {
  const rng = new SeededRandom(options.seed);
  let code = generateHeader();

  // Adjust function count to reach target size
  let currentSize = code.length;
  let functionCount = options.functionCount;

  // Estimate: each function is roughly 150-300 bytes
  const avgFunctionSize = 200;
  if (currentSize < options.sizeTarget) {
    const remaining = options.sizeTarget - currentSize;
    functionCount = Math.max(options.functionCount, Math.ceil(remaining / avgFunctionSize));
  }

  // Generate functions
  for (let i = 0; i < functionCount; i++) {
    code += generateFunction(i, options.complexity, rng);

    // Check if we've exceeded target size
    if (code.length > options.sizeTarget * 1.1) {
      break;
    }
  }

  // Trim if oversized
  if (code.length > options.sizeTarget) {
    code = code.slice(0, options.sizeTarget);
  }

  // Ensure we reach target size with comments if needed
  if (code.length < options.sizeTarget) {
    const paddingNeeded = options.sizeTarget - code.length;
    code += generatePaddingComments(paddingNeeded);
  }

  // Final trim to ensure we don't exceed target
  if (code.length > options.sizeTarget) {
    code = code.slice(0, options.sizeTarget);
  }

  return code;
}

/**
 * Generate file header with imports
 */
function generateHeader(): string {
  return `import { Effect } from "effect";
import type { Effect as EffectType } from "effect";

/**
 * Auto-generated stress test code
 * Generated for testing purposes
 */

`;
}

/**
 * Generate a single function
 */
function generateFunction(index: number, complexity: string, rng: SeededRandom): string {
  const name = `function_${index}`;
  let code = '';

  if (complexity === 'simple') {
    code = generateSimpleFunction(name, index, rng);
  } else if (complexity === 'moderate') {
    code = generateModerateFunction(name, index, rng);
  } else {
    code = generateComplexFunction(name, index, rng);
  }

  return code + '\n\n';
}

/**
 * Generate simple function
 */
function generateSimpleFunction(name: string, index: number, rng: SeededRandom): string {
  const functionTypes = [
    `export function ${name}() {
  const x = ${rng.range(1, 100)};
  const y = ${rng.range(1, 100)};
  return x + y;
}`,

    `export const ${name} = () => {
  return {
    id: ${index},
    timestamp: Date.now(),
    value: Math.random(),
  };
};`,

    `export function ${name}(input: unknown): unknown {
  if (!input) return null;
  return JSON.stringify(input);
}`,

    `export async function ${name}() {
  const response = await fetch('https://api.example.com/${index}');
  return response.json();
}`,

    `export function ${name}(data: any[]) {
  return data.map(item => item.id).filter(id => id > 0);
}`,
  ];

  return rng.choice(functionTypes);
}

/**
 * Generate moderate complexity function
 */
function generateModerateFunction(name: string, index: number, rng: SeededRandom): string {
  const controlFlow = rng.choice(['if', 'switch', 'try-catch']);
  const hasEffect = rng.next() > 0.3;

  let code = `export function ${name}(config: any) {
  ${controlFlow === 'if' ? generateIfBlock(rng) : ''}
  ${controlFlow === 'switch' ? generateSwitchBlock(rng) : ''}
  ${controlFlow === 'try-catch' ? generateTryCatchBlock(rng) : ''}
  return { success: true, data: null };
}`;

  if (hasEffect) {
    code = `export const ${name}Effect = Effect.gen(function* () {
  const data = yield* Effect.promise(() => Promise.resolve(${index}));
  const result = data * 2;
  return { id: ${index}, value: result };
});`;
  }

  return code;
}

/**
 * Generate complex function with nesting
 */
function generateComplexFunction(name: string, index: number, rng: SeededRandom): string {
  const nestingLevel = rng.range(2, 4);
  let code = `export const ${name}Effect = Effect.gen(function* () {
`;

  for (let i = 0; i < nestingLevel; i++) {
    code += `  ${'  '.repeat(i)}const level${i} = yield* Effect.gen(function* () {
`;
  }

  code += `  ${'  '.repeat(nestingLevel)}return ${index} * ${nestingLevel};
`;

  for (let i = nestingLevel - 1; i >= 0; i--) {
    code += `  ${'  '.repeat(i)}});
`;
  }

  code += `  return level0;
});`;

  return code;
}

/**
 * Generate if/else block
 */
function generateIfBlock(rng: SeededRandom): string {
  const condition = rng.choice([
    'typeof input === "string"',
    'Array.isArray(input)',
    'input !== null',
    'input?.id',
  ]);

  return `if (${condition}) {
    return { status: "ok", result: true };
  } else if (input?.error) {
    return { status: "error", message: input.error };
  }`;
}

/**
 * Generate switch block
 */
function generateSwitchBlock(_rng: SeededRandom): string {
  return `switch (config?.mode) {
    case "strict":
      return { mode: "strict", level: 1 };
    case "normal":
      return { mode: "normal", level: 2 };
    case "relaxed":
      return { mode: "relaxed", level: 3 };
    default:
      return { mode: "unknown", level: 0 };
  }`;
}

/**
 * Generate try-catch block
 */
function generateTryCatchBlock(_rng: SeededRandom): string {
  return `try {
    const result = JSON.parse(config?.json || "{}");
    return { success: true, data: result };
  } catch (err) {
    console.error("Parse error:", err);
    return { success: false, error: "Invalid JSON" };
  }`;
}

/**
 * Generate padding comments to reach target size
 */
function generatePaddingComments(sizeNeeded: number): string {
  let padding = '';

  // Use comment blocks to efficiently add size
  const commentBlockSize = 50; // Roughly size of a comment block
  const blocksNeeded = Math.ceil(sizeNeeded / commentBlockSize);

  for (let i = 0; i < blocksNeeded; i++) {
    padding += `// Padding comment ${i} to reach target file size\n`;
  }

  return padding;
}

/**
 * Validate generated code is valid TypeScript syntax
 */
export function validateGeneratedCode(code: string): { valid: boolean; error?: string } {
  try {
    // Basic validation - just check it's not empty and has expected imports
    if (!code || code.length === 0) {
      return { valid: false, error: 'Generated code is empty' };
    }

    if (!code.includes('import') && !code.includes('export')) {
      return { valid: false, error: 'Generated code missing imports/exports' };
    }

    // Check for basic syntax issues
    if ((code.match(/{/g)?.length || 0) !== (code.match(/}/g)?.length || 0)) {
      return { valid: false, error: 'Mismatched braces' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: String(error) };
  }
}

/**
 * Generate code with controlled anti-patterns
 * Used by anti-pattern-generator.ts to inject specific issues
 */
export function generateCodeWithPatterns(
  functionCount: number,
  patterns: { type: string; position: number }[]
): string {
  let code = generateHeader();

  for (let i = 0; i < functionCount; i++) {
    const pattern = patterns.find((p) => p.position === i);
    code += generateFunctionWithPattern(i, pattern?.type);
  }

  return code;
}

/**
 * Generate a function, optionally with a specific anti-pattern
 */
function generateFunctionWithPattern(index: number, pattern?: string): string {
  const name = `func_${index}`;

  if (pattern === 'async-await') {
    return `export async function ${name}() {
  const result = await fetch('/api/${index}');
  return result.json();
}\n\n`;
  }

  if (pattern === 'any-type') {
    return `export function ${name}(data: any): any {
  return data.map((x: any) => x.id);
}\n\n`;
  }

  if (pattern === 'throw-error') {
    return `export function ${name}() {
  throw new Error('Error in ${name}');
}\n\n`;
  }

  if (pattern === 'console-log') {
    return `export function ${name}() {
  console.log('Debug info');
  return { value: 42 };
}\n\n`;
  }

  if (pattern === 'mutable-ref') {
    return `let state = 0;
export function ${name}() {
  state++;
  return state;
}\n\n`;
  }

  // Default: clean function
  return `export function ${name}() {
  return { id: ${index} };
}\n\n`;
}

/**
 * Helper: Create options for specific test scenarios
 */
export const PRESET_CONFIGS = {
  // Edge cases and boundaries
  empty: (): CodeGenerationOptions => ({
    sizeTarget: 0,
    functionCount: 0,
    nestingDepth: 0,
    issueCount: 0,
    complexity: 'simple',
  }),

  minimal: (): CodeGenerationOptions => ({
    sizeTarget: 100,
    functionCount: 1,
    nestingDepth: 1,
    issueCount: 0,
    complexity: 'simple',
  }),

  small: (): CodeGenerationOptions => ({
    sizeTarget: 5000, // 5KB
    functionCount: 10,
    nestingDepth: 2,
    issueCount: 2,
    complexity: 'simple',
  }),

  medium: (): CodeGenerationOptions => ({
    sizeTarget: 25000, // 25KB
    functionCount: 50,
    nestingDepth: 3,
    issueCount: 5,
    complexity: 'moderate',
  }),

  large: (): CodeGenerationOptions => ({
    sizeTarget: 90000, // 90KB (near limit)
    functionCount: 150,
    nestingDepth: 4,
    issueCount: 15,
    complexity: 'complex',
  }),

  nearLimit: (): CodeGenerationOptions => ({
    sizeTarget: 98000, // 98KB (at limit)
    functionCount: 200,
    nestingDepth: 5,
    issueCount: 20,
    complexity: 'complex',
  }),

  overLimit: (): CodeGenerationOptions => ({
    sizeTarget: 101000, // 101KB (over limit)
    functionCount: 250,
    nestingDepth: 5,
    issueCount: 25,
    complexity: 'complex',
  }),
};
