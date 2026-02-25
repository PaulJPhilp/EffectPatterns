/**
 * Complex code generator for pathological test cases
 * Generates specialized code patterns that stress-test the analyzer
 */

/**
 * Generate deeply nested code structure
 * Tests AST traversal performance and stack depth handling
 */
export function generateDeeplyNestedCode(depth: number): string {
  let code = 'export const deepEffect = Effect.gen(function* () {\n';

  for (let i = 0; i < depth; i++) {
    const indent = '  '.repeat(i + 1);
    code += `${indent}const level${i} = yield* Effect.gen(function* () {\n`;
  }

  const innerIndent = '  '.repeat(depth + 1);
  code += `${innerIndent}return { id: ${depth}, value: "deepnested" };\n`;

  for (let i = depth - 1; i >= 0; i--) {
    const indent = '  '.repeat(i + 1);
    code += `${indent}});\n`;
  }

  code += '  return level0;\n});';

  return code;
}

/**
 * Generate code with many function declarations
 * Tests parser performance with large number of declarations
 */
export function generateManyFunctions(count: number): string {
  let code = 'import { Effect } from "effect";\n\n';

  for (let i = 0; i < count; i++) {
    code += `export function func${i}() {
  return { id: ${i}, timestamp: Date.now() };
}

`;

    // Every 10th function, add an async variant
    if (i % 10 === 0) {
      code += `export async function asyncFunc${i}() {
  return { id: ${i}, async: true };
}

`;
    }
  }

  return code;
}

/**
 * Generate file with exact size
 * Useful for boundary testing
 */
export function generateLargeFile(sizeKB: number): string {
  const targetBytes = sizeKB * 1024;
  let code = 'import { Effect } from "effect";\n\n';

  // Add functions until we reach target size
  let functionId = 0;
  while (code.length < targetBytes) {
    code += `export function fn${functionId}() {
  // Function ${functionId}
  const x = ${Math.random()};
  const y = ${Math.random()};
  return x + y;
}

`;
    functionId++;
  }

  // Trim comments if oversized
  while (code.length > targetBytes * 1.05) {
    code = code.slice(0, -50);
  }

  // Pad if undersized
  while (code.length < targetBytes) {
    code += `// Padding line ${functionId++}\n`;
  }

  return code;
}

/**
 * Generate deeply nested object/type structures
 * Tests type analysis performance
 */
export function generateDeeplyNestedTypes(depth: number): string {
  let code = '';

  // Generate nested type definitions
  for (let i = 0; i < depth; i++) {
    const indent = ' '.repeat(i * 2);
    if (i === 0) {
      code += 'type DeepType = {\n';
    } else {
      code += `${indent}nested: {\n`;
    }
  }

  const lastIndent = ' '.repeat(depth * 2);
  code += `${lastIndent}value: string;\n`;

  for (let i = depth - 1; i >= 0; i--) {
    const indent = ' '.repeat(i * 2);
    code += `${indent}}${i === 0 ? ';' : ';'}\n`;
  }

  // Generate function using type
  code += `
export function deepTypeFunc(param: DeepType): unknown {
  return param;
}
`;

  return code;
}

/**
 * Generate complex Effect composition chains
 * Tests Effect-specific pattern recognition
 */
export function generateComplexEffectChains(): string {
  return `import { Effect, pipe } from "effect";

// Complex effect composition
export const complexEffect = pipe(
  Effect.sync(() => ({ value: 1 })),
  Effect.flatMap((a) =>
    pipe(
      Effect.sync(() => ({ value: a.value + 1 })),
      Effect.flatMap((b) =>
        pipe(
          Effect.sync(() => ({ value: b.value + 1 })),
          Effect.flatMap((c) =>
            pipe(
              Effect.sync(() => ({ value: c.value + 1 })),
              Effect.flatMap((d) =>
                Effect.succeed({
                  a: a.value,
                  b: b.value,
                  c: c.value,
                  d: d.value,
                })
              )
            )
          )
        )
      )
    )
  )
);

// Multiple sequential effects
export const sequentialEffects = Effect.gen(function* () {
  const r1 = yield* Effect.sync(() => 1);
  const r2 = yield* Effect.sync(() => r1 + 1);
  const r3 = yield* Effect.sync(() => r2 + 1);
  const r4 = yield* Effect.sync(() => r3 + 1);
  const r5 = yield* Effect.sync(() => r4 + 1);
  return [r1, r2, r3, r4, r5];
});

// Error handling chains
export const errorHandling = pipe(
  Effect.fail(new Error("initial error")),
  Effect.catchAll((e) =>
    pipe(
      Effect.fail(new Error("chained error")),
      Effect.catchAll((e2) =>
        pipe(
          Effect.fail(new Error("third error")),
          Effect.catchAll((e3) => Effect.succeed("recovered"))
        )
      )
    )
  )
);
`;
}

/**
 * Generate code with many string/number literals
 * Tests handling of large literal expressions
 */
export function generateManyLiterals(): string {
  let code = 'export const literals = {\n';

  // Add many string literals
  for (let i = 0; i < 100; i++) {
    code += `  str${i}: "string literal ${i}",\n`;
  }

  // Add many number literals
  for (let i = 0; i < 100; i++) {
    code += `  num${i}: ${i * Math.PI},\n`;
  }

  // Add nested arrays
  code += '  arrays: [\n';
  for (let i = 0; i < 50; i++) {
    code += `    [${i}, ${i + 1}, ${i + 2}, ${i + 3}],\n`;
  }
  code += '  ],\n';

  code += '};\n';

  return code;
}

/**
 * Generate code with many class/interface declarations
 * Tests symbol resolution performance
 */
export function generateManyClasses(count: number): string {
  let code = 'import { Effect } from "effect";\n\n';

  for (let i = 0; i < count; i++) {
    code += `export class Class${i} {
  id = ${i};
  constructor(public name: string) {}

  getValue(): unknown {
    return this.name + this.id;
  }
}

`;
  }

  return code;
}

/**
 * Generate code with maximum complexity
 * Combines multiple stress factors
 */
export function generateMaxComplexity(): string {
  let code = '';

  // 1. Imports
  code += 'import { Effect, pipe } from "effect";\n';
  code += 'import type { Effect as EffectType } from "effect";\n\n';

  // 2. Deep type nesting (5 levels)
  code += generateDeeplyNestedTypes(5);
  code += '\n';

  // 3. Many functions (50)
  code += generateManyFunctions(50);
  code += '\n';

  // 4. Complex effects
  code += generateComplexEffectChains();
  code += '\n';

  // 5. Many literals
  code += generateManyLiterals();
  code += '\n';

  // 6. Deep nesting (8 levels)
  code += generateDeeplyNestedCode(8);

  return code;
}

/**
 * Presets for specific stress test scenarios
 */
export const COMPLEX_PRESETS = {
  /**
   * Stack stress - deeply nested structures
   */
  stackStress: (): string => {
    return generateDeeplyNestedCode(15);
  },

  /**
   * Parser stress - many declarations
   */
  parserStress: (): string => {
    return generateManyFunctions(200);
  },

  /**
   * Memory stress - very large file
   */
  memoryStress: (): string => {
    return generateLargeFile(95); // 95KB (near limit)
  },

  /**
   * Type analysis stress
   */
  typeStress: (): string => {
    return generateDeeplyNestedTypes(10);
  },

  /**
   * Effect pattern stress
   */
  effectStress: (): string => {
    return generateComplexEffectChains();
  },

  /**
   * Literal analysis stress
   */
  literalStress: (): string => {
    return generateManyLiterals();
  },

  /**
   * Symbol resolution stress
   */
  symbolStress: (): string => {
    return generateManyClasses(100);
  },

  /**
   * Combined stress - all factors
   */
  maxStress: (): string => {
    return generateMaxComplexity();
  },
};

/**
 * Get preset by name
 */
export function getComplexPreset(
  preset: keyof typeof COMPLEX_PRESETS
): string {
  return COMPLEX_PRESETS[preset]();
}

/**
 * Generate code with specific characteristics
 */
export interface ComplexityProfile {
  nestingDepth: number;
  functionCount: number;
  clasCount: number;
  typeDepth: number;
  literalCount: number;
  effectChains: number;
}

export function generateWithProfile(profile: Partial<ComplexityProfile>): string {
  let code = 'import { Effect, pipe } from "effect";\n\n';

  const {
    nestingDepth = 0,
    functionCount = 0,
    clasCount = 0,
    typeDepth = 0,
    literalCount = 0,
    effectChains = 0,
  } = profile;

  if (typeDepth > 0) {
    code += generateDeeplyNestedTypes(typeDepth);
    code += '\n';
  }

  if (functionCount > 0) {
    code += generateManyFunctions(functionCount);
    code += '\n';
  }

  if (clasCount > 0) {
    code += generateManyClasses(clasCount);
    code += '\n';
  }

  if (effectChains > 0) {
    for (let i = 0; i < effectChains; i++) {
      code += `export const effectChain${i} = ${generateComplexEffectChains()};\n`;
    }
    code += '\n';
  }

  if (literalCount > 0) {
    code += generateManyLiterals();
    code += '\n';
  }

  if (nestingDepth > 0) {
    code += generateDeeplyNestedCode(nestingDepth);
  }

  return code;
}
