/**
 * MCP 2.0 Content Builder Utilities
 *
 * Provides helper functions to build rich content blocks with annotations
 * for MCP 2.0 tool responses.
 *
 * Features:
 * - TextContent blocks with optional annotations
 * - CodeContent blocks (wrapped in TextContent with code fences)
 * - Annotated diffs for migration guides
 * - Anti-pattern highlighting with severity annotations
 *
 * FORMATTING RULES (to prevent "smashed text" bug):
 * - Every header (#, ##, ###) is preceded and followed by TWO newlines
 * - Every marker (<!-- kind:... -->) is on its own line with newlines above and below
 * - Horizontal rules (---) separate pattern cards
 */

import {
  MARKER_PATTERN_CARD_V1,
  MARKER_PATTERN_INDEX_V1,
} from "@/constants/markers.js";
import type { TextContent } from "@/schemas/structured-output.js";

/**
 * MCP 2.0 Annotation structure
 */
interface MCPAnnotations {
  readonly audience?: ("user" | "assistant")[];
  readonly priority?: number;
  readonly lastModified?: string;
  readonly [key: string]: unknown;
}

/**
 * Truncate text at word boundary to avoid mid-sentence cuts
 */
function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  // Find last space before maxLength
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  
  // If we found a space reasonably close to maxLength, use it
  if (lastSpace > maxLength * 0.8) {
    return text.substring(0, lastSpace) + "...";
  }
  
  // Otherwise, just truncate and add ellipsis
  return truncated + "...";
}

/**
 * Create a TextContent block with optional annotations
 */
function createTextBlock(
  text: string,
  annotations?: MCPAnnotations
): TextContent {
  return {
    type: "text",
    text,
    ...(annotations && { annotations }),
  };
}

/**
 * Create a code block wrapped in TextContent with proper annotations
 *
 * @param code The code to display
 * @param language Programming language for syntax highlighting
 * @param description Optional description of the code
 * @param annotations Optional annotations (priority, audience, etc.)
 */
function createCodeBlock(
  code: string,
  language: string = "typescript",
  description?: string,
  annotations?: MCPAnnotations
): TextContent {
  const codeBlock = `\`\`\`${language}\n${code}\n\`\`\``;
  const fullText = description ? `${description}\n\n${codeBlock}` : codeBlock;

  return createTextBlock(fullText, annotations);
}

/**
 * Create an annotated diff block for migration guides
 *
 * @param before The "before" code (e.g., v3 style)
 * @param after The "after" code (e.g., v4 style)
 * @param annotations Optional annotations with severity/priority
 * @param explanation Optional explanation of the changes
 */
function createAnnotatedDiff(
  before: string,
  after: string,
  annotations?: MCPAnnotations,
  explanation?: string
): TextContent[] {
  const diffContent: TextContent[] = [];

  // Add explanation if provided with highest priority
  if (explanation) {
    diffContent.push(
      createTextBlock(`${explanation}\n`, {
        priority: 1,
        audience: ["user"],
      })
    );
  }

  // Create "Before" section
  diffContent.push(
    createTextBlock(
      "\n\n**Before (v3 style)**\n\n",
      {
        priority: explanation ? 2 : 1,
        audience: ["user"],
      }
    )
  );

  diffContent.push(
    createCodeBlock(
      before,
      "typescript",
      undefined,
      {
        priority: explanation ? 2 : 1,
        audience: ["user"],
      }
    )
  );

  // Create "After" section
  diffContent.push(
    createTextBlock(
      "\n\n**After (v4 style)**\n\n",
      {
        priority: explanation ? 3 : 2,
        audience: ["user"],
      }
    )
  );

  diffContent.push(
    createCodeBlock(
      after,
      "typescript",
      undefined,
      {
        priority: explanation ? 3 : 2,
        audience: ["user"],
        ...annotations,
      }
    )
  );

  return diffContent;
}

/**
 * Create an anti-pattern annotation with severity highlighting
 *
 * @param severity "high" | "medium" | "low"
 * @param message The violation message
 * @param line Optional line number where issue occurs
 */
function createAntiPatternAnnotation(
  severity: "high" | "medium" | "low",
  _message: string,
  _line?: number
): MCPAnnotations {
  const severityPriority = {
    high: 1,
    medium: 2,
    low: 3,
  };

  return {
    priority: severityPriority[severity],
    audience: ["user"],
    lastModified: new Date().toISOString(),
  };
}

/**
 * Create a highlight annotation for specific code patterns
 *
 * @param pattern The pattern name (e.g., "anti-pattern", "best-practice")
 * @param explanation Explanation of why this pattern matters
 * @param isAntiPattern True if this is an anti-pattern, false if best practice
 */
function createPatternAnnotation(
  _pattern: string,
  _explanation: string,
  isAntiPattern: boolean = true
): MCPAnnotations {
  return {
    priority: isAntiPattern ? 1 : 2,
    audience: ["user"],
  };
}

/**
 * Build a rich content block for a pattern with multiple sections
 *
 * Returns a content array suitable for MCP tool responses.
 */
function buildPatternContent(
  title: string,
  description: string,
  codeExample: string,
  useCases?: readonly string[],
  relatedPatterns?: readonly string[]
): TextContent[] {
  const content: TextContent[] = [];

  // Title with proper spacing
  content.push(
    createTextBlock(`\n\n# ${title}\n\n`, {
      priority: 1,
      audience: ["user"],
    })
  );

  // Description
  content.push(
    createTextBlock(`${description}\n\n`, {
      priority: 2,
      audience: ["user"],
    })
  );

  // Code example
  content.push(
    createCodeBlock(
      codeExample,
      "typescript",
      "**Example:**",
      {
        priority: 2,
        audience: ["user"],
      }
    )
  );

  // Use cases
  if (useCases && useCases.length > 0) {
    const useCasesText = `\n\n**Use Cases:**\n\n${useCases.map((uc) => `- ${uc}`).join("\n")}\n`;
    content.push(
      createTextBlock(useCasesText, {
        priority: 3,
        audience: ["user"],
      })
    );
  }

  // Related patterns
  if (relatedPatterns && relatedPatterns.length > 0) {
    const relatedText = `\n\n**Related Patterns:**\n\n${relatedPatterns.map((rp) => `- ${rp}`).join("\n")}\n`;
    content.push(
      createTextBlock(relatedText, {
        priority: 4,
        audience: ["user"],
      })
    );
  }

  return content;
}

/**
 * Build a violation annotation block with severity levels
 *
 * Useful for code review and analysis tools.
 * Uses standardized Markdown with severity indicators for scannability.
 */
function buildViolationContent(
  ruleName: string,
  severity: "🔴 high" | "🟡 medium" | "🔵 low",
  message: string,
  remediation: string,
  example?: string
): TextContent[] {
  const content: TextContent[] = [];

  // Parse severity for better blockquote formatting
  const severityLabel = severity.includes("high")
    ? "[🔴 HIGH SEVERITY]"
    : severity.includes("medium")
      ? "[🟡 ADVISORY]"
      : "[🔵 INFO]";

  // Header with severity for quick scanning
  content.push(
    createTextBlock(`\n\n## ${severityLabel} ${ruleName}\n\n`, {
      priority: 1,
      audience: ["user"],
    })
  );

  // Blockquoted message for visual separation
  content.push(
    createTextBlock(`> **Issue:** ${message}\n\n`, {
      priority: 1,
      audience: ["user"],
    })
  );

  if (example) {
    content.push(
      createTextBlock("\n\n### Problematic Pattern\n\n", {
        priority: 2,
        audience: ["user"],
      })
    );

    content.push(
      createCodeBlock(
        example,
        "typescript",
        undefined,
        {
          priority: 2,
          audience: ["user"],
        }
      )
    );
  }

  // Remediation with clear header
  content.push(
    createTextBlock("\n\n### How to Fix\n\n", {
      priority: 3,
      audience: ["user"],
    })
  );

  content.push(
    createTextBlock(`> ${remediation}\n\n`, {
      priority: 3,
      audience: ["user"],
    })
  );

  return content;
}

/**
 * Create a scannable severity block with standardized Markdown formatting
 *
 * @param severity Severity level: "high" | "medium" | "low"
 * @param title Brief title of the finding
 * @param description Detailed description
 * @param relatedCode Optional code snippet showing the issue
 */
function createSeverityBlock(
  severity: "high" | "medium" | "low",
  title: string,
  description: string,
  relatedCode?: string
): TextContent[] {
  const blocks: TextContent[] = [];

  const severityLabel =
    severity === "high"
      ? "[🔴 HIGH SEVERITY]"
      : severity === "medium"
        ? "[🟡 ADVISORY]"
        : "[🔵 INFO]";

  const severityPriority =
    severity === "high" ? 1 : severity === "medium" ? 2 : 3;

  // Header with severity for quick scanning
  blocks.push(
    createTextBlock(`\n\n### ${severityLabel} ${title}\n\n`, {
      priority: severityPriority,
      audience: ["user"],
    })
  );

  // Blockquoted description for visual hierarchy
  blocks.push(
    createTextBlock(`> ${description}\n\n`, {
      priority: severityPriority + 1,
      audience: ["user"],
    })
  );

  // Optional code block
  if (relatedCode) {
    blocks.push(
      createCodeBlock(
        relatedCode,
        "typescript",
        "**Example:**",
        {
          priority: severityPriority + 1,
          audience: ["user"],
        }
      )
    );
  }

  return blocks;
}

/**
 * Create a findings summary with grouped severity levels
 *
 * Formats findings in scannable sections ordered by severity
 */
function createFindingsSummary(
  findings: Array<{
    severity: "high" | "medium" | "low";
    title: string;
    description: string;
    code?: string;
  }>
): TextContent[] {
  const blocks: TextContent[] = [];

  // Group by severity
  const highSeverity = findings.filter((f) => f.severity === "high");
  const mediumSeverity = findings.filter((f) => f.severity === "medium");
  const lowSeverity = findings.filter((f) => f.severity === "low");

  // Summary header
  blocks.push(
    createTextBlock(
      `\n\n## Findings Summary (${findings.length} total)\n\n`,
      {
        priority: 1,
        audience: ["user"],
      }
    )
  );

  // High severity section
  if (highSeverity.length > 0) {
    blocks.push(
      createTextBlock(`\n\n### 🔴 High Severity (${highSeverity.length})\n\n`, {
        priority: 1,
        audience: ["user"],
      })
    );

    for (const finding of highSeverity) {
      blocks.push(...createSeverityBlock(
        "high",
        finding.title,
        finding.description,
        finding.code
      ));
    }
  }

  // Medium severity section
  if (mediumSeverity.length > 0) {
    blocks.push(
      createTextBlock(`\n\n### 🟡 Advisory (${mediumSeverity.length})\n\n`, {
        priority: 2,
        audience: ["user"],
      })
    );

    for (const finding of mediumSeverity) {
      blocks.push(...createSeverityBlock(
        "medium",
        finding.title,
        finding.description,
        finding.code
      ));
    }
  }

  // Low severity section
  if (lowSeverity.length > 0) {
    blocks.push(
      createTextBlock(`\n\n### 🔵 Info (${lowSeverity.length})\n\n`, {
        priority: 3,
        audience: ["user"],
      })
    );

    for (const finding of lowSeverity) {
      blocks.push(...createSeverityBlock(
        "low",
        finding.title,
        finding.description,
        finding.code
      ));
    }
  }

  return blocks;
}

/**
 * Extract 3-5 key points for TL;DR section
 *
 * Prioritizes useCases, then extracts from description if needed
 */
function extractTLDRPoints(
  description: string,
  useCases?: readonly string[]
): readonly string[] {
  // If useCases exist, use first 3-5 as TL;DR points
  if (useCases && useCases.length > 0) {
    return useCases.slice(0, 5);
  }

  // Otherwise, try to extract key points from description
  // Look for bullet points or numbered lists
  const bulletMatch = description?.match(/^[-•*]\s+(.+)$/gm);
  if (bulletMatch && bulletMatch.length > 0) {
    return bulletMatch.slice(0, 5).map((m) => m.replace(/^[-•*]\s+/, "").trim());
  }

  // Look for numbered lists
  const numberedMatch = description?.match(/^\d+\.\s+(.+)$/gm);
  if (numberedMatch && numberedMatch.length > 0) {
    return numberedMatch.slice(0, 5).map((m) => m.replace(/^\d+\.\s+/, "").trim());
  }

  // Fall back to splitting description into sentences
  // Take first 3-5 sentences that are substantial
  const sentences = description?.split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
    .slice(0, 5) ?? [];

  return sentences.length > 0 ? sentences : [truncateAtWordBoundary(description || "", 200)];
}

/**
 * Create table of contents with jump links
 *
 * Generates anchor links for all available sections
 */
function createTOC(hasExamples: boolean, hasUseCases: boolean, hasRelated: boolean): string {
  const links: string[] = [];

  // Always include these sections
  links.push("[What is this?](#what-is-this)");

  if (hasUseCases) {
    links.push("[What should I do?](#what-should-i-do)");
  }

  if (hasExamples) {
    links.push("[Show me the APIs](#show-me-the-apis)");
  }

  if (hasRelated) {
    links.push("[Related Patterns](#related-patterns)");
  }

  return `**Jump to:** ${links.join(" · ")}`;
}

/**
 * Pattern data structure for scan-first content building
 */
interface PatternData {
  readonly id?: string;
  readonly title: string;
  readonly category: string;
  readonly difficulty: string;
  readonly description: string;
  readonly examples?: Array<{
    readonly code: string;
    readonly language?: string;
    readonly description?: string;
  }>;
  readonly useCases?: string[];
  readonly tags?: string[];
  readonly relatedPatterns?: string[];
}

/**
 * Extract API names from tags or code examples
 */
function extractAPINames(pattern: PatternData): readonly string[] {
  const apiNames: string[] = [];
  if (!pattern) return apiNames;

  // Extract from tags (e.g., "Effect.all", "Effect.forEach")
  if (pattern.tags) {
    for (const tag of pattern.tags) {
      if (tag.includes("Effect.") || tag.includes("Layer.") || tag.includes("Stream.")) {
        apiNames.push(tag);
      }
    }
  }

  // Extract from code examples if not found in tags
  if (apiNames.length === 0 && pattern.examples) {
    for (const example of pattern.examples) {
      const matches = example.code?.match(/\b(Effect|Layer|Stream|Schedule|Metric|Ref|Queue|PubSub)\.\w+/g);
      if (matches) {
        apiNames.push(...matches);
      }
    }
  }

  // Remove duplicates and return
  return Array.from(new Set(apiNames)).slice(0, 5);
}

/**
 * Extract "Use when" from useCases or description
 */
function extractUseWhen(pattern: PatternData): string {
  if (!pattern) return "";
  if (pattern.useCases && pattern.useCases.length > 0) {
    return pattern.useCases[0];
  }

  // Extract first sentence from description
  const firstSentence = pattern.description?.split(/[.!?]+/)[0]?.trim() ?? "";
  return firstSentence.length > 0 ? firstSentence : truncateAtWordBoundary(pattern.description || "", 100);
}

/**
 * Extract "Avoid when" from tags or infer from context
 */
function extractAvoidWhen(pattern: PatternData): string | undefined {
  if (!pattern) return undefined;
  // Look for "avoid" or "not" in useCases
  if (pattern.useCases) {
    const avoidCase = pattern.useCases.find(
      (uc) => uc.toLowerCase().includes("avoid") || uc.toLowerCase().includes("not")
    );
    if (avoidCase) {
      return avoidCase;
    }
  }

  // Look for "avoid" in description
  const avoidMatch = pattern.description?.match(/avoid[^.!?]*[.!?]/i);
  if (avoidMatch) {
    return avoidMatch[0].trim();
  }

  return undefined;
}

/**
 * Truncate code example to max lines
 */
function truncateCodeExample(code: string, maxLines: number = 20): string {
  const lines = code.split("\n");
  if (lines.length <= maxLines) {
    return code;
  }

  return lines.slice(0, maxLines).join("\n") + "\n// ...";
}

/**
 * Extract notes from remaining useCases or description
 */
function extractNotes(pattern: PatternData): readonly string[] {
  const notes: string[] = [];
  if (!pattern) return notes;

  // Use remaining useCases (skip first one used for "Use when")
  if (pattern.useCases && pattern.useCases.length > 1) {
    notes.push(...pattern.useCases.slice(1, 3));
  }

  // If not enough notes, extract from description
  if (notes.length < 2 && pattern.description) {
    const sentences = pattern.description
      ?.split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20 && s.length < 150)
      .slice(2, 4); // Skip first 2 sentences (used for summary)
    notes.push(...sentences);
  }

  return notes.slice(0, 2);
}

/**
 * Build pattern card content optimized for quick comparison
 *
 * Card structure:
 * - Name (pattern title)
 * - Use when (1 line)
 * - Avoid when (1 line, optional)
 * - API (chips: Effect.all, Effect.forEach)
 * - Minimal example (10–20 lines max)
 * - Notes (1–2 bullets)
 *
 * FORMATTING: Each card starts with title on its own line,
 * marker on its own line, then content with proper spacing.
 *
 * RETURNS: Single TextContent block containing the entire card.
 * This ensures each card is treated as a distinct UI component.
 */
function buildScanFirstPatternContent(pattern: PatternData): TextContent {
  // Build card content as a single string to ensure it's treated as ONE UI block
  const parts: string[] = [];

  // Visual "UI Signature" - Official border to prevent model overwrite
  // This makes it visually obvious if the model is "summarizing" (no borders) or "rendering" (borders present)
  parts.push(`\n\n╔═══════════════════════════════════════════════════════════════╗\n`);
  parts.push(`║                    OFFICIAL EFFECT PATTERN                      ║\n`);
  parts.push(`╚═══════════════════════════════════════════════════════════════╝\n\n`);

  // Card Header: Name with proper spacing
  parts.push(`# ${pattern.title}\n\n`);

  // Hidden presentation marker - strictly separated from header by \n\n
  // This ensures Cursor identifies it as a distinct UI marker
  parts.push(`${MARKER_PATTERN_CARD_V1}\n\n`);

  // Category/difficulty badges
  parts.push(`**Category:** ${pattern.category} | **Difficulty:** ${pattern.difficulty}\n`);

  // Full Description (up to 1000 chars, word-boundary truncated)
  // This ensures the card is "rich" and complete, preventing follow-up calls
  if (pattern.description) {
    const fullDescription = truncateAtWordBoundary(pattern.description, 1000);
    parts.push(`\n**Description:**\n\n${fullDescription}\n`);
  }

  // Use when (1 line)
  const useWhen = extractUseWhen(pattern);
  parts.push(`\n**Use when:** ${useWhen}\n`);

  // Avoid when (1 line, optional)
  const avoidWhen = extractAvoidWhen(pattern);
  if (avoidWhen) {
    parts.push(`\n**Avoid when:** ${avoidWhen}\n`);
  }

  // API chips
  const apiNames = extractAPINames(pattern);
  if (apiNames.length > 0) {
    const apiChips = apiNames.map((api) => `\`${api}\``).join(" ");
    parts.push(`\n**API:** ${apiChips}\n`);
  }

  // Default vs Recommended (infer from tags or pattern context)
  const isRecommended = pattern.tags?.some((tag) =>
    tag.toLowerCase().includes("recommended") || tag.toLowerCase().includes("preferred")
  );
  const isDefault = pattern.tags?.some((tag) => tag.toLowerCase().includes("default"));
  
  if (isRecommended || isDefault) {
    const defaultVsRecommended = isRecommended
      ? "**Recommended** (preferred approach)"
      : isDefault
        ? "**Default** (standard approach)"
        : undefined;
    
    if (defaultVsRecommended) {
      parts.push(`\n${defaultVsRecommended}\n`);
    }
  }

  // Minimal example (10–20 lines max) - REQUIRED for rich cards
  // This ensures agents don't need follow-up calls to get code examples
  if (pattern.examples && pattern.examples.length > 0) {
    const firstExample = pattern.examples[0];
    const truncatedCode = truncateCodeExample(firstExample.code, 20);
    const language = firstExample.language || "typescript";
    parts.push(`\n**Example:**\n\n\`\`\`${language}\n${truncatedCode}\n\`\`\`\n`);
  } else {
    // Fallback: Provide link to full pattern if no example available
    parts.push(`\n**Example:** [View Full Pattern Details](#pattern-${pattern.id})\n`);
  }

  // Notes (1–2 bullets)
  const notes = extractNotes(pattern);
  if (notes.length > 0) {
    const notesText = notes.map((note) => `- ${note}`).join("\n");
    parts.push(`\n**Notes:**\n\n${notesText}\n`);
  }

  // Related Patterns (if available)
  if (pattern.relatedPatterns && pattern.relatedPatterns.length > 0) {
    const relatedText = `**Related:** ${pattern.relatedPatterns.slice(0, 3).join(", ")}`;
    parts.push(`\n${relatedText}\n`);
  }

  // Close visual border
  parts.push(`\n╔═══════════════════════════════════════════════════════════════╗\n`);
  parts.push(`║              END OF OFFICIAL EFFECT PATTERN                    ║\n`);
  parts.push(`╚═══════════════════════════════════════════════════════════════╝\n`);

  // Return as SINGLE TextContent block with strong annotations
  // This signals to the model: "This is a final UI component; do not modify"
  return createTextBlock(parts.join(""), {
    priority: 1,
    audience: ["user"],
  });
}

/**
 * Build an index table for search results
 *
 * Optimized: Pre-allocates buffer for string building (avoids quadratic concat)
 * FORMATTING: Marker on its own line, table properly spaced
 */
interface SearchResultsPayload {
  readonly count: number;
  readonly patterns: readonly PatternData[];
}

function buildIndexTable(patterns: readonly PatternData[]): string {
  if (patterns.length === 0)
    return "╔════════ SYSTEM ERROR ════════╗\nNO PATTERNS FOUND IN DATABASE.\n╚══════════════════════════════╝";

  // Pre-allocate buffer and use single join pass (O(N) instead of O(N²))
  const rows: string[] = [];
  
  // Hidden marker - strictly separated from content by \n\n
  // This ensures Cursor identifies it as a distinct UI marker
  rows.push(`\n\n${MARKER_PATTERN_INDEX_V1}\n\n`);
  
  // Table header
  rows.push("| Pattern | Category | Difficulty | Tags |");
  rows.push("| :--- | :--- | :--- | :--- |");

  for (const p of patterns) {
    const tags = p.tags ? p.tags.join(", ") : "";
    rows.push(
      `| **${p.title}** (\`${p.id}\`) | ${p.category} | ${p.difficulty} | ${tags} |`
    );
  }

  return rows.join("\n");
}

/**
 * Build search results content with index table and top N cards
 *
 * Performance Optimizations:
 * - Index table rendered once (not per pattern)
 * - Card rendering limited to N=3 by default (configurable)
 * - Lazy pagination: full results available via index, top cards highlighted
 *
 * FORMATTING:
 * - Headers have double newlines before and after
 * - Cards are separated by horizontal rules (---)
 * - Markers are on their own lines
 */
function buildSearchResultsContent(
  results: SearchResultsPayload,
  options: {
    limitCards?: number;
    includeProvenancePanel?: boolean;
    query?: string;
  } = {}
): TextContent[] {
  const content: TextContent[] = [];
  // Default to 10 cards; max 10 to prevent runaway rendering
  const limitCards = Math.min(options.limitCards ?? 10, 10);
  const normalizePriority = (blocks: TextContent[]): TextContent[] =>
    blocks.map((block) => {
      if (!block.annotations) return block;
      return {
        ...block,
        annotations: {
          ...block.annotations,
          priority: 1,
        },
      };
    });

  // 1. Summary Header with proper spacing
  const queryInfo = options.query ? ` for "${options.query}"` : "";
  
  content.push(
    createTextBlock(
      `## [LIVE-BUILD-v1] OFFICIAL EFFECT PATTERN SEARCH${queryInfo}\n\nFound **${results.count}** matching patterns. Detailed documentation for the top results follows. Use pattern IDs from the Index with 'get_pattern' for additional deep-dives.\n`,
      {
        priority: 1,
        audience: ["user"],
      }
    )
  );

  // 2. Index Table with proper header spacing
  content.push(
    createTextBlock(`\n\n## Index\n\n${buildIndexTable(results.patterns)}\n`, {
      priority: 1,
      audience: ["user"],
    })
  );

  // 3. Top N Cards - Each card is a SINGLE distinct block
  // This multi-block partitioning prevents model overwrite
  if (results.patterns.length > 0 && limitCards > 0) {
    const displayCount = Math.min(results.patterns.length, limitCards);
    
    // Section header as separate block
    content.push(
      createTextBlock(`\n\n## Top ${displayCount} Patterns\n`, {
        priority: 2,
        audience: ["user"],
      })
    );

    // Each card is ONE block - prevents model from merging/summarizing
    for (let i = 0; i < displayCount; i++) {
      const pattern = results.patterns[i];
      // Each card is returned as a SINGLE TextContent block
      const cardBlock = buildScanFirstPatternContent(pattern);
      content.push(cardBlock);
      
      // Separator as distinct block (not after the last card)
      if (i < displayCount - 1) {
        content.push(
          createTextBlock("\n\n---\n\n", {
            priority: 1,
            audience: ["user"],
          })
        );
      }
    }
  }

  // 4. Provenance Panel (if requested)
  if (options.includeProvenancePanel) {
    const provenance = {
      source: "Effect Patterns API",
      timestamp: new Date().toISOString(),
      version: "pps-v2",
      buildSha: "local-dev",
      query: options.query,
      resultCount: results.count,
    };

    content.push(
      createTextBlock(
        `\n\n---\n\n<details>\n<summary>Provenance</summary>\n\n\`\`\`json\n${JSON.stringify(provenance, null, 2)}\n\`\`\`\n</details>\n`,
        {
          priority: 1,
          audience: ["user"],
        }
      )
    );
  }

  return normalizePriority(content);
}

export {
  buildPatternContent, buildScanFirstPatternContent,
  buildSearchResultsContent, buildViolationContent, createAnnotatedDiff,
  createAntiPatternAnnotation, createCodeBlock, createFindingsSummary, createPatternAnnotation, createSeverityBlock, createTextBlock, createTOC, extractTLDRPoints, type MCPAnnotations,
  type TextContent
};

