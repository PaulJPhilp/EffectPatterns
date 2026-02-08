/**
 * SKILL.md Parsing Utilities
 *
 * Pure functions for parsing SKILL.md frontmatter and extracting metadata.
 * Separated from load-skills.ts for testability.
 */

/**
 * Parse SKILL.md frontmatter.
 *
 * The generator writes frontmatter on a single line with no newlines:
 *   ---name: effect-patterns-foobardescription: Some description.---
 *
 * We extract `name` and `description` from that line.
 */
export function parseFrontmatter(
  raw: string,
): { name: string; description: string } | null {
  // Match the single-line frontmatter: ---name: ...description: ...---
  const match = raw.match(/^---name:\s*(.+?)description:\s*(.+?)---/);
  if (match) {
    return { name: match[1].trim(), description: match[2].trim() };
  }

  // Fallback: multi-line YAML frontmatter
  const multiMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (multiMatch) {
    const yaml = multiMatch[1];
    const nameMatch = yaml.match(/^name:\s*(.+)$/m);
    const descMatch = yaml.match(/^description:\s*(.+)$/m);
    if (nameMatch && descMatch) {
      return { name: nameMatch[1].trim(), description: descMatch[1].trim() };
    }
  }

  return null;
}

/**
 * Extract the pattern count from the skill body.
 * Looks for "This skill provides N curated" in the content.
 */
export function extractPatternCount(content: string): number {
  const match = content.match(/provides\s+(\d+)\s+curated/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Derive the category from the skill slug.
 * e.g. "effect-patterns-concurrency" → "concurrency"
 */
export function deriveCategory(slug: string): string {
  return slug.replace(/^effect-patterns-/, '');
}
