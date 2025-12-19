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
  applicationPatternId: string;
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
    applicationPatternId: (data as any).applicationPatternId,
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
 * Group patterns by category (applicationPatternId)
 *
 * Normalizes category names to kebab-case for consistency.
 */
export function groupPatternsByCategory(
  patterns: PatternContent[]
): Map<string, PatternContent[]> {
  const categoryMap = new Map<string, PatternContent[]>();

  for (const pattern of patterns) {
    const category = pattern.applicationPatternId;
    if (!category) continue;

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
  const skillDir = path.join(projectRoot, 'content/published/skills/claude', skillName);
  const skillFile = path.join(skillDir, 'SKILL.md');

  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(skillFile, content, 'utf-8');
}

/**
 * Gemini Skills format types
 */
export interface GeminiSkillTool {
  name: string;
  description: string;
  displayName: string;
  skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  codeExample?: string;
  antiPattern?: string;
  rationale?: string;
}

export interface GeminiSkillContent {
  skillName: string;
  skillId: string;
  displayName: string;
  description: string;
  category: string;
  totalPatterns: number;
  tools: GeminiSkillTool[];
  systemPrompt: string;
}

/**
 * Generate Gemini Skill content in JSON format
 *
 * Creates a Gemini-compatible skill definition with tool descriptions
 * that can be used to enhance Gemini's understanding of Effect-TS patterns.
 */
export function generateGeminiSkill(
  category: string,
  patterns: PatternContent[]
): GeminiSkillContent {
  // Format category name for display
  const categoryTitle = category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Sort by skill level
  const levels = { beginner: 0, intermediate: 1, advanced: 2 };
  const sorted = patterns.sort(
    (a, b) => levels[a.skillLevel] - levels[b.skillLevel]
  );

  // Convert patterns to Gemini tools
  const tools: GeminiSkillTool[] = sorted.map((pattern) => ({
    name: pattern.id.replace(/-/g, '_'),
    description: pattern.rule?.description || pattern.summary || '',
    displayName: pattern.title,
    skillLevel:
      pattern.skillLevel === 'beginner'
        ? 'BEGINNER'
        : pattern.skillLevel === 'intermediate'
          ? 'INTERMEDIATE'
          : 'ADVANCED',
    codeExample: pattern.goodExample ? pattern.goodExample.substring(0, 500) : undefined,
    antiPattern: pattern.antiPattern ? pattern.antiPattern.substring(0, 300) : undefined,
    rationale: pattern.rationale ? pattern.rationale.substring(0, 300) : undefined,
  }));

  // Create system prompt for Gemini
  const systemPrompt = `You are an expert in Effect-TS patterns and best practices.

When discussing ${categoryTitle.toLowerCase()} in Effect-TS applications, reference these patterns:

${tools.map((tool) => `- ${tool.displayName}: ${tool.description}`).join('\n')}

Provide practical guidance on using Effect-TS effectively, citing relevant patterns from this skill.
When users ask about ${categoryTitle.toLowerCase()}, recommend the most appropriate patterns based on their use case.
Include code examples and explain the rationale behind using Effect-TS patterns.`;

  return {
    skillName: `effect-patterns-${category}`,
    skillId: `effect_patterns_${category.replace(/-/g, '_')}`,
    displayName: `Effect-TS Patterns: ${categoryTitle}`,
    description: `Expert patterns and best practices for ${categoryTitle.toLowerCase()} in Effect-TS applications`,
    category,
    totalPatterns: patterns.length,
    tools,
    systemPrompt,
  };
}

/**
 * Write Gemini Skill to the filesystem
 *
 * Creates the .gemini/skills/{skillName} directory and writes skill.json and system-prompt.txt
 */
export async function writeGeminiSkill(
  skillContent: GeminiSkillContent,
  projectRoot: string
): Promise<void> {
  const skillDir = path.join(projectRoot, 'content/published/skills/gemini', skillContent.skillId);
  const skillFile = path.join(skillDir, 'skill.json');
  const promptFile = path.join(skillDir, 'system-prompt.txt');

  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(skillFile, JSON.stringify(skillContent, null, 2), 'utf-8');
  await fs.writeFile(promptFile, skillContent.systemPrompt, 'utf-8');
}

/**
 * Generate OpenAI Skill content
 *
 * OpenAI uses the same SKILL.md format as Claude, so this reuses the Claude generation logic
 */
export function generateOpenAISkill(
  category: string,
  patterns: PatternContent[]
): string {
  // OpenAI uses the same SKILL.md format as Claude
  return generateCategorySkill(category, patterns);
}

/**
 * Write OpenAI Skill to the filesystem
 *
 * Creates the .openai/skills/{skillName} directory and writes SKILL.md
 */
export async function writeOpenAISkill(
  skillName: string,
  content: string,
  projectRoot: string
): Promise<void> {
  const skillDir = path.join(projectRoot, 'content/published/skills/openai', skillName);
  const skillFile = path.join(skillDir, 'SKILL.md');

  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(skillFile, content, 'utf-8');
}
