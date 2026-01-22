/**
 * render-card-markdown.ts
 * 
 * Renders a PresentedPatternCard to markdown format.
 * Single responsibility: markdown rendering only.
 */

import type { PresentedPatternCard, RenderOptions } from "./pattern-types";

/**
 * Render a pattern card to markdown
 */
export function renderCardMarkdown(
  card: PresentedPatternCard,
  options?: RenderOptions
): string {
  const sections: string[] = [
    `## ${card.title}`,
    `**${card.difficulty}** | ${card.category} | ${card.tags.join(", ")}`,
    "",
    card.summary,
    "",
  ];

  // When to Use / Avoid (always present)
  sections.push("### When to Use / Avoid");
  sections.push("**Use when:**");
  sections.push(card.useGuidance.whenUse.map(s => `- ${s}`).join("\n"));
  sections.push("");
  sections.push("**Avoid when:**");
  sections.push(card.useGuidance.whenAvoid.map(s => `- ${s}`).join("\n"));
  sections.push("");

  // Default behavior (optional, only if present)
  if (card.sections.default) {
    sections.push("### Default Behavior");
    sections.push(card.sections.default.behavior);
    sections.push("");
    sections.push(`*Rationale:* ${card.sections.default.rationale}`);
    sections.push(`*Risk Level:* ${card.sections.default.riskLevel}`);
    if (card.sections.default.rationale) {
      sections.push("");
    }
  }

  // Recommended (optional, only if present)
  if (card.sections.recommended && card.sections.recommended.length > 0) {
    sections.push("### Recommended");
    card.sections.recommended.forEach((rec, idx) => {
      sections.push(`**${idx + 1}.** ${rec.practice}`);
      sections.push(`When: ${rec.conditions.join(", ")}`);
      if (rec.tradeoffs && rec.tradeoffs.length > 0) {
        sections.push(`Tradeoffs: ${rec.tradeoffs.join(", ")}`);
      }
      sections.push("");
    });
  }

  // Examples
  sections.push("### Minimal Example");
  sections.push(`\`\`\`${card.minimalExample.language}`);
  sections.push(card.minimalExample.code);
  sections.push("```");
  if (card.minimalExample.notes) {
    sections.push("");
    sections.push(card.minimalExample.notes);
  }
  sections.push("");

  // Advanced example (optional)
  if (
    card.advancedExample &&
    (options?.includeAdvancedExamples !== false)
  ) {
    sections.push("### Advanced Example");
    sections.push(`\`\`\`${card.advancedExample.language}`);
    sections.push(card.advancedExample.code);
    sections.push("```");
    if (card.advancedExample.notes) {
      sections.push("");
      sections.push(card.advancedExample.notes);
    }
    sections.push("");
  }

  // Gotchas (optional)
  if (card.sections.gotchas && card.sections.gotchas.length > 0) {
    sections.push("### Common Gotchas");
    sections.push(card.sections.gotchas.map(g => `- ${g}`).join("\n"));
    sections.push("");
  }

  // Category-specific sections
  if (card.sections.setupTeardown) {
    sections.push("### Setup & Teardown");
    sections.push(card.sections.setupTeardown);
    sections.push("");
  }
  if (card.sections.retryPolicy) {
    sections.push("### Retry Policy");
    sections.push(card.sections.retryPolicy);
    sections.push("");
  }
  if (card.sections.layering) {
    sections.push("### Layering");
    sections.push(card.sections.layering);
    sections.push("");
  }

  // Related patterns
  if (card.relatedPatterns && card.relatedPatterns.length > 0) {
    sections.push("### Related Patterns");
    sections.push(card.relatedPatterns.map(p => `- [${p.title}](../${p.id}.md)`).join("\n"));
    sections.push("");
  }

  // Provenance panel (collapsible, on demand)
  if (options?.includeProvenancePanel) {
    sections.push("---");
    sections.push("");
    sections.push("<details>");
    sections.push("<summary>📋 Trace / Provenance</summary>");
    sections.push("");
    sections.push(`- **Pattern ID**: \`${card.source.patternId}\``);
    sections.push(`- **File**: \`${card.source.filePath}\``);
    if (card.source.commit) {
      sections.push(`- **Commit**: \`${card.source.commit}\``);
    }
    if (card.source.server) {
      sections.push(`- **Server**: ${card.source.server}`);
    }
    sections.push(`- **Retrieved**: ${new Date(card.source.retrievedAt).toISOString()}`);
    if (card.source.indexedAt) {
      sections.push(`- **Indexed**: ${new Date(card.source.indexedAt).toISOString()}`);
    }
    sections.push(`- **Content Hash**: \`${card.source.contentHash.substring(0, 16)}...\``);
    if (card.source.effectVersion) {
      sections.push(`- **Effect Version**: ${card.source.effectVersion}`);
    }
    sections.push("");
    sections.push("</details>");
  }

  return sections.filter(s => s !== "").join("\n");
}
