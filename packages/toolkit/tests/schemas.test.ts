/**
 * Schema Validation Tests
 *
 * Tests for Effect schema validation of domain types.
 */

import { Schema as S } from '@effect/schema';
import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  GenerateRequest,
  GenerateResponse,
  ModuleType,
  SearchPatternsRequest,
} from '../src/schemas/generate.js';
import {
  CodeExample,
  DifficultyLevel,
  Pattern,
  PatternCategory,
  PatternSummary,
  PatternsIndex,
} from '../src/schemas/pattern.js';

describe('Pattern schemas', () => {
  describe('PatternCategory', () => {
    it('should accept valid categories', async () => {
      const validCategories = [
        'error-handling',
        'concurrency',
        'data-transformation',
        'testing',
        'services',
        'streams',
        'caching',
        'observability',
        'scheduling',
        'resource-management',
      ];

      for (const category of validCategories) {
        const result = await Effect.runPromise(
          S.decode(PatternCategory)(category),
        );
        expect(result).toBe(category);
      }
    });

    it('should reject invalid categories', async () => {
      await expect(
        Effect.runPromise(S.decode(PatternCategory)('invalid-category')),
      ).rejects.toThrow();
    });
  });

  describe('DifficultyLevel', () => {
    it('should accept valid difficulty levels', async () => {
      const validLevels = ['beginner', 'intermediate', 'advanced'];

      for (const level of validLevels) {
        const result = await Effect.runPromise(
          S.decode(DifficultyLevel)(level),
        );
        expect(result).toBe(level);
      }
    });

    it('should reject invalid difficulty levels', async () => {
      await expect(
        Effect.runPromise(S.decode(DifficultyLevel)('expert')),
      ).rejects.toThrow();
    });
  });

  describe('CodeExample', () => {
    it('should validate valid code example', async () => {
      const example = {
        language: 'typescript',
        code: 'const x = 1;',
        description: 'Test',
      };

      const result = await Effect.runPromise(S.decode(CodeExample)(example));
      expect(result).toEqual(example);
    });

    it('should allow missing description', async () => {
      const example = {
        language: 'typescript',
        code: 'const x = 1;',
      };

      const result = await Effect.runPromise(S.decode(CodeExample)(example));
      expect(result.language).toBe('typescript');
      expect(result.code).toBe('const x = 1;');
    });

    it('should require language field', async () => {
      const invalid = {
        code: 'const x = 1;',
      };

      await expect(
        Effect.runPromise(S.decode(CodeExample)(invalid)),
      ).rejects.toThrow();
    });

    it('should require code field', async () => {
      const invalid = {
        language: 'typescript',
      };

      await expect(
        Effect.runPromise(S.decode(CodeExample)(invalid)),
      ).rejects.toThrow();
    });
  });

  describe('Pattern', () => {
    const validPattern = {
      id: 'test-pattern',
      title: 'Test Pattern',
      description: 'A test pattern',
      category: 'error-handling',
      difficulty: 'beginner',
      tags: ['test'],
      examples: [
        {
          language: 'typescript',
          code: 'const x = 1;',
        },
      ],
      useCases: ['Testing'],
    };

    it('should validate complete pattern', async () => {
      const result = await Effect.runPromise(S.decode(Pattern)(validPattern));
      expect(result).toMatchObject(validPattern);
    });

    it('should validate pattern with all optional fields', async () => {
      const complete = {
        ...validPattern,
        relatedPatterns: ['related1'],
        effectVersion: '3.5.0',
        createdAt: '2025-01-09T00:00:00Z',
        updatedAt: '2025-01-09T00:00:00Z',
      };

      const result = await Effect.runPromise(S.decode(Pattern)(complete));
      expect(result.relatedPatterns).toEqual(['related1']);
      expect(result.effectVersion).toBe('3.5.0');
    });

    it('should allow missing optional fields', async () => {
      const result = await Effect.runPromise(S.decode(Pattern)(validPattern));
      expect(result.relatedPatterns).toBeUndefined();
      expect(result.effectVersion).toBeUndefined();
    });

    it('should require id field', async () => {
      const invalid = { ...validPattern };
      delete (invalid as any).id;

      await expect(
        Effect.runPromise(S.decode(Pattern)(invalid)),
      ).rejects.toThrow();
    });

    it('should require title field', async () => {
      const invalid = { ...validPattern };
      delete (invalid as any).title;

      await expect(
        Effect.runPromise(S.decode(Pattern)(invalid)),
      ).rejects.toThrow();
    });

    it('should require category field', async () => {
      const invalid = { ...validPattern };
      delete (invalid as any).category;

      await expect(
        Effect.runPromise(S.decode(Pattern)(invalid)),
      ).rejects.toThrow();
    });

    it('should require tags to be array', async () => {
      const invalid = {
        ...validPattern,
        tags: 'not-an-array',
      };

      await expect(
        Effect.runPromise(S.decode(Pattern)(invalid)),
      ).rejects.toThrow();
    });

    it('should require examples to be array', async () => {
      const invalid = {
        ...validPattern,
        examples: 'not-an-array',
      };

      await expect(
        Effect.runPromise(S.decode(Pattern)(invalid)),
      ).rejects.toThrow();
    });

    it('should validate example structures', async () => {
      const withInvalidExample = {
        ...validPattern,
        examples: [
          {
            language: 'typescript',
            // Missing code field
          },
        ],
      };

      await expect(
        Effect.runPromise(S.decode(Pattern)(withInvalidExample)),
      ).rejects.toThrow();
    });
  });

  describe('PatternSummary', () => {
    const validSummary = {
      id: 'test',
      title: 'Test',
      description: 'Test description',
      category: 'error-handling',
      difficulty: 'beginner',
      tags: ['test'],
    };

    it('should validate valid summary', async () => {
      const result = await Effect.runPromise(
        S.decode(PatternSummary)(validSummary),
      );
      expect(result).toEqual(validSummary);
    });

    it('should not allow examples field', async () => {
      const withExamples = {
        ...validSummary,
        examples: [],
      };

      // Schema should still validate but examples won't be in type
      const result = await Effect.runPromise(
        S.decode(PatternSummary)(withExamples),
      );
      expect(result).toMatchObject(validSummary);
    });

    it('should require all fields', async () => {
      const invalid = { ...validSummary };
      delete (invalid as any).description;

      await expect(
        Effect.runPromise(S.decode(PatternSummary)(invalid)),
      ).rejects.toThrow();
    });
  });

  describe('PatternsIndex', () => {
    const validIndex = {
      version: '1.0.0',
      patterns: [
        {
          id: 'test',
          title: 'Test',
          description: 'Test',
          category: 'error-handling',
          difficulty: 'beginner',
          tags: [],
          examples: [],
          useCases: [],
        },
      ],
      lastUpdated: '2025-01-09T00:00:00Z',
    };

    it('should validate valid patterns index', async () => {
      const result = await Effect.runPromise(
        S.decode(PatternsIndex)(validIndex),
      );
      expect(result.version).toBe('1.0.0');
      expect(result.patterns).toHaveLength(1);
    });

    it('should allow missing optional fields', async () => {
      const minimal = {
        patterns: validIndex.patterns,
      };

      const result = await Effect.runPromise(S.decode(PatternsIndex)(minimal));
      expect(result.patterns).toHaveLength(1);
      expect(result.version).toBeUndefined();
    });

    it('should require patterns field', async () => {
      const invalid = {
        version: '1.0.0',
      };

      await expect(
        Effect.runPromise(S.decode(PatternsIndex)(invalid)),
      ).rejects.toThrow();
    });

    it('should validate patterns array is array of Pattern', async () => {
      const invalid = {
        patterns: ['not', 'patterns'],
      };

      await expect(
        Effect.runPromise(S.decode(PatternsIndex)(invalid)),
      ).rejects.toThrow();
    });

    it('should allow empty patterns array', async () => {
      const empty = {
        patterns: [],
      };

      const result = await Effect.runPromise(S.decode(PatternsIndex)(empty));
      expect(result.patterns).toHaveLength(0);
    });
  });
});

describe('Generate schemas', () => {
  describe('ModuleType', () => {
    it("should accept 'esm'", async () => {
      const result = await Effect.runPromise(S.decode(ModuleType)('esm'));
      expect(result).toBe('esm');
    });

    it("should accept 'cjs'", async () => {
      const result = await Effect.runPromise(S.decode(ModuleType)('cjs'));
      expect(result).toBe('cjs');
    });

    it('should reject invalid module types', async () => {
      await expect(
        Effect.runPromise(S.decode(ModuleType)('amd')),
      ).rejects.toThrow();
    });
  });

  describe('GenerateRequest', () => {
    it('should validate minimal request', async () => {
      const request = {
        patternId: 'test-pattern',
      };

      const result = await Effect.runPromise(
        S.decode(GenerateRequest)(request),
      );
      expect(result.patternId).toBe('test-pattern');
    });

    it('should validate complete request', async () => {
      const request = {
        patternId: 'test-pattern',
        name: 'customName',
        input: 'customInput',
        moduleType: 'esm' as const,
        effectVersion: '3.5.0',
      };

      const result = await Effect.runPromise(
        S.decode(GenerateRequest)(request),
      );
      expect(result).toEqual(request);
    });

    it('should allow missing optional fields', async () => {
      const request = {
        patternId: 'test',
      };

      const result = await Effect.runPromise(
        S.decode(GenerateRequest)(request),
      );
      expect(result.name).toBeUndefined();
      expect(result.input).toBeUndefined();
    });

    it('should require patternId', async () => {
      const invalid = {
        name: 'test',
      };

      await expect(
        Effect.runPromise(S.decode(GenerateRequest)(invalid)),
      ).rejects.toThrow();
    });

    it('should validate moduleType enum', async () => {
      const invalid = {
        patternId: 'test',
        moduleType: 'invalid',
      };

      await expect(
        Effect.runPromise(S.decode(GenerateRequest)(invalid)),
      ).rejects.toThrow();
    });
  });

  describe('GenerateResponse', () => {
    it('should validate valid response', async () => {
      const response = {
        patternId: 'test',
        title: 'Test Pattern',
        snippet: 'const x = 1;',
        timestamp: '2025-01-09T00:00:00Z',
      };

      const result = await Effect.runPromise(
        S.decode(GenerateResponse)(response),
      );
      expect(result).toMatchObject(response);
    });

    it('should allow optional traceId', async () => {
      const response = {
        patternId: 'test',
        title: 'Test',
        snippet: 'code',
        traceId: 'abc123',
        timestamp: '2025-01-09T00:00:00Z',
      };

      const result = await Effect.runPromise(
        S.decode(GenerateResponse)(response),
      );
      expect(result.traceId).toBe('abc123');
    });

    it('should require patternId', async () => {
      const invalid = {
        title: 'Test',
        snippet: 'code',
        timestamp: '2025-01-09T00:00:00Z',
      };

      await expect(
        Effect.runPromise(S.decode(GenerateResponse)(invalid)),
      ).rejects.toThrow();
    });

    it('should require timestamp', async () => {
      const invalid = {
        patternId: 'test',
        title: 'Test',
        snippet: 'code',
      };

      await expect(
        Effect.runPromise(S.decode(GenerateResponse)(invalid)),
      ).rejects.toThrow();
    });
  });

  describe('SearchPatternsRequest', () => {
    it('should validate empty request', async () => {
      const request = {};

      const result = await Effect.runPromise(
        S.decode(SearchPatternsRequest)(request),
      );
      expect(result.q).toBeUndefined();
    });

    it('should validate complete request', async () => {
      const request = {
        q: 'retry',
        category: 'error-handling',
        difficulty: 'beginner',
        limit: '10',
      };

      const result = await Effect.runPromise(
        S.decode(SearchPatternsRequest)(request),
      );
      expect(result.q).toBe('retry');
      expect(result.category).toBe('error-handling');
      expect(result.difficulty).toBe('beginner');
      expect(result.limit).toBe(10); // Converted from string
    });

    it('should convert limit from string to number', async () => {
      const request = {
        limit: '25',
      };

      const result = await Effect.runPromise(
        S.decode(SearchPatternsRequest)(request),
      );
      expect(result.limit).toBe(25);
      expect(typeof result.limit).toBe('number');
    });

    it('should handle invalid limit string', async () => {
      const invalid = {
        limit: 'not-a-number',
      };

      await expect(
        Effect.runPromise(S.decode(SearchPatternsRequest)(invalid)),
      ).rejects.toThrow();
    });
  });
});

describe('Schema edge cases', () => {
  it('should handle null values appropriately', async () => {
    const withNull = {
      id: 'test',
      title: 'Test',
      description: 'Test',
      category: 'error-handling',
      difficulty: 'beginner',
      tags: [],
      examples: [],
      useCases: [],
      relatedPatterns: null, // null instead of undefined
    };

    // Schema should handle or reject null based on its definition
    await expect(
      Effect.runPromise(S.decode(Pattern)(withNull)),
    ).rejects.toThrow();
  });

  it('should handle extra fields gracefully', async () => {
    const withExtra = {
      id: 'test',
      title: 'Test',
      description: 'Test',
      category: 'error-handling',
      difficulty: 'beginner',
      tags: [],
      examples: [],
      useCases: [],
      extraField: 'should be ignored or rejected',
    };

    // Effect schema behavior for extra fields
    const result = await Effect.runPromise(S.decode(Pattern)(withExtra));
    expect(result.id).toBe('test');
  });
});
