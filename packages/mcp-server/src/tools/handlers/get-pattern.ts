/**
 * get_pattern Tool Handler
 *
 * Handles the get_pattern MCP tool. Returns full pattern details
 * with elicitation, caching, format gating, and migration diff support.
 */

import {
  MARKER_PATTERN_CARD_V1,
} from "@/constants/markers.js";
import {
  buildFullPatternCard,
} from "@/mcp-content-builders.js";
import type {
  PatternDetailsOutput,
} from "@/schemas/output-schemas.js";
import type { GetPatternArgs } from "@/schemas/tool-schemas.js";
import { generatePatternCacheKey } from "@/tools/cache-keys.js";
import { elicitPatternId } from "@/tools/elicitation-helpers.js";
import {
  generateMigrationDiff,
  isMigrationPattern,
} from "@/services/pattern-diff-generator/api.js";
import { toToolResult } from "@/tools/tool-result-builder.js";
import {
  extractApiNames,
  normalizeContentBlocks,
  recordPatternHit,
  recordPatternMiss,
  truncateAtWordBoundary,
} from "@/tools/tool-shared.js";
import type {
  CallToolResult,
  SearchResultsPayload,
  ToolContext,
} from "@/tools/tool-types.js";

export async function handleGetPattern(
  args: GetPatternArgs,
  ctx: ToolContext,
): Promise<CallToolResult> {
  const { callApi, log, cache } = ctx;
  log("Tool called: get_pattern", args);

  const format = args.format || "markdown";
  const includeStructuredDetails =
    args.includeStructuredDetails ?? true;

  // Elicitation: Check for missing/invalid pattern ID
  if (!args.id || args.id.trim().length === 0) {
    const elicitation = elicitPatternId("");
    // Gate content by format
    const content: CallToolResult["content"] = [];

    if (format === "markdown" || format === "both") {
      content.push(...elicitation.content);
    }

    if (format === "json" || format === "both") {
      content.push({
        type: "text" as const,
        text: JSON.stringify(elicitation.structuredContent, null, 2),
        mimeType: "application/json" as const,
      });
    }

    return {
      content: normalizeContentBlocks(content),
      structuredContent: elicitation.structuredContent,
    };
  }

  // Use centralized cache key generator with format and details params
  const baseCacheKey = generatePatternCacheKey(args.id);
  const cacheKey = `${baseCacheKey}:format=${format}:details=${includeStructuredDetails}`;

  // Try cache first (30 min TTL for individual patterns)
  if (cache) {
    const cached = cache.get(cacheKey);
    if (cached) {
      recordPatternHit();
      log(`Cache hit: ${cacheKey}`);
      return {
        ...cached,
        content: normalizeContentBlocks(cached.content || []),
      };
    }
    recordPatternMiss();
  }

  const result = await callApi(`/patterns/${encodeURIComponent(args.id)}`);

  // Elicitation: Pattern not found
  if (!result.ok && "status" in result && result.status === 404) {
    // Try to get suggestions from search API
    const searchResult = await callApi(
      `/patterns?q=${encodeURIComponent(args.id)}&limit=5`,
    );
    const suggestions: string[] = [];
    if (searchResult.ok && searchResult.data) {
      const searchData = searchResult.data as SearchResultsPayload;
      suggestions.push(...searchData.patterns.slice(0, 5).map((p) => p.id));
    }

    const elicitation = elicitPatternId(
      args.id,
      suggestions.length > 0 ? suggestions : undefined,
    );

    // Gate content by format
    const content: CallToolResult["content"] = [];

    if (format === "markdown" || format === "both") {
      content.push(...elicitation.content);
    }

    if (format === "json" || format === "both") {
      content.push({
        type: "text" as const,
        text: JSON.stringify(elicitation.structuredContent, null, 2),
        mimeType: "application/json" as const,
      });
    }

    return {
      content: normalizeContentBlocks(content),
      structuredContent: elicitation.structuredContent,
    };
  }

  // Check if this is a migration pattern and return annotated diff
  if (result.ok && isMigrationPattern(args.id)) {
    const diffContent = generateMigrationDiff(args.id);
    const structuredContent: PatternDetailsOutput = {
      kind: "patternDetails:v1",
      id: args.id,
      title: "Migration Pattern",
      category: "migration",
      difficulty: "intermediate" as const,
      summary: "Migration guide pattern",
      description: "This pattern shows migration from v3 to v4",
      provenance: {
        source: "Effect Patterns API",
        timestamp: new Date().toISOString(),
        version: "pps-v2",
        marker: "v1",
      },
    };
    const jsonContent = JSON.parse(JSON.stringify(structuredContent));

    // Build content respecting format gating
    const content: CallToolResult["content"] = [];

    if (format === "markdown" || format === "both") {
      content.push(
        ...diffContent.map((block) => ({
          ...block,
          mimeType: "text/markdown" as const,
        })),
      );
    }

    if (format === "json" || format === "both") {
      content.push({
        type: "text" as const,
        text: JSON.stringify(jsonContent, null, 2),
        mimeType: "application/json" as const,
      });
    }

    const toolResult: CallToolResult = {
      content: normalizeContentBlocks(content),
      structuredContent: jsonContent,
    };
    // Cache migration patterns (longer TTL: 60 min)
    if (cache) {
      cache.set(cacheKey, toolResult, 60 * 60 * 1000);
    }
    return toolResult;
  }

  // For regular patterns, build scan-first content optimized for quick scanning
  if (result.ok && result.data) {
    const patternEnvelope = result.data as any;
    const pattern = patternEnvelope.pattern ?? patternEnvelope;
    // buildScanFirstPatternContent now returns a SINGLE TextContent block
    const summaryText = pattern.summary || pattern.description;
    const rationaleText = pattern.description;
    const useWhenText =
      pattern.useCases && pattern.useCases.length > 0
        ? pattern.useCases[0]
        : summaryText;
    const example = pattern.examples && pattern.examples.length > 0 ? pattern.examples[0] : undefined;
    const exampleCode = example?.code || "// No example available for this pattern.";
    const apiNames = extractApiNames(exampleCode);

    const cardBlock = buildFullPatternCard({
      title: pattern.title,
      summary: summaryText,
      rationale: rationaleText,
      useWhen: useWhenText,
      apiNames,
      exampleCode,
      exampleLanguage: example?.language || "typescript",
      headingLevel: 1,
    });

    const wantsDetailedStructured =
      includeStructuredDetails && (format === "json" || format === "both");

    // Extract use guidance only when detailed structured output is needed
    const useWhen = wantsDetailedStructured
      ? pattern.useCases && pattern.useCases.length > 0
        ? pattern.useCases[0]
        : pattern.description?.split(/[.!?]+/)[0]?.trim() ?? ""
      : undefined;

    const avoidWhen = wantsDetailedStructured
      ? pattern.useCases?.find(
          (uc: string) =>
            uc.toLowerCase().includes("avoid") ||
            uc.toLowerCase().includes("not"),
        ) || pattern.description?.match(/avoid[^.!?]*[.!?]/i)?.[0]?.trim()
      : undefined;

    // Build sections only when detailed structured output is needed
    const sections: PatternDetailsOutput["sections"] | undefined =
      wantsDetailedStructured ? [] : undefined;
    if (sections && pattern.description) {
      sections.push({
        title: "Description",
        content: pattern.description,
        type: "description",
      });
    }
    if (sections && pattern.examples && pattern.examples.length > 0) {
      for (const ex of pattern.examples) {
        sections.push({
          title: ex.description || "Example",
          content: ex.code,
          type: "example",
        });
      }
    }
    if (sections && pattern.useCases && pattern.useCases.length > 0) {
      for (const useCase of pattern.useCases) {
        sections.push({
          title: "Use Case",
          content: useCase,
          type: "useCase",
        });
      }
    }
    if (
      sections &&
      pattern.relatedPatterns &&
      pattern.relatedPatterns.length > 0
    ) {
      sections.push({
        title: "Related Patterns",
        content: pattern.relatedPatterns.join(", "),
        type: "related",
      });
    }

    // Count markers in content (now a single block)
    const markdownText = cardBlock.map((b) => b.text).join("\n");
    const cardMarkerCount = (
      markdownText.match(
        new RegExp(
          MARKER_PATTERN_CARD_V1.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "g",
        ),
      ) || []
    ).length;

    const descriptionText = includeStructuredDetails
      ? pattern.description
      : truncateAtWordBoundary(pattern.description, 400);

    const structuredContent: PatternDetailsOutput = {
      kind: "patternDetails:v1",
      id: pattern.id || args.id,
      title: pattern.title,
      category: pattern.category,
      difficulty: pattern.difficulty as
        | "beginner"
        | "intermediate"
        | "advanced",
      summary: truncateAtWordBoundary(pattern.description, 200),
      description: descriptionText,
      tags: includeStructuredDetails ? pattern.tags : undefined,
      useGuidance: wantsDetailedStructured
        ? {
            useWhen,
            avoidWhen,
          }
        : undefined,
      sections: wantsDetailedStructured ? sections : undefined,
      examples: wantsDetailedStructured
        ? pattern.examples?.map((ex: any) => ({
            code: ex.code,
            language: ex.language || "typescript",
            description: ex.description,
          }))
        : undefined,
      provenance: wantsDetailedStructured
        ? {
            source: "Effect Patterns API",
            timestamp: new Date().toISOString(),
            version: "pps-v2",
            marker: cardMarkerCount > 0 ? "v1" : undefined,
          }
        : undefined,
    };

    // Ensure structuredContent is JSON-serializable
    const serializableStructuredContent = JSON.parse(
      JSON.stringify(structuredContent),
    );

    if (process.env.MCP_DEBUG === "true") {
      const structuredSize = JSON.stringify(serializableStructuredContent).length;
      log("[DIAGNOSTIC] structuredContent size (chars)", {
        structuredSize,
        includeStructuredDetails,
        format,
      });
    }

    // Build content respecting format gating
    // Card is a SINGLE block to prevent model overwrite
    const content: CallToolResult["content"] = [];

    if (format === "markdown" || format === "both") {
      content.push(
        ...cardBlock.map((block) => ({
          ...block,
          mimeType: "text/markdown" as const,
          annotations: block.annotations || {
            priority: 1,
            audience: ["user"],
          },
        })),
      );
    }

    if (format === "json" || format === "both") {
      content.push({
        type: "text" as const,
        text: JSON.stringify(serializableStructuredContent, null, 2),
        mimeType: "application/json" as const,
      });
    }

    const toolResult: CallToolResult = {
      content: normalizeContentBlocks(content),
      structuredContent: serializableStructuredContent,
    };

    // Cache result (30 min TTL)
    if (cache) {
      cache.set(cacheKey, toolResult, 30 * 60 * 1000);
    }

    return toolResult;
  }

  // Fall back to JSON response if not a pattern or error
  return toToolResult(result, "get_pattern", log, undefined, format);
}
