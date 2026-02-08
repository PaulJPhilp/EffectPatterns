/**
 * Load Skills Parser Tests
 *
 * Tests for SKILL.md frontmatter parsing, pattern count extraction,
 * and category derivation.
 */

import { describe, expect, it } from 'vitest';
import {
  deriveCategory,
  extractPatternCount,
  parseFrontmatter,
} from '../load-skills-parser.js';

describe('parseFrontmatter', () => {
  describe('single-line frontmatter', () => {
    it('should parse standard single-line frontmatter', () => {
      const raw =
        '---name: effect-patterns-concurrencydescription: Effect-TS patterns for Concurrency. Use when working with concurrency in Effect-TS applications.---\n# Content';

      const result = parseFrontmatter(raw);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('effect-patterns-concurrency');
      expect(result?.description).toBe(
        'Effect-TS patterns for Concurrency. Use when working with concurrency in Effect-TS applications.',
      );
    });

    it('should parse frontmatter with multi-word category', () => {
      const raw =
        '---name: effect-patterns-building-data-pipelinesdescription: Effect-TS patterns for Building Data Pipelines.---\n# Content';

      const result = parseFrontmatter(raw);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('effect-patterns-building-data-pipelines');
      expect(result?.description).toBe(
        'Effect-TS patterns for Building Data Pipelines.',
      );
    });

    it('should parse frontmatter with special characters in description', () => {
      const raw =
        '---name: effect-patterns-project-setup--executiondescription: Effect-TS patterns for Project Setup  Execution.---\n# Content';

      const result = parseFrontmatter(raw);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('effect-patterns-project-setup--execution');
      expect(result?.description).toBe(
        'Effect-TS patterns for Project Setup  Execution.',
      );
    });

    it('should trim whitespace from name and description', () => {
      const raw =
        '---name:   effect-patterns-testing  description:   Some description.  ---\n# Content';

      const result = parseFrontmatter(raw);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('effect-patterns-testing');
      expect(result?.description).toBe('Some description.');
    });
  });

  describe('multi-line frontmatter', () => {
    it('should parse standard multi-line YAML frontmatter', () => {
      const raw = `---
name: effect-patterns-streams
description: Effect-TS patterns for Streams.
---
# Content`;

      const result = parseFrontmatter(raw);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('effect-patterns-streams');
      expect(result?.description).toBe('Effect-TS patterns for Streams.');
    });

    it('should parse multi-line frontmatter with extra fields', () => {
      const raw = `---
name: effect-patterns-testing
version: 2
description: Testing patterns for Effect-TS.
author: test
---
# Content`;

      const result = parseFrontmatter(raw);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('effect-patterns-testing');
      expect(result?.description).toBe('Testing patterns for Effect-TS.');
    });

    it('should return null if multi-line frontmatter is missing name', () => {
      const raw = `---
description: Some description.
---
# Content`;

      const result = parseFrontmatter(raw);
      expect(result).toBeNull();
    });

    it('should return null if multi-line frontmatter is missing description', () => {
      const raw = `---
name: effect-patterns-testing
---
# Content`;

      const result = parseFrontmatter(raw);
      expect(result).toBeNull();
    });
  });

  describe('malformed input', () => {
    it('should return null for empty string', () => {
      expect(parseFrontmatter('')).toBeNull();
    });

    it('should return null for content without frontmatter', () => {
      expect(parseFrontmatter('# Just a heading\nSome content')).toBeNull();
    });

    it('should return null for incomplete frontmatter delimiters', () => {
      expect(parseFrontmatter('---name: test')).toBeNull();
    });

    it('should return null for frontmatter with only dashes', () => {
      expect(parseFrontmatter('------')).toBeNull();
    });

    it('should return null for random text', () => {
      expect(parseFrontmatter('hello world')).toBeNull();
    });
  });
});

describe('extractPatternCount', () => {
  it('should extract count from standard phrasing', () => {
    const content =
      'This skill provides 20 curated Effect-TS patterns for concurrency.';
    expect(extractPatternCount(content)).toBe(20);
  });

  it('should extract single digit count', () => {
    const content = 'This skill provides 3 curated Effect-TS patterns.';
    expect(extractPatternCount(content)).toBe(3);
  });

  it('should extract large count', () => {
    const content = 'This skill provides 149 curated Effect-TS patterns.';
    expect(extractPatternCount(content)).toBe(149);
  });

  it('should return 0 when no count found', () => {
    const content = '# Skill\nSome content without a count.';
    expect(extractPatternCount(content)).toBe(0);
  });

  it('should return 0 for empty string', () => {
    expect(extractPatternCount('')).toBe(0);
  });

  it('should handle extra whitespace around the count', () => {
    const content = 'This skill provides  6  curated patterns.';
    expect(extractPatternCount(content)).toBe(6);
  });

  it('should match the first occurrence', () => {
    const content =
      'This skill provides 10 curated patterns. Also provides 5 curated extras.';
    expect(extractPatternCount(content)).toBe(10);
  });
});

describe('deriveCategory', () => {
  it('should strip the effect-patterns- prefix', () => {
    expect(deriveCategory('effect-patterns-concurrency')).toBe('concurrency');
  });

  it('should handle multi-word categories', () => {
    expect(deriveCategory('effect-patterns-building-data-pipelines')).toBe(
      'building-data-pipelines',
    );
  });

  it('should handle categories with double hyphens', () => {
    expect(deriveCategory('effect-patterns-project-setup--execution')).toBe(
      'project-setup--execution',
    );
  });

  it('should return original string if prefix not present', () => {
    expect(deriveCategory('some-other-skill')).toBe('some-other-skill');
  });

  it('should handle empty string', () => {
    expect(deriveCategory('')).toBe('');
  });

  it('should only strip the first occurrence of the prefix', () => {
    expect(deriveCategory('effect-patterns-effect-patterns-nested')).toBe(
      'effect-patterns-nested',
    );
  });
});
