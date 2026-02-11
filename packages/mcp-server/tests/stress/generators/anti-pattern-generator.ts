/**
 * Anti-pattern generator for injecting known Effect-TS anti-patterns
 * Allows controlled generation of files with specific issues
 */

import { generateTypeScriptFile, CodeGenerationOptions } from './code-generator';

export interface AntiPatternConfig {
  type:
    | 'async-await'
    | 'any-type'
    | 'throw-error'
    | 'console-log'
    | 'mutable-ref'
    | 'promise-all'
    | 'callback-hell';
  count: number; // Number of times to inject this pattern
  distribution: 'uniform' | 'clustered' | 'random'; // How to distribute patterns in file
}

/**
 * Generate code with specific anti-patterns injected
 */
export function generateCodeWithAntiPatterns(
  baseOptions: CodeGenerationOptions,
  patterns: AntiPatternConfig[]
): string {
  // Estimate size of patterns to be added
  const estimatedPatternSize = patterns.reduce((sum, p) => sum + (p.count * 150), 0); // ~150 bytes per pattern

  // Reduce base size to account for patterns
  const adjustedOptions = {
    ...baseOptions,
    sizeTarget: Math.max(100, baseOptions.sizeTarget - estimatedPatternSize),
  };

  // Start with adjusted base code generation
  let code = generateTypeScriptFile(adjustedOptions);

  // Calculate where to inject patterns based on distribution
  const injectionPoints = calculateInjectionPoints(code, patterns);

  // Apply patterns in reverse order (to maintain position correctness)
  injectionPoints.sort((a, b) => b.position - a.position);

  for (const injection of injectionPoints) {
    const snippet = generatePatternSnippet(injection.pattern);
    code = code.slice(0, injection.position) + snippet + code.slice(injection.position);
  }

  // Trim to ensure we don't exceed size target
  if (code.length > baseOptions.sizeTarget) {
    code = code.slice(0, baseOptions.sizeTarget);
  }

  return code;
}

interface InjectionPoint {
  position: number;
  pattern: AntiPatternConfig;
}

/**
 * Calculate where to inject anti-patterns based on distribution strategy
 */
function calculateInjectionPoints(code: string, patterns: AntiPatternConfig[]): InjectionPoint[] {
  const points: InjectionPoint[] = [];
  const functionMatches = Array.from(code.matchAll(/^export (function|const)/gm));

  for (const pattern of patterns) {
    const positions = calculatePositions(functionMatches, pattern.count, pattern.distribution);

    for (const pos of positions) {
      points.push({
        position: pos,
        pattern,
      });
    }
  }

  return points;
}

/**
 * Calculate specific injection positions based on distribution
 */
function calculatePositions(
  functionMatches: RegExpExecArray[],
  count: number,
  distribution: string
): number[] {
  if (functionMatches.length === 0) {
    return [];
  }

  const positions: number[] = [];

  if (distribution === 'uniform') {
    // Space patterns evenly throughout functions
    const step = Math.max(1, Math.floor(functionMatches.length / count));
    for (let i = 0; i < count && i * step < functionMatches.length; i++) {
      const match = functionMatches[i * step];
      positions.push(match.index + match[0].length + 1);
    }
  } else if (distribution === 'clustered') {
    // Group patterns together at beginning
    for (let i = 0; i < count && i < functionMatches.length; i++) {
      const match = functionMatches[i];
      positions.push(match.index + match[0].length + 1);
    }
  } else if (distribution === 'random') {
    // Random distribution
    const used = new Set<number>();
    for (let i = 0; i < count; i++) {
      let idx: number;
      do {
        idx = Math.floor(Math.random() * functionMatches.length);
      } while (used.has(idx));
      used.add(idx);
      const match = functionMatches[idx];
      positions.push(match.index + match[0].length + 1);
    }
  }

  return positions;
}

/**
 * Generate code snippet for specific anti-pattern
 */
function generatePatternSnippet(pattern: AntiPatternConfig): string {
  switch (pattern.type) {
    case 'async-await':
      return generateAsyncAwaitPattern();
    case 'any-type':
      return generateAnyTypePattern();
    case 'throw-error':
      return generateThrowErrorPattern();
    case 'console-log':
      return generateConsoleLogPattern();
    case 'mutable-ref':
      return generateMutableRefPattern();
    case 'promise-all':
      return generatePromiseAllPattern();
    case 'callback-hell':
      return generateCallbackHellPattern();
    default:
      return '';
  }
}

/**
 * Async/await in Effect context (should use Effect.promise or yield*)
 */
function generateAsyncAwaitPattern(): string {
  return `
async function fetchData() {
  const result = await fetch('/api/data');
  const data = await result.json();
  return data;
}
`;
}

/**
 * Using 'any' type (should use proper types)
 */
function generateAnyTypePattern(): string {
  return `
function processData(data: any): any {
  return data.map((item: any) => ({
    id: item.id,
    value: item?.value || 0,
  }));
}
`;
}

/**
 * Throwing errors directly (should use Effect.fail)
 */
function generateThrowErrorPattern(): string {
  return `
function validate(value: unknown) {
  if (!value) {
    throw new Error('Value is required');
  }
  return value;
}
`;
}

/**
 * Using console.log (should use proper logging)
 */
function generateConsoleLogPattern(): string {
  return `
function debug() {
  console.log('Debug info');
  console.error('Error occurred');
  console.warn('Warning message');
}
`;
}

/**
 * Mutable references (should use immutable patterns)
 */
function generateMutableRefPattern(): string {
  return `
let globalState = 0;
let cache: Record<string, unknown> = {};

function update(value: number) {
  globalState = value;
  cache[String(value)] = value * 2;
  return globalState;
}
`;
}

/**
 * Using Promise.all (should use Effect.all)
 */
function generatePromiseAllPattern(): string {
  return `
async function fetchMultiple() {
  const promises = [
    fetch('/api/1').then(r => r.json()),
    fetch('/api/2').then(r => r.json()),
    fetch('/api/3').then(r => r.json()),
  ];
  const results = await Promise.all(promises);
  return results;
}
`;
}

/**
 * Callback-based async (should use Effects)
 */
function generateCallbackHellPattern(): string {
  return `
function loadData(callback: (err: Error | null, data?: unknown) => void) {
  fetch('/api/1')
    .then(r1 => {
      fetch('/api/2')
        .then(r2 => {
          fetch('/api/3')
            .then(r3 => {
              callback(null, [r1, r2, r3]);
            })
            .catch(e => callback(e));
        })
        .catch(e => callback(e));
    })
    .catch(e => callback(e));
}
`;
}

/**
 * Presets for common test scenarios
 */
export const PATTERN_PRESETS = {
  /**
   * Files with many anti-patterns (realistic worst case)
   */
  heavilyFlawed: (): AntiPatternConfig[] => [
    { type: 'async-await', count: 5, distribution: 'uniform' },
    { type: 'any-type', count: 8, distribution: 'uniform' },
    { type: 'throw-error', count: 3, distribution: 'clustered' },
    { type: 'console-log', count: 4, distribution: 'random' },
  ],

  /**
   * Files with moderate issues
   */
  moderate: (): AntiPatternConfig[] => [
    { type: 'any-type', count: 3, distribution: 'uniform' },
    { type: 'async-await', count: 2, distribution: 'uniform' },
    { type: 'console-log', count: 1, distribution: 'random' },
  ],

  /**
   * Files with just a few issues
   */
  minimal: (): AntiPatternConfig[] => [{ type: 'any-type', count: 1, distribution: 'random' }],

  /**
   * Files focused on specific pattern
   */
  asyncAwaitHeavy: (): AntiPatternConfig[] => [
    { type: 'async-await', count: 10, distribution: 'uniform' },
  ],

  anyTypeHeavy: (): AntiPatternConfig[] => [
    { type: 'any-type', count: 15, distribution: 'uniform' },
  ],

  mixed: (): AntiPatternConfig[] => [
    { type: 'async-await', count: 3, distribution: 'uniform' },
    { type: 'any-type', count: 5, distribution: 'uniform' },
    { type: 'throw-error', count: 2, distribution: 'clustered' },
    { type: 'console-log', count: 2, distribution: 'random' },
    { type: 'mutable-ref', count: 1, distribution: 'random' },
    { type: 'promise-all', count: 1, distribution: 'random' },
  ],
};

/**
 * Generate file with preset anti-pattern configuration
 */
export function generateFlawedCodeFile(
  baseOptions: CodeGenerationOptions,
  preset: 'heavilyFlawed' | 'moderate' | 'minimal' | 'asyncAwaitHeavy' | 'anyTypeHeavy' | 'mixed'
): string {
  const patterns = PATTERN_PRESETS[preset]();
  return generateCodeWithAntiPatterns(baseOptions, patterns);
}

/**
 * Count expected findings based on anti-patterns
 * Used to validate test results
 */
export function countExpectedFindings(patterns: AntiPatternConfig[]): number {
  // Rough estimate: each pattern type generates 1-3 findings per instance
  let total = 0;
  for (const pattern of patterns) {
    const findingsPerInstance = {
      'async-await': 2,
      'any-type': 1,
      'throw-error': 1,
      'console-log': 1,
      'mutable-ref': 1,
      'promise-all': 1,
      'callback-hell': 2,
    };
    total += pattern.count * (findingsPerInstance[pattern.type] || 1);
  }
  return Math.min(total, 3); // Endpoint returns the top 3 findings
}
