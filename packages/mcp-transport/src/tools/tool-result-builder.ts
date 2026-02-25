/**
 * Tool Result Builders
 *
 * Converts API results into MCP CallToolResult responses with proper
 * error classification, format gating, and structured content.
 *
 * Extracted from tool-implementations.ts for independent testability.
 */

import {
  buildFullPatternCard,
} from "@/mcp-content-builders.js";
import { MARKER_PATTERN_INDEX_V1 } from "@/constants/markers.js";
import type {
  SearchResultsOutput,
  ToolError,
} from "@/schemas/output-schemas.js";
import type { TextContent } from "@/schemas/structured-output.js";
import { extractApiNames } from "@/tools/tool-shared.js";
import type {
  ApiResult,
  CallApiFn,
  CallToolResult,
  LogFn,
  SearchResultsPayload,
} from "@/tools/tool-types.js";
import type { SearchPatternsArgs } from "@/schemas/tool-schemas.js";

/**
 * Build rich search content from search summaries.
 * Falls back to per-pattern detail fetch only when required card fields are missing.
 * Returns an array of TextContent blocks for markdown rendering.
 */
export async function buildFullSearchContent(
  data: SearchResultsPayload,
  args: SearchPatternsArgs,
  callApi: CallApiFn,
  renderedCards: number,
): Promise<TextContent[]> {
  const content: TextContent[] = [];
  const queryInfo = args.q ? ` for "${args.q}"` : "";

  content.push({
    type: "text",
    text: `## Effect Pattern Search${queryInfo}\nFound **${data.count}** patterns.\n\n`,
    annotations: { priority: 1, audience: ["user"] },
  });
  content.push({
    type: "text",
    text: `\n\n${MARKER_PATTERN_INDEX_V1}\n\n`,
    annotations: { priority: 1, audience: ["user"] },
  });

  if (data.patterns.length === 0 || renderedCards === 0) {
    return content;
  }

  const canRenderFromSummary = (summary: SearchResultsPayload["patterns"][number]) =>
    Boolean(summary.examples && summary.examples.length > 0 && summary.examples[0]?.code);

  const buildCardFromSummary = (
    summary: SearchResultsPayload["patterns"][number],
  ): TextContent[] => {
    const summaryText = summary.description || "No summary available.";
    const useWhenText =
      summary.useCases && summary.useCases.length > 0
        ? summary.useCases[0]
        : summaryText;
    const example = summary.examples && summary.examples.length > 0 ? summary.examples[0] : undefined;
    const exampleCode = example?.code || "// No example available for this pattern.";
    const apiNames = extractApiNames(exampleCode);

    return buildFullPatternCard({
      title: summary.title,
      summary: summaryText,
      rationale: summaryText,
      useWhen: useWhenText,
      apiNames,
      exampleCode,
      exampleLanguage: example?.language || "typescript",
    });
  };

  for (let i = 0; i < renderedCards; i++) {
    const summary = data.patterns[i]!;
    if (canRenderFromSummary(summary)) {
      content.push(...buildCardFromSummary(summary));
    } else {
      const detailResult = await callApi(
        `/patterns/${encodeURIComponent(summary.id)}`,
      );

      if (detailResult.ok && detailResult.data) {
        const detailEnvelope = detailResult.data as any;
        const detail = detailEnvelope.pattern ?? detailEnvelope;
        const mergedSummary = {
          ...summary,
          title: detail.title || summary.title,
          description: detail.summary || detail.description || summary.description,
          useCases:
            detail.useCases && detail.useCases.length > 0
              ? detail.useCases
              : summary.useCases,
          examples:
            detail.examples && detail.examples.length > 0
              ? detail.examples
              : summary.examples,
        };
        content.push(...buildCardFromSummary(mergedSummary));
      } else {
        content.push(...buildCardFromSummary(summary));
      }
    }

    if (i < renderedCards - 1) {
      content.push({
        type: "text",
        text: "\n\n---\n\n",
        annotations: { priority: 1, audience: ["user"] },
      });
    }
  }

  return content;
}

/**
 * Helper to convert API result to tool result - supports both plain text and rich content.
 *
 * NETWORK_ERROR classification:
 * - When fetch fails (TypeError, timeout, connection refused, etc.), return code: "NETWORK_ERROR"
 * - Populate details with error.message, error.cause, and other diagnostic info
 */
export function toToolResult(
  result: ApiResult<unknown>,
  toolName: string,
  log: LogFn,
  richContent?: (TextContent | { type: "text"; text: string })[],
  format: "markdown" | "json" | "both" = "markdown",
): CallToolResult {
  if (result.ok) {
    // If rich content provided, use it; otherwise fall back to JSON
    if (richContent && richContent.length > 0) {
      // Respect format gating for success responses
      const content: CallToolResult["content"] = [];

      if (format === "markdown" || format === "both") {
        content.push(...richContent.map((block) => ({
          ...block,
          mimeType: "text/markdown" as const,
        })));
      }

      if (format === "json" || format === "both") {
        content.push({
          type: "text" as const,
          text: JSON.stringify(result.data, null, 2),
          mimeType: "application/json" as const,
        });
      }

      return {
        content,
        structuredContent: result.data as Record<string, unknown>,
      };
    }

    // No rich content - JSON response only
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result.data),
          mimeType: "application/json" as const,
        },
      ],
      structuredContent: result.data as Record<string, unknown>,
    };
  }

  // ============================================================================
  // ERROR PATH: Build structured error response
  // ============================================================================

  // Extract error message - may be JSON string from API, try to parse it
  let errorMessage = "error" in result ? result.error : "Unknown error";
  const statusCode = "status" in result ? result.status : undefined;

  // If error message is JSON, try to parse it and extract the error field
  if (typeof errorMessage === "string" && errorMessage.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(errorMessage);
      if (typeof parsed === "object" && parsed !== null) {
        // Prefer "message" field, then "error" field, then use the whole JSON string
        errorMessage = parsed.message || parsed.error || errorMessage;
      }
    } catch {
      // Not valid JSON, use as-is
    }
  }

  // Extract diagnostic details from ApiResult if available
  const resultDetails = "details" in result ? result.details : undefined;

  // Determine error code and retryability
  let errorCode = "NETWORK_ERROR"; // Default to NETWORK_ERROR for fetch failures
  let retryable = true; // Network errors are retryable by default

  // Use retryability from details if available
  if (resultDetails?.retryable !== undefined) {
    retryable = resultDetails.retryable;
  }

  // Classify based on HTTP status code (if available)
  if (statusCode) {
    if (statusCode >= 500) {
      errorCode = "SERVER_ERROR";
      retryable = true; // 5xx errors are retryable
    } else if (statusCode === 404) {
      errorCode = "NOT_FOUND";
      retryable = false;
    } else if (statusCode === 401 || statusCode === 403) {
      errorCode = "AUTHENTICATION_ERROR";
      retryable = false;
    } else if (statusCode >= 400) {
      errorCode = "CLIENT_ERROR";
      retryable = false;
    }
  } else if (resultDetails?.errorType) {
    // No HTTP status - this is a network-level failure
    // Keep errorCode as NETWORK_ERROR, classify based on errorType
    const errorType = resultDetails.errorType;
    if (errorType === "timeout") {
      errorCode = "NETWORK_ERROR";
      retryable = true;
    } else if (errorType === "connection_refused" || errorType === "dns_error") {
      errorCode = "NETWORK_ERROR";
      retryable = true;
    } else if (errorType === "tls_error") {
      errorCode = "NETWORK_ERROR";
      retryable = false; // TLS errors are not retryable
    } else {
      // Default network error
      errorCode = "NETWORK_ERROR";
      retryable = true;
    }
  } else if (
    errorMessage.toLowerCase().includes("fetch failed") ||
    errorMessage.toLowerCase().includes("network") ||
    errorMessage.toLowerCase().includes("timeout")
  ) {
    // Infer from error message
    errorCode = "NETWORK_ERROR";
    retryable = true;
  }

  log(`Tool error: ${toolName}`, {
    error: errorMessage,
    code: errorCode,
    status: statusCode,
    details: resultDetails,
  });

  // Build structured error with diagnostic details
  const structuredError: ToolError = {
    kind: "toolError:v1",
    code: errorCode,
    message: errorMessage,
    retryable,
    details: {
      ...(statusCode !== undefined && { statusCode }),
      ...(resultDetails?.apiHost && { apiHost: resultDetails.apiHost }),
      ...(resultDetails?.hasApiKey !== undefined && {
        hasApiKey: resultDetails.hasApiKey,
      }),
      ...(resultDetails?.errorName && { errorName: resultDetails.errorName }),
      ...(resultDetails?.errorType && { errorType: resultDetails.errorType }),
      ...(resultDetails?.errorMessage && { errorMessage: resultDetails.errorMessage }),
      ...(resultDetails?.cause && { cause: resultDetails.cause }),
    },
  };

  // Ensure JSON-serializable (removes undefined)
  const serializableError = JSON.parse(JSON.stringify(structuredError));

  // Build content respecting format gating
  const content: CallToolResult["content"] = [];

  // Include error message when format includes markdown
  if (format === "markdown" || format === "both") {
    content.push({
      type: "text" as const,
      text: `**Error:** ${errorMessage}`,
      mimeType: "text/markdown" as const,
    });
  }

  // Include JSON block when format includes JSON
  if (format === "json" || format === "both") {
    content.push({
      type: "text" as const,
      text: JSON.stringify(serializableError, null, 2),
      mimeType: "application/json" as const,
    });
  }

  return {
    content,
    structuredContent: serializableError,
    isError: true,
  };
}

/**
 * Build a zero-results response with Discovery Card.
 * Returns proper markdown and structured content for the "no patterns found" case.
 * Includes a Discovery Card with all available categories and 5 suggested patterns.
 */
export async function buildZeroResultsResponse(
  query: string,
  format: "markdown" | "json" | "both",
  callApi: CallApiFn
): Promise<CallToolResult> {
  // Fetch discovery data: all patterns to extract categories and popular patterns
  const allPatternsResult = await callApi("/patterns?limit=1000");

  let categories: string[] = []
  let suggestedPatterns: Array<{ id: string; title: string }> = []
  let firstTenPatternIds: string[] = []

  if (allPatternsResult.ok && allPatternsResult.data) {
    const data = allPatternsResult.data as SearchResultsPayload
    // Extract unique categories
    categories = Array.from(new Set(data.patterns.map((p) => p.category).filter(Boolean)))
    // Get first 10 pattern IDs for system catalog
    firstTenPatternIds = data.patterns
      .slice(0, 10)
      .map((p) => p.id)
    // Get 5 popular patterns (first 5 from results, or common ones)
    suggestedPatterns = data.patterns
      .slice(0, 5)
      .map((p) => ({ id: p.id, title: p.title }))
  }

  // If we couldn't fetch discovery data, use fallback values
  if (categories.length === 0) {
    categories = [
      "error-handling",
      "validation",
      "service",
      "composition",
      "concurrency",
      "streams",
      "resource",
      "scheduling",
    ]
  }

  if (suggestedPatterns.length === 0) {
    suggestedPatterns = [
      { id: "effect-service", title: "Effect Service" },
      { id: "error-handling-match", title: "Error Handling with Match" },
      { id: "layer-composition", title: "Layer Composition" },
      { id: "retry-schedule", title: "Retry with Schedule" },
      { id: "stream-processing", title: "Stream Processing" },
    ]
  }

  // Build SYSTEM CATALOG section for definitive fallback
  // MUST include 10 real pattern IDs from DB to stop agent guessing
  const systemCatalogSection = firstTenPatternIds.length > 0
    ? `╔════════ OFFICIAL SYSTEM CATALOG ════════╗\nNO EXACT MATCHES FOUND FOR '${query}'.\nHERE ARE THE TOP 10 AVAILABLE PATTERN IDs:\n${firstTenPatternIds.map((id) => `- \`${id}\``).join("\n")}\n╚════════════════════════════════════════╝\n\n`
    : ""

  // Build Discovery Card with Official Borders
  const discoveryCard = `\n\n╔═══════════════════════════════════════════════════════════════╗\n║                    OFFICIAL EFFECT PATTERN                      ║\n╚═══════════════════════════════════════════════════════════════╝\n\n## No Patterns Found\n\nNo patterns found for "${query}".\n\n${systemCatalogSection}### Discovery Card\n\n**Available Categories:**\n\n${categories.map((cat) => `- \`${cat}\``).join("\n")}\n\n**Suggested Patterns:**\n\n${suggestedPatterns.map((p) => `- \`${p.id}\` - ${p.title}`).join("\n")}\n\n**Tips:**\n- Try searching by category (e.g., \`category: error-handling\`)\n- Use broader terms (e.g., "error" instead of "error-handling-v3")\n- Check spelling\n- Try related concepts (e.g., "retry" instead of "resilience")\n\n╔═══════════════════════════════════════════════════════════════╗\n║              END OF OFFICIAL EFFECT PATTERN                    ║\n╚═══════════════════════════════════════════════════════════════╝\n`

  const structuredContent: SearchResultsOutput = {
    kind: "patternSearchResults:v1",
    query: { q: query, format },
    metadata: {
      totalCount: 0,
      renderedCards: 0,
      renderedCardIds: [],
      contractMarkers: {
        index: 0,
        cards: 0,
        version: "v1",
      },
      categories: categories.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {}),
    },
    patterns: [],
  };

  const content: CallToolResult["content"] = [];

  if (format === "markdown" || format === "both") {
    content.push({
      type: "text" as const,
      text: discoveryCard,
      mimeType: "text/markdown" as const,
    });
  }

  if (format === "json" || format === "both") {
    content.push({
      type: "text" as const,
      text: JSON.stringify(structuredContent, null, 2),
      mimeType: "application/json" as const,
    });
  }

  return {
    content,
    structuredContent,
  };
}
