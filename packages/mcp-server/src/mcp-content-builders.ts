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
 */

import type { TextContent } from "@modelcontextprotocol/sdk/shared/messages.js";

/**
 * MCP 2.0 Annotation structure
 */
interface MCPAnnotations {
  readonly audience?: readonly string[];
  readonly priority?: number;
  readonly lastModified?: string;
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
      createTextBlock(explanation, {
        priority: 1,
        audience: ["user"],
      })
    );
  }

  // Create "Before" section
  diffContent.push(
    createTextBlock(
      "**Before (v3 style)**",
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
      "**After (v4 style)**",
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
  message: string,
  line?: number
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
  pattern: string,
  explanation: string,
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

  // Title
  content.push(
    createTextBlock(`# ${title}`, {
      priority: 1,
      audience: ["user"],
    })
  );

  // Description
  content.push(
    createTextBlock(description, {
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
    const useCasesText = `**Use Cases:**\n\n${useCases.map((uc) => `- ${uc}`).join("\n")}`;
    content.push(
      createTextBlock(useCasesText, {
        priority: 3,
        audience: ["user"],
      })
    );
  }

  // Related patterns
  if (relatedPatterns && relatedPatterns.length > 0) {
    const relatedText = `**Related Patterns:**\n\n${relatedPatterns.map((rp) => `- ${rp}`).join("\n")}`;
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
    createTextBlock(`## ${severityLabel} ${ruleName}`, {
      priority: 1,
      audience: ["user"],
    })
  );

  // Blockquoted message for visual separation
  content.push(
    createTextBlock(`> **Issue:** ${message}`, {
      priority: 1,
      audience: ["user"],
    })
  );

  if (example) {
    content.push(
      createTextBlock("### Problematic Pattern", {
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
    createTextBlock("### How to Fix", {
      priority: 3,
      audience: ["user"],
    })
  );

  content.push(
    createTextBlock(`> ${remediation}`, {
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
    createTextBlock(`### ${severityLabel} ${title}`, {
      priority: severityPriority,
      audience: ["user"],
    })
  );

  // Blockquoted description for visual hierarchy
  blocks.push(
    createTextBlock(`> ${description}`, {
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
      `## Findings Summary (${findings.length} total)`,
      {
        priority: 1,
        audience: ["user"],
      }
    )
  );

  // High severity section
  if (highSeverity.length > 0) {
    blocks.push(
      createTextBlock(`### 🔴 High Severity (${highSeverity.length})`, {
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
      createTextBlock(`### 🟡 Advisory (${mediumSeverity.length})`, {
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
      createTextBlock(`### 🔵 Info (${lowSeverity.length})`, {
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

export {
  createTextBlock,
  createCodeBlock,
  createAnnotatedDiff,
  createAntiPatternAnnotation,
  createPatternAnnotation,
  buildPatternContent,
  buildViolationContent,
  createSeverityBlock,
  createFindingsSummary,
  type MCPAnnotations,
  type TextContent,
};
