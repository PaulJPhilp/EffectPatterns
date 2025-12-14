/**
 * Skill Generator for Effect Patterns
 *
 * Utilities for generating Claude Skills from published Effect patterns.
 * Skills are grouped by category (useCase) for better context efficiency.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';

// --- TYPE DEFINITIONS ---

export interface PatternContent {
  id: string;
  title: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  useCase: string | string[];
  summary: string;
  rule?: { description: string };
  goodExample: string;
  antiPattern: string;
  rationale: string;
  related?: string[];
}

// --- HELPER FUNCTIONS ---

/**
 * Extract a specific section from markdown content
 *
 * Looks for sections starting with "## SectionName" and extracts
 * all content until the next "## " header.
 */
export function extractSection(
  content: string,
  ...sectionNames: string[]
): string {
  const contentLines = content.split('\n');
  let inSection = false;
  const sectionLines: string[] = [];

  for (const line of contentLines) {
    // Check if we're entering the target section
    if (
      sectionNames.some((name) => new RegExp(`^##\\s+${name}`, 'i').test(line))
    ) {
      inSection = true;
      continue;
    }

    // If we're in the section, collect lines until the next section
    if (inSection) {
      if (line.startsWith('## ')) {
        break;
      }
      sectionLines.push(line);
    }
  }

  return sectionLines.length > 0 ? sectionLines.join('\n').trim() : '';
}

/**
 * Read and parse a pattern from an MDX file
 *
 * Extracts frontmatter using gray-matter and markdown sections using regex.
 */
export async function readPattern(filePath: string): Promise<PatternContent> {
  const content = await fs.readFile(filePath, 'utf-8');
  const { data, content: markdown } = matter(content);

  return {
    id: (data as any).id,
    title: (data as any).title,
    skillLevel: (data as any).skillLevel,
    useCase: (data as any).useCase,
    summary: (data as any).summary,
    rule: (data as any).rule,
    goodExample: extractSection(markdown, 'Good Example'),
    antiPattern: extractSection(markdown, 'Anti-Pattern'),
    rationale: extractSection(
      markdown,
      'Rationale',
      'Guideline',
      'Explanation'
    ),
    related: (data as any).related,
  };
}

/**
 * Group patterns by category (useCase)
 *
 * Normalizes category names to kebab-case for consistency.
 * A pattern can belong to multiple categories.
 */
export function groupPatternsByCategory(
  patterns: PatternContent[]
): Map<string, PatternContent[]> {
  const categoryMap = new Map<string, PatternContent[]>();

  for (const pattern of patterns) {
    const categories = Array.isArray(pattern.useCase)
      ? pattern.useCase
      : [pattern.useCase];

    for (const category of categories) {
      // Normalize to kebab-case
      const normalized = category
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      if (!categoryMap.has(normalized)) {
        categoryMap.set(normalized, []);
      }
      categoryMap.get(normalized)!.push(pattern);
    }
  }

  return categoryMap;
}

/**
 * Generate Claude Skill content for a category
 *
 * Creates a SKILL.md file with YAML frontmatter and organized patterns.
 * Patterns are sorted by skill level (beginner → intermediate → advanced).
 */
export function generateCategorySkill(
  category: string,
  patterns: PatternContent[]
): string {
  // Sort by skill level
  const levels = { beginner: 0, intermediate: 1, advanced: 2 };
  const sorted = patterns.sort((a, b) => levels[a.skillLevel] - levels[b.skillLevel]);

  // Format category name for display
  const categoryTitle = category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const lines: string[] = [];

  // YAML frontmatter
  lines.push('---');
  lines.push(`name: effect-patterns-${category}`);
  lines.push(
    `description: Effect-TS patterns for ${categoryTitle}. Use when working with ${categoryTitle.toLowerCase()} in Effect-TS applications.`
  );
  lines.push('---\n');

  // Header
  lines.push(`# Effect-TS Patterns: ${categoryTitle}\n`);
  lines.push(
    `This skill provides ${patterns.length} curated Effect-TS patterns for ${categoryTitle.toLowerCase()}.\n`
  );
  lines.push('Use this skill when working on tasks related to:\n');
  lines.push(`- ${categoryTitle.toLowerCase()}\n`);
  lines.push(`- Best practices in Effect-TS applications\n`);
  lines.push(`- Real-world patterns and solutions\n\n`);
  lines.push('---\n\n');

  // Group by skill level for visual organization
  const byLevel = {
    beginner: sorted.filter((p) => p.skillLevel === 'beginner'),
    intermediate: sorted.filter((p) => p.skillLevel === 'intermediate'),
    advanced: sorted.filter((p) => p.skillLevel === 'advanced'),
  };

  // Beginner section
  if (byLevel.beginner.length > 0) {
    lines.push('## 🟢 Beginner Patterns\n\n');
    for (const pattern of byLevel.beginner) {
      lines.push(...formatPatternForSkill(pattern));
    }
    lines.push('\n');
  }

  // Intermediate section
  if (byLevel.intermediate.length > 0) {
    lines.push('## 🟡 Intermediate Patterns\n\n');
    for (const pattern of byLevel.intermediate) {
      lines.push(...formatPatternForSkill(pattern));
    }
    lines.push('\n');
  }

  // Advanced section
  if (byLevel.advanced.length > 0) {
    lines.push('## 🟠 Advanced Patterns\n\n');
    for (const pattern of byLevel.advanced) {
      lines.push(...formatPatternForSkill(pattern));
    }
    lines.push('\n');
  }

  return lines.join('');
}

/**
 * Format a single pattern for inclusion in a skill
 */
function formatPatternForSkill(pattern: PatternContent): string[] {
  const lines: string[] = [];

  lines.push(`### ${pattern.title}\n\n`);

  if (pattern.rule?.description) {
    lines.push(`**Rule:** ${pattern.rule.description}\n\n`);
  }

  if (pattern.goodExample) {
    lines.push('**Good Example:**\n\n');
    lines.push(pattern.goodExample + '\n\n');
  }

  if (pattern.antiPattern) {
    lines.push('**Anti-Pattern:**\n\n');
    lines.push(pattern.antiPattern + '\n\n');
  }

  if (pattern.rationale) {
    lines.push('**Rationale:**\n\n');
    lines.push(pattern.rationale + '\n\n');
  }

  lines.push('---\n\n');

  return lines;
}

/**
 * Write a skill to the filesystem
 *
 * Creates the .claude/skills/{skillName} directory and writes SKILL.md
 */
export async function writeSkill(
  skillName: string,
  content: string,
  projectRoot: string
): Promise<void> {
  const skillDir = path.join(projectRoot, '.claude', 'skills', skillName);
  const skillFile = path.join(skillDir, 'SKILL.md');

  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(skillFile, content, 'utf-8');
}
