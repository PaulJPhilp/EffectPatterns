/**
 * render-index-markdown.ts
 * 
 * Renders a PresentedPatternIndex to markdown table format.
 * Single responsibility: index table rendering only.
 */

import type { PresentedPatternIndex } from "./pattern-types";

/**
 * Render pattern index as markdown table
 */
export function renderIndexMarkdown(index: PresentedPatternIndex): string {
  const categoryLine = Object.entries(index.categories)
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(" | ");

  const header = `## Pattern Reference (${index.totalCount} patterns)

**Categories:** ${categoryLine}

**Difficulty:** Beginner: ${index.difficulties.beginner} | Intermediate: ${index.difficulties.intermediate} | Advanced: ${index.difficulties.advanced}

---

### Patterns

| Pattern | Category | Difficulty | Key Guidance |
|---------|----------|------------|--------------|`;

  const rows = Array.from(index.patterns)
    .sort((a, b) => a.id.localeCompare(b.id)) // Deterministic ordering
    .map((card) => {
      let guidance = "See details";
      
      if (card.sections.default) {
        guidance = `**Risk:** ${card.sections.default.riskLevel}`;
      } else if (
        card.sections.recommended &&
        card.sections.recommended.length > 0
      ) {
        guidance = `${card.sections.recommended.length} recommendations`;
      }

      return `| **${card.title}** | ${card.category} | ${card.difficulty} | ${guidance} |`;
    });

  return `${header}\n${rows.join("\n")}\n\n---\n\n### Click a pattern name above to see full details.`;
}
