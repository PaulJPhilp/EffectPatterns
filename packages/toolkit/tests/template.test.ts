/**
 * Template/Snippet Generation Tests
 *
 * Comprehensive tests for code snippet generation, sanitization,
 * and module type handling.
 */

import { describe, expect, it } from 'vitest';
import type { Pattern } from '../src/schemas/pattern.js';
import {
  buildSnippet,
  generateUsageExample,
  sanitizeInput,
} from '../src/template.js';

// Test fixtures
const createMockPattern = (overrides: Partial<Pattern> = {}): Pattern => ({
  id: 'test-pattern',
  title: 'Test Pattern',
  description: 'A test pattern for unit testing',
  category: 'error-handling',
  difficulty: 'beginner',
  tags: ['test'],
  examples: [
    {
      language: 'typescript',
      code: `import { Effect } from "effect";\n\nconst example = Effect.succeed("input");\n\nexport { example };`,
      description: 'Basic example',
    },
  ],
  useCases: ['Testing'],
  ...overrides,
});

describe('sanitizeInput', () => {
  it('should remove angle brackets', () => {
    const result = sanitizeInput("<script>alert('xss')</script>");
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('should remove backticks', () => {
    const result = sanitizeInput('`dangerous`');
    expect(result).not.toContain('`');
  });

  it('should remove dollar signs', () => {
    const result = sanitizeInput('$variable');
    expect(result).not.toContain('$');
  });

  it('should replace newlines with spaces', () => {
    const result = sanitizeInput('line1\nline2\r\nline3');
    expect(result).not.toContain('\n');
    expect(result).not.toContain('\r');
    expect(result).toContain(' ');
  });

  it('should trim whitespace', () => {
    const result = sanitizeInput('  test  ');
    expect(result).toBe('test');
  });

  it('should limit length to 100 characters', () => {
    const longString = 'a'.repeat(200);
    const result = sanitizeInput(longString);
    expect(result.length).toBe(100);
  });

  it('should handle empty string', () => {
    const result = sanitizeInput('');
    expect(result).toBe('');
  });

  it('should handle normal text without changes', () => {
    const input = 'normalText123';
    const result = sanitizeInput(input);
    expect(result).toBe(input);
  });

  it('should handle special characters that are allowed', () => {
    const input = 'test-pattern_name.value';
    const result = sanitizeInput(input);
    expect(result).toBe(input);
  });

  it('should handle multiple dangerous characters at once', () => {
    const input = '<div>$var`code`</div>\ntest';
    const result = sanitizeInput(input);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('$');
    expect(result).not.toContain('`');
    expect(result).not.toContain('\n');
  });
});

describe('buildSnippet', () => {
  describe('basic snippet generation', () => {
    it('should generate snippet with pattern header', () => {
      const pattern = createMockPattern();
      const snippet = buildSnippet({ pattern });

      expect(snippet).toContain(`// ${pattern.title}`);
      expect(snippet).toContain(`// Pattern ID: ${pattern.id}`);
    });

    it('should include import statement', () => {
      const pattern = createMockPattern();
      const snippet = buildSnippet({ pattern });

      expect(snippet).toContain('import { Effect, pipe } from "effect"');
    });

    it('should include example code', () => {
      const pattern = createMockPattern();
      const snippet = buildSnippet({ pattern });

      expect(snippet).toContain('Effect.succeed');
    });

    it('should include example description if present', () => {
      const pattern = createMockPattern({
        examples: [
          {
            language: 'typescript',
            code: 'const test = 1;',
            description: 'Test description',
          },
        ],
      });

      const snippet = buildSnippet({ pattern });
      expect(snippet).toContain('// Test description');
    });
  });

  describe('module type variations', () => {
    it('should generate ESM imports by default', () => {
      const pattern = createMockPattern();
      const snippet = buildSnippet({ pattern });

      expect(snippet).toContain('import { Effect, pipe } from "effect"');
      expect(snippet).not.toContain('require');
    });

    it('should generate ESM when explicitly specified', () => {
      const pattern = createMockPattern();
      const snippet = buildSnippet({ pattern, moduleType: 'esm' });

      expect(snippet).toContain('import { Effect, pipe } from "effect"');
    });

    it('should generate CJS requires when specified', () => {
      const pattern = createMockPattern();
      const snippet = buildSnippet({ pattern, moduleType: 'cjs' });

      expect(snippet).toContain('const { Effect, pipe } = require("effect")');
      // Note: The example code itself may contain import statements,
      // but the header should use require
    });
  });

  describe('custom name parameter', () => {
    it('should use custom name in generated code', () => {
      const pattern = createMockPattern();
      const snippet = buildSnippet({ pattern, customName: 'myCustomName' });

      expect(snippet).toContain('myCustomName');
    });

    it('should sanitize custom name', () => {
      const pattern = createMockPattern();
      const snippet = buildSnippet({
        pattern,
        customName: "<script>alert('xss')</script>",
      });

      expect(snippet).not.toContain('<script>');
      expect(snippet).not.toContain('>');
    });

    it("should replace 'example' with custom name", () => {
      const pattern = createMockPattern({
        examples: [
          {
            language: 'typescript',
            code: "const example = Effect.succeed('test');",
          },
        ],
      });

      const snippet = buildSnippet({ pattern, customName: 'customName' });
      expect(snippet).toContain('customName');
      expect(snippet).not.toContain('const example');
    });
  });

  describe('custom input parameter', () => {
    it('should use custom input value', () => {
      const pattern = createMockPattern();
      const snippet = buildSnippet({
        pattern,
        customInput: 'customInputValue',
      });

      expect(snippet).toContain('customInputValue');
    });

    it('should sanitize custom input', () => {
      const pattern = createMockPattern();
      const snippet = buildSnippet({ pattern, customInput: '`dangerous`' });

      expect(snippet).not.toContain('`dangerous`');
    });

    it("should replace 'input' with custom input", () => {
      const pattern = createMockPattern({
        examples: [
          {
            language: 'typescript',
            code: 'const test = Effect.succeed("input");',
          },
        ],
      });

      const snippet = buildSnippet({ pattern, customInput: 'myValue' });
      expect(snippet).toContain('"myValue"');
      expect(snippet).not.toContain('"input"');
    });
  });

  describe('Effect version parameter', () => {
    it('should include Effect version in header when specified', () => {
      const pattern = createMockPattern();
      const snippet = buildSnippet({
        pattern,
        effectVersion: '3.0.0',
      });

      expect(snippet).toContain('// Effect version: 3.0.0');
    });

    it('should not include version line when not specified', () => {
      const pattern = createMockPattern();
      const snippet = buildSnippet({ pattern });

      expect(snippet).not.toContain('// Effect version:');
    });
  });

  describe('pattern without examples', () => {
    it('should generate minimal placeholder snippet', () => {
      const pattern = createMockPattern({ examples: [] });
      const snippet = buildSnippet({ pattern });

      expect(snippet).toContain(`// ${pattern.title}`);
      expect(snippet).toContain(`// ${pattern.description}`);
      expect(snippet).toContain('import { Effect, pipe } from "effect"');
    });

    it('should include pattern ID in placeholder', () => {
      const pattern = createMockPattern({ examples: [] });
      const snippet = buildSnippet({ pattern });

      expect(snippet).toContain(`// Pattern ID: ${pattern.id}`);
    });

    it("should use default name 'example' when no custom name", () => {
      const pattern = createMockPattern({ examples: [] });
      const snippet = buildSnippet({ pattern });

      expect(snippet).toContain('const example =');
    });

    it('should use custom name in placeholder', () => {
      const pattern = createMockPattern({ examples: [] });
      const snippet = buildSnippet({ pattern, customName: 'customName' });

      expect(snippet).toContain('const customName =');
    });

    it('should use custom input in placeholder', () => {
      const pattern = createMockPattern({ examples: [] });
      const snippet = buildSnippet({ pattern, customInput: 'myInput' });

      expect(snippet).toContain('"myInput"');
    });

    it('should generate CJS placeholder when specified', () => {
      const pattern = createMockPattern({ examples: [] });
      const snippet = buildSnippet({ pattern, moduleType: 'cjs' });

      expect(snippet).toContain('const { Effect, pipe } = require');
      expect(snippet).toContain('module.exports');
    });
  });

  describe('edge cases', () => {
    it('should handle pattern with multiple examples (uses first)', () => {
      const pattern = createMockPattern({
        examples: [
          {
            language: 'typescript',
            code: 'const first = 1;',
          },
          {
            language: 'typescript',
            code: 'const second = 2;',
          },
        ],
      });

      const snippet = buildSnippet({ pattern });
      expect(snippet).toContain('const first');
      expect(snippet).not.toContain('const second');
    });

    it('should handle empty custom name', () => {
      const pattern = createMockPattern();
      const snippet = buildSnippet({ pattern, customName: '' });

      // Empty name gets sanitized to empty, falls back to default behavior
      expect(snippet).toBeDefined();
    });

    it('should handle empty custom input', () => {
      const pattern = createMockPattern();
      const snippet = buildSnippet({ pattern, customInput: '' });

      expect(snippet).toBeDefined();
    });

    it('should handle very long custom name', () => {
      const pattern = createMockPattern();
      const longName = 'a'.repeat(200);
      const snippet = buildSnippet({ pattern, customName: longName });

      // Should be truncated to 100 chars
      expect(snippet.includes('a'.repeat(101))).toBe(false);
    });

    it('should preserve code structure from example', () => {
      const pattern = createMockPattern({
        examples: [
          {
            language: 'typescript',
            code: `const step1 = Effect.succeed(1);
const step2 = Effect.map(step1, x => x + 1);
export { step2 };`,
          },
        ],
      });

      const snippet = buildSnippet({ pattern });
      expect(snippet).toContain('step1');
      expect(snippet).toContain('step2');
    });
  });

  describe('combined parameters', () => {
    it('should handle all parameters together', () => {
      const pattern = createMockPattern();
      const snippet = buildSnippet({
        pattern,
        customName: 'customName',
        customInput: 'customInput',
        moduleType: 'cjs',
        effectVersion: '3.0.0',
      });

      expect(snippet).toContain('customName');
      expect(snippet).toContain('customInput');
      expect(snippet).toContain('require');
      expect(snippet).toContain('// Effect version: 3.0.0');
    });

    it('should sanitize all custom inputs', () => {
      const pattern = createMockPattern();
      const snippet = buildSnippet({
        pattern,
        customName: '<name>',
        customInput: '`input`',
        moduleType: 'esm',
        effectVersion: '3.0.0',
      });

      expect(snippet).not.toContain('<name>');
      expect(snippet).not.toContain('`input`');
    });
  });
});

describe('generateUsageExample', () => {
  it('should generate example with title and description', () => {
    const pattern = createMockPattern();
    const example = generateUsageExample(pattern);

    expect(example).toContain(`// ${pattern.title}`);
    expect(example).toContain(`// ${pattern.description}`);
  });

  it('should include example code', () => {
    const pattern = createMockPattern();
    const example = generateUsageExample(pattern);

    expect(example).toContain('Effect.succeed');
  });

  it('should include example description if present', () => {
    const pattern = createMockPattern({
      examples: [
        {
          language: 'typescript',
          code: 'const test = 1;',
          description: 'Test description',
        },
      ],
    });

    const example = generateUsageExample(pattern);
    expect(example).toContain('Test description');
  });

  it('should handle pattern without examples', () => {
    const pattern = createMockPattern({ examples: [] });
    const example = generateUsageExample(pattern);

    expect(example).toContain(`// ${pattern.title}`);
    expect(example).toContain('// No example available');
  });

  it('should use first example when multiple exist', () => {
    const pattern = createMockPattern({
      examples: [
        {
          language: 'typescript',
          code: 'const first = 1;',
        },
        {
          language: 'typescript',
          code: 'const second = 2;',
        },
      ],
    });

    const example = generateUsageExample(pattern);
    expect(example).toContain('const first');
    expect(example).not.toContain('const second');
  });

  it('should not include import statements', () => {
    const pattern = createMockPattern();
    const example = generateUsageExample(pattern);

    // Unlike buildSnippet, this doesn't add imports
    const codeLines = example.split('\n');
    const _commentLines = codeLines.filter((line) => line.startsWith('//'));
    const exampleCode = pattern.examples[0].code;

    expect(example).not.toContain('import { Effect, pipe } from "effect"');
    expect(example).toContain(exampleCode);
  });

  it('should handle example without description', () => {
    const pattern = createMockPattern({
      examples: [
        {
          language: 'typescript',
          code: 'const test = 1;',
        },
      ],
    });

    const example = generateUsageExample(pattern);
    expect(example).toContain('const test = 1;');
  });
});
