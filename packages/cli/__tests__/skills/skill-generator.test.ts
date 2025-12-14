import { describe, it, expect, beforeAll } from 'vitest';
import {
  readPattern,
  extractSection,
  groupPatternsByCategory,
  generateCategorySkill,
  type PatternContent,
} from '../../src/skills/skill-generator';
import * as path from 'node:path';

describe('Skill Generator', () => {
  describe('extractSection', () => {
    it('should extract a section from markdown content', () => {
      const content = `
## Good Example

This is a good example

## Anti-Pattern

This is bad
`;

      const result = extractSection(content, 'Good Example');
      expect(result).toContain('This is a good example');
    });

    it('should handle multiple section name aliases', () => {
      const content = `
## Guideline

Some guidelines here

## Next Section

More content
`;

      const result = extractSection(content, 'Rationale', 'Guideline');
      expect(result).toContain('Some guidelines here');
    });

    it('should return empty string if section not found', () => {
      const content = `
## Some Section

Content here
`;

      const result = extractSection(content, 'Non-existent');
      expect(result).toBe('');
    });

    it('should be case-insensitive', () => {
      const content = `
## GOOD EXAMPLE

Example content here
`;

      const result = extractSection(content, 'Good Example');
      expect(result).toContain('Example content here');
    });

    it('should stop at the next section header', () => {
      const content = `
## Good Example

First section

## Anti-Pattern

Second section
`;

      const result = extractSection(content, 'Good Example');
      expect(result).toContain('First section');
      expect(result).not.toContain('Anti-Pattern');
    });
  });

  describe('readPattern', () => {
    it('should read and parse a published pattern', async () => {
      const publishedDir = path.join(process.cwd(), 'content/published');
      const patternFile = path.join(publishedDir, 'retry-based-on-specific-errors.mdx');

      const pattern = await readPattern(patternFile);

      expect(pattern.id).toBe('retry-based-on-specific-errors');
      expect(pattern.title).toContain('Retry');
      expect(pattern.skillLevel).toBe('intermediate');
      expect(pattern.useCase).toBe('error-management');
      expect(pattern.summary).toBeTruthy();
      expect(pattern.rule?.description).toBeTruthy();
      expect(pattern.goodExample.length).toBeGreaterThan(0);
      expect(pattern.antiPattern.length).toBeGreaterThan(0);
      expect(pattern.rationale.length).toBeGreaterThan(0);
    });

    it('should extract all required pattern fields', async () => {
      const publishedDir = path.join(process.cwd(), 'content/published');
      const patternFile = path.join(publishedDir, 'retry-based-on-specific-errors.mdx');

      const pattern = await readPattern(patternFile);

      // Verify all fields are present
      expect(pattern).toHaveProperty('id');
      expect(pattern).toHaveProperty('title');
      expect(pattern).toHaveProperty('skillLevel');
      expect(pattern).toHaveProperty('useCase');
      expect(pattern).toHaveProperty('summary');
      expect(pattern).toHaveProperty('rule');
      expect(pattern).toHaveProperty('goodExample');
      expect(pattern).toHaveProperty('antiPattern');
      expect(pattern).toHaveProperty('rationale');
    });
  });

  describe('groupPatternsByCategory', () => {
    it('should group patterns by category', () => {
      const patterns: PatternContent[] = [
        {
          id: '1',
          title: 'Pattern A',
          skillLevel: 'beginner',
          useCase: 'error-management',
          summary: 'Test',
          goodExample: 'code',
          antiPattern: 'bad code',
          rationale: 'because',
        },
        {
          id: '2',
          title: 'Pattern B',
          skillLevel: 'intermediate',
          useCase: 'error-management',
          summary: 'Test',
          goodExample: 'code',
          antiPattern: 'bad code',
          rationale: 'because',
        },
        {
          id: '3',
          title: 'Pattern C',
          skillLevel: 'advanced',
          useCase: 'concurrency',
          summary: 'Test',
          goodExample: 'code',
          antiPattern: 'bad code',
          rationale: 'because',
        },
      ];

      const groups = groupPatternsByCategory(patterns);

      expect(groups.size).toBe(2);
      expect(groups.get('error-management')).toHaveLength(2);
      expect(groups.get('concurrency')).toHaveLength(1);
    });

    it('should handle array useCase values', () => {
      const patterns: PatternContent[] = [
        {
          id: '1',
          title: 'Pattern A',
          skillLevel: 'beginner',
          useCase: ['error-management', 'resilience'],
          summary: 'Test',
          goodExample: 'code',
          antiPattern: 'bad code',
          rationale: 'because',
        },
      ];

      const groups = groupPatternsByCategory(patterns);

      expect(groups.size).toBe(2);
      expect(groups.get('error-management')).toContainEqual(patterns[0]);
      expect(groups.get('resilience')).toContainEqual(patterns[0]);
    });

    it('should normalize category names to kebab-case', () => {
      const patterns: PatternContent[] = [
        {
          id: '1',
          title: 'Pattern A',
          skillLevel: 'beginner',
          useCase: 'Error Management',
          summary: 'Test',
          goodExample: 'code',
          antiPattern: 'bad code',
          rationale: 'because',
        },
      ];

      const groups = groupPatternsByCategory(patterns);

      expect(groups.has('error-management')).toBe(true);
      expect(groups.has('Error Management')).toBe(false);
    });
  });

  describe('generateCategorySkill', () => {
    it('should generate valid SKILL.md with frontmatter', () => {
      const patterns: PatternContent[] = [
        {
          id: 'test-pattern',
          title: 'Test Pattern',
          skillLevel: 'beginner',
          useCase: 'testing',
          summary: 'A test pattern',
          rule: { description: 'Use this pattern for testing' },
          goodExample: '```typescript\ntest code\n```',
          antiPattern: '```typescript\nbad code\n```',
          rationale: 'Because it works',
        },
      ];

      const content = generateCategorySkill('testing', patterns);

      // Verify frontmatter
      expect(content).toContain('---');
      expect(content).toContain('name: effect-patterns-testing');
      expect(content).toContain('description: Effect-TS patterns for Testing');

      // Verify header
      expect(content).toContain('# Effect-TS Patterns: Testing');

      // Verify pattern content
      expect(content).toContain('## Test Pattern');
      expect(content).toContain('**Rule:** Use this pattern for testing');
      expect(content).toContain('**Good Example:**');
      expect(content).toContain('**Anti-Pattern:**');
      expect(content).toContain('**Rationale:**');
      expect(content).toContain('Because it works');
    });

    it('should sort patterns by skill level', () => {
      const patterns: PatternContent[] = [
        {
          id: 'advanced',
          title: 'Advanced Pattern',
          skillLevel: 'advanced',
          useCase: 'testing',
          summary: 'Advanced',
          goodExample: 'code',
          antiPattern: 'bad',
          rationale: 'why',
        },
        {
          id: 'beginner',
          title: 'Beginner Pattern',
          skillLevel: 'beginner',
          useCase: 'testing',
          summary: 'Beginner',
          goodExample: 'code',
          antiPattern: 'bad',
          rationale: 'why',
        },
        {
          id: 'intermediate',
          title: 'Intermediate Pattern',
          skillLevel: 'intermediate',
          useCase: 'testing',
          summary: 'Intermediate',
          goodExample: 'code',
          antiPattern: 'bad',
          rationale: 'why',
        },
      ];

      const content = generateCategorySkill('testing', patterns);

      // Find the order of patterns in the output
      const beginnerIndex = content.indexOf('## Beginner Pattern');
      const intermediateIndex = content.indexOf('## Intermediate Pattern');
      const advancedIndex = content.indexOf('## Advanced Pattern');

      expect(beginnerIndex).toBeLessThan(intermediateIndex);
      expect(intermediateIndex).toBeLessThan(advancedIndex);
    });

    it('should include skill level section headers', () => {
      const patterns: PatternContent[] = [
        {
          id: 'b1',
          title: 'Beginner 1',
          skillLevel: 'beginner',
          useCase: 'testing',
          summary: 'B',
          goodExample: 'code',
          antiPattern: 'bad',
          rationale: 'why',
        },
        {
          id: 'i1',
          title: 'Intermediate 1',
          skillLevel: 'intermediate',
          useCase: 'testing',
          summary: 'I',
          goodExample: 'code',
          antiPattern: 'bad',
          rationale: 'why',
        },
        {
          id: 'a1',
          title: 'Advanced 1',
          skillLevel: 'advanced',
          useCase: 'testing',
          summary: 'A',
          goodExample: 'code',
          antiPattern: 'bad',
          rationale: 'why',
        },
      ];

      const content = generateCategorySkill('testing', patterns);

      expect(content).toContain('## 🟢 Beginner Patterns');
      expect(content).toContain('## 🟡 Intermediate Patterns');
      expect(content).toContain('## 🟠 Advanced Patterns');
    });

    it('should format category names properly', () => {
      const patterns: PatternContent[] = [
        {
          id: 'test',
          title: 'Test',
          skillLevel: 'beginner',
          useCase: 'testing',
          summary: 'Test',
          goodExample: 'code',
          antiPattern: 'bad',
          rationale: 'why',
        },
      ];

      const content = generateCategorySkill('error-management', patterns);

      expect(content).toContain('# Effect-TS Patterns: Error Management');
      expect(content).toContain('name: effect-patterns-error-management');
    });
  });
});
