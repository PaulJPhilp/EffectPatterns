/**
 * IO Operations Tests
 *
 * Tests for Effect-based file loading and pattern index parsing.
 */

import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import * as NodeFileSystem from '@effect/platform-node/NodeFileSystem';
import { Effect } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadPatternsFromJson } from '../src/io.js';
import type { PatternsIndex } from '../src/schemas/pattern.js';

describe('loadPatternsFromJson', () => {
  let testDir: string;
  let testFilePath: string;

  beforeEach(() => {
    // Create temp directory for test files
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'toolkit-test-'));
    testFilePath = path.join(testDir, 'patterns.json');
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('successful loading', () => {
    it('should load valid patterns.json file', async () => {
      const validData: PatternsIndex = {
        version: '1.0.0',
        patterns: [
          {
            id: 'test-pattern',
            title: 'Test Pattern',
            description: 'A test pattern',
            category: 'error-handling',
            difficulty: 'beginner',
            tags: ['test'],
            examples: [
              {
                language: 'typescript',
                code: 'const test = 1;',
              },
            ],
            useCases: ['Testing'],
          },
        ],
        lastUpdated: '2025-01-09T00:00:00Z',
      };

      fs.writeFileSync(testFilePath, JSON.stringify(validData, null, 2));

      const result = await Effect.runPromise(
        loadPatternsFromJson(testFilePath).pipe(
          Effect.provide(NodeFileSystem.layer),
        ),
      );

      expect(result.version).toBe('1.0.0');
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].id).toBe('test-pattern');
    });

    it('should handle patterns without optional fields', async () => {
      const minimalData = {
        patterns: [
          {
            id: 'minimal',
            title: 'Minimal',
            description: 'Minimal pattern',
            category: 'error-handling',
            difficulty: 'beginner',
            tags: [],
            examples: [],
            useCases: [],
          },
        ],
      };

      fs.writeFileSync(testFilePath, JSON.stringify(minimalData));

      const result = await Effect.runPromise(
        loadPatternsFromJson(testFilePath).pipe(
          Effect.provide(NodeFileSystem.layer),
        ),
      );

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].id).toBe('minimal');
    });

    it('should handle multiple patterns', async () => {
      const data = {
        version: '1.0.0',
        patterns: [
          {
            id: 'pattern1',
            title: 'Pattern 1',
            description: 'First pattern',
            category: 'error-handling',
            difficulty: 'beginner',
            tags: [],
            examples: [],
            useCases: [],
          },
          {
            id: 'pattern2',
            title: 'Pattern 2',
            description: 'Second pattern',
            category: 'concurrency',
            difficulty: 'intermediate',
            tags: [],
            examples: [],
            useCases: [],
          },
        ],
      };

      fs.writeFileSync(testFilePath, JSON.stringify(data));

      const result = await Effect.runPromise(
        loadPatternsFromJson(testFilePath).pipe(
          Effect.provide(NodeFileSystem.layer),
        ),
      );

      expect(result.patterns).toHaveLength(2);
      expect(result.patterns[0].id).toBe('pattern1');
      expect(result.patterns[1].id).toBe('pattern2');
    });

    it('should handle empty patterns array', async () => {
      const data = {
        version: '1.0.0',
        patterns: [],
      };

      fs.writeFileSync(testFilePath, JSON.stringify(data));

      const result = await Effect.runPromise(
        loadPatternsFromJson(testFilePath).pipe(
          Effect.provide(NodeFileSystem.layer),
        ),
      );

      expect(result.patterns).toHaveLength(0);
    });

    it('should preserve pattern metadata', async () => {
      const data = {
        version: '2.0.0',
        patterns: [
          {
            id: 'test',
            title: 'Test',
            description: 'Test pattern',
            category: 'error-handling',
            difficulty: 'advanced',
            tags: ['tag1', 'tag2'],
            examples: [
              {
                language: 'typescript',
                code: 'const x = 1;',
                description: 'Example description',
              },
            ],
            useCases: ['Use case 1', 'Use case 2'],
            relatedPatterns: ['related1', 'related2'],
            effectVersion: '3.5.0',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-09T00:00:00Z',
          },
        ],
        lastUpdated: '2025-01-09T00:00:00Z',
      };

      fs.writeFileSync(testFilePath, JSON.stringify(data));

      const result = await Effect.runPromise(
        loadPatternsFromJson(testFilePath).pipe(
          Effect.provide(NodeFileSystem.layer),
        ),
      );

      const pattern = result.patterns[0];
      expect(pattern.tags).toEqual(['tag1', 'tag2']);
      expect(pattern.examples[0].description).toBe('Example description');
      expect(pattern.useCases).toEqual(['Use case 1', 'Use case 2']);
      expect(pattern.relatedPatterns).toEqual(['related1', 'related2']);
      expect(pattern.effectVersion).toBe('3.5.0');
    });
  });

  describe('error handling', () => {
    it('should fail when file does not exist', async () => {
      const nonExistentPath = path.join(testDir, 'nonexistent.json');

      await expect(
        Effect.runPromise(
          loadPatternsFromJson(nonExistentPath).pipe(
            Effect.provide(NodeFileSystem.layer),
          ),
        ),
      ).rejects.toThrow();
    });

    it('should fail on invalid JSON', async () => {
      fs.writeFileSync(testFilePath, '{ invalid json }');

      await expect(
        Effect.runPromise(
          loadPatternsFromJson(testFilePath).pipe(
            Effect.provide(NodeFileSystem.layer),
          ),
        ),
      ).rejects.toThrow();
    });

    it('should fail on empty file', async () => {
      fs.writeFileSync(testFilePath, '');

      await expect(
        Effect.runPromise(
          loadPatternsFromJson(testFilePath).pipe(
            Effect.provide(NodeFileSystem.layer),
          ),
        ),
      ).rejects.toThrow();
    });

    it('should fail when patterns field is missing', async () => {
      const invalidData = {
        version: '1.0.0',
        // Missing patterns field
      };

      fs.writeFileSync(testFilePath, JSON.stringify(invalidData));

      await expect(
        Effect.runPromise(
          loadPatternsFromJson(testFilePath).pipe(
            Effect.provide(NodeFileSystem.layer),
          ),
        ),
      ).rejects.toThrow();
    });

    it('should fail when pattern has invalid category', async () => {
      const invalidData = {
        patterns: [
          {
            id: 'test',
            title: 'Test',
            description: 'Test',
            category: 'invalid-category', // Not in enum
            difficulty: 'beginner',
            tags: [],
            examples: [],
            useCases: [],
          },
        ],
      };

      fs.writeFileSync(testFilePath, JSON.stringify(invalidData));

      await expect(
        Effect.runPromise(
          loadPatternsFromJson(testFilePath).pipe(
            Effect.provide(NodeFileSystem.layer),
          ),
        ),
      ).rejects.toThrow();
    });

    it('should fail when pattern has invalid difficulty', async () => {
      const invalidData = {
        patterns: [
          {
            id: 'test',
            title: 'Test',
            description: 'Test',
            category: 'error-handling',
            difficulty: 'expert', // Not in enum
            tags: [],
            examples: [],
            useCases: [],
          },
        ],
      };

      fs.writeFileSync(testFilePath, JSON.stringify(invalidData));

      await expect(
        Effect.runPromise(
          loadPatternsFromJson(testFilePath).pipe(
            Effect.provide(NodeFileSystem.layer),
          ),
        ),
      ).rejects.toThrow();
    });

    it('should fail when pattern is missing required fields', async () => {
      const invalidData = {
        patterns: [
          {
            id: 'test',
            // Missing title, description, etc.
          },
        ],
      };

      fs.writeFileSync(testFilePath, JSON.stringify(invalidData));

      await expect(
        Effect.runPromise(
          loadPatternsFromJson(testFilePath).pipe(
            Effect.provide(NodeFileSystem.layer),
          ),
        ),
      ).rejects.toThrow();
    });

    it('should fail when tags is not an array', async () => {
      const invalidData = {
        patterns: [
          {
            id: 'test',
            title: 'Test',
            description: 'Test',
            category: 'error-handling',
            difficulty: 'beginner',
            tags: 'not-an-array',
            examples: [],
            useCases: [],
          },
        ],
      };

      fs.writeFileSync(testFilePath, JSON.stringify(invalidData));

      await expect(
        Effect.runPromise(
          loadPatternsFromJson(testFilePath).pipe(
            Effect.provide(NodeFileSystem.layer),
          ),
        ),
      ).rejects.toThrow();
    });

    it('should fail when examples is not an array', async () => {
      const invalidData = {
        patterns: [
          {
            id: 'test',
            title: 'Test',
            description: 'Test',
            category: 'error-handling',
            difficulty: 'beginner',
            tags: [],
            examples: 'not-an-array',
            useCases: [],
          },
        ],
      };

      fs.writeFileSync(testFilePath, JSON.stringify(invalidData));

      await expect(
        Effect.runPromise(
          loadPatternsFromJson(testFilePath).pipe(
            Effect.provide(NodeFileSystem.layer),
          ),
        ),
      ).rejects.toThrow();
    });
  });

  describe('schema validation', () => {
    it('should validate example structure', async () => {
      const data = {
        patterns: [
          {
            id: 'test',
            title: 'Test',
            description: 'Test',
            category: 'error-handling',
            difficulty: 'beginner',
            tags: [],
            examples: [
              {
                language: 'typescript',
                code: 'const x = 1;',
                description: 'Optional description',
              },
            ],
            useCases: [],
          },
        ],
      };

      fs.writeFileSync(testFilePath, JSON.stringify(data));

      const result = await Effect.runPromise(
        loadPatternsFromJson(testFilePath).pipe(
          Effect.provide(NodeFileSystem.layer),
        ),
      );

      expect(result.patterns[0].examples[0].language).toBe('typescript');
      expect(result.patterns[0].examples[0].code).toBe('const x = 1;');
    });

    it('should allow example without description', async () => {
      const data = {
        patterns: [
          {
            id: 'test',
            title: 'Test',
            description: 'Test',
            category: 'error-handling',
            difficulty: 'beginner',
            tags: [],
            examples: [
              {
                language: 'typescript',
                code: 'const x = 1;',
              },
            ],
            useCases: [],
          },
        ],
      };

      fs.writeFileSync(testFilePath, JSON.stringify(data));

      const result = await Effect.runPromise(
        loadPatternsFromJson(testFilePath).pipe(
          Effect.provide(NodeFileSystem.layer),
        ),
      );

      expect(result.patterns[0].examples[0].description).toBeUndefined();
    });

    it('should validate all category values', async () => {
      const categories = [
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

      for (const category of categories) {
        const data = {
          patterns: [
            {
              id: 'test',
              title: 'Test',
              description: 'Test',
              category,
              difficulty: 'beginner',
              tags: [],
              examples: [],
              useCases: [],
            },
          ],
        };

        fs.writeFileSync(testFilePath, JSON.stringify(data));

        const result = await Effect.runPromise(
          loadPatternsFromJson(testFilePath).pipe(
            Effect.provide(NodeFileSystem.layer),
          ),
        );

        expect(result.patterns[0].category).toBe(category);
      }
    });

    it('should validate all difficulty values', async () => {
      const difficulties = ['beginner', 'intermediate', 'advanced'];

      for (const difficulty of difficulties) {
        const data = {
          patterns: [
            {
              id: 'test',
              title: 'Test',
              description: 'Test',
              category: 'error-handling',
              difficulty,
              tags: [],
              examples: [],
              useCases: [],
            },
          ],
        };

        fs.writeFileSync(testFilePath, JSON.stringify(data));

        const result = await Effect.runPromise(
          loadPatternsFromJson(testFilePath).pipe(
            Effect.provide(NodeFileSystem.layer),
          ),
        );

        expect(result.patterns[0].difficulty).toBe(difficulty);
      }
    });
  });

  describe('UTF-8 handling', () => {
    it('should handle UTF-8 characters in patterns', async () => {
      const data = {
        patterns: [
          {
            id: 'unicode-test',
            title: 'Unicode Test 测试 🚀',
            description: 'Pattern with émojis and spëcial çharacters',
            category: 'error-handling',
            difficulty: 'beginner',
            tags: ['unicode', 'emoji'],
            examples: [],
            useCases: ['Testing Unicode'],
          },
        ],
      };

      fs.writeFileSync(testFilePath, JSON.stringify(data, null, 2), 'utf-8');

      const result = await Effect.runPromise(
        loadPatternsFromJson(testFilePath).pipe(
          Effect.provide(NodeFileSystem.layer),
        ),
      );

      expect(result.patterns[0].title).toContain('🚀');
      expect(result.patterns[0].description).toContain('émojis');
    });
  });
});
