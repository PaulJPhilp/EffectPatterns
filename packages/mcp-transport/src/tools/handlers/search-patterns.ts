/**
 * search_patterns Tool Handler
 *
 * Handles the search_patterns MCP tool. Supports elicitation,
 * caching, format gating (markdown/json/both), and structured output.
 */

import {
  MARKER_PATTERN_CARD_V1,
  MARKER_PATTERN_INDEX_V1,
} from "../../constants/markers.js";
import type { SearchResultsOutput } from "../../schemas/output-schemas.js";
import type { TextContent } from "../../schemas/structured-output.js";
import type { SearchPatternsArgs } from "../../schemas/tool-schemas.js";
import { generateSearchCacheKey } from "../cache-keys.js";
import {
  elicitSearchFilters,
  elicitSearchQuery,
  isSearchQueryValid,
  isSearchTooBroad,
} from "../elicitation-helpers.js";
import {
  buildFullSearchContent,
  buildFullSearchContentEffect,
  buildZeroResultsResponse,
  buildZeroResultsResponseEffect,
  toToolResult,
  toToolResultEffect,
} from "../tool-result-builder.js";
import {
  generateRequestId,
  normalizeAnnotations,
  recordSearchHit,
  recordSearchMiss,
  truncateAtWordBoundary,
} from "../tool-shared.js";
import type {
  CallToolResult,
  EffectToolContext,
  SearchResultsPayload,
  ToolContext,
} from "../tool-types.js";
import { Effect } from "effect";
import { MCPApiService } from "../../services/MCPApiService.js";
import { MCPCacheService } from "../../services/MCPCacheService.js";
import { MCPLoggerService } from "../../services/MCPLoggerService.js";

export async function handleSearchPatterns(
  args: SearchPatternsArgs,
  ctx: ToolContext,
): Promise<CallToolResult> {
  const { callApi, log, cache } = ctx;
  const requestId = generateRequestId();
  log(`[${requestId}] Tool handler ENTERED: search_patterns`, args);

  try {
    // Default format is "markdown" (no JSON block)
    const format = args.format || "markdown";
    const includeStructuredPatterns =
      args.includeStructuredPatterns ?? format !== "markdown";
    const effectiveLimit = args.limit ?? 3;

    // Elicitation: Check for missing/too-short query
    if (!isSearchQueryValid(args.q)) {
      const elicitation = elicitSearchQuery();
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

      log(
        `[${requestId}] Tool handler COMPLETED: search_patterns (elicitation)`,
      );
      return {
        content,
        structuredContent: elicitation.structuredContent,
      };
    }

    const cacheKey = generateSearchCacheKey(args);
    const isDebug = process.env.MCP_DEBUG === "true";

    // Try cache first (5 min TTL for search results)
    if (cache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        recordSearchHit();
        log(`Cache hit: ${cacheKey}`);
        log(
          `[${requestId}] Tool handler COMPLETED: search_patterns (cached)`,
        );
        return cached as CallToolResult;
      }
      recordSearchMiss();
    }

    const searchParams = new URLSearchParams();
    if (args.q) searchParams.append("q", args.q);
    if (args.category) searchParams.append("category", args.category);
    if (args.difficulty) searchParams.append("difficulty", args.difficulty);
    if (effectiveLimit) searchParams.append("limit", String(effectiveLimit));

    const result = await callApi(`/patterns?${searchParams}`);

    // Handle API errors with structured error response
    if (!result.ok) {
      log(
        `[${requestId}] Tool handler COMPLETED: search_patterns (API error)`,
      );
      return toToolResult(
        result,
        "search_patterns",
        log,
        undefined,
        format,
      );
    }

    // Always build structured content (even for 0 results)
    // The API returns {count, patterns, traceId} which we convert to our structured format
    const apiData = result.data;

    const apiResponseSize = JSON.stringify(apiData).length;
    const apiResultCount = (apiData as any)?.count ?? 0;
    const patterns = (apiData as any)?.patterns ?? [];

    if (isDebug) {
      if (args.q && patterns.length > 0) {
        const query = args.q.toLowerCase();
        const normalizedQuery = query.replace(/[-_]+/g, " ");
        let matchedById = 0;
        let matchedByTitle = 0;
        let matchedBySummary = 0;
        let matchedByTags = 0;
        for (const pattern of patterns) {
          const normalizedId = (pattern.id || "").toLowerCase().replace(/[-_]+/g, " ");
          const normalizedTitle = (pattern.title || "").toLowerCase().replace(/[-_]+/g, " ");
          const normalizedSummary = (pattern.description || pattern.summary || "").toLowerCase().replace(/[-_]+/g, " ");
          const tags = (pattern.tags || []).map((t: string) => t.toLowerCase().replace(/[-_]+/g, " "));
          if (normalizedId.includes(normalizedQuery)) matchedById++;
          if (normalizedTitle.includes(normalizedQuery)) matchedByTitle++;
          if (normalizedSummary.includes(normalizedQuery)) matchedBySummary++;
          if (tags.some((t: string) => t.includes(normalizedQuery))) matchedByTags++;
        }
        log(
          `[DIAGNOSTIC] Query '${args.q}' matched ${apiResultCount} patterns via: ` +
            `id=${matchedById}, title=${matchedByTitle}, summary=${matchedBySummary}, tags=${matchedByTags}`,
        );
      }
      log(
        `[DIAGNOSTIC] API Response Size: ${Math.round(apiResponseSize / 1024)}KB, Pattern Count: ${apiResultCount}`,
      );
    }

    // Ensure we have the expected structure (even for 0 results)
    if (apiData && typeof apiData === "object") {
      // Normalize API response to SearchResultsPayload format
      const data: SearchResultsPayload = {
        count: (apiData as any).count ?? 0,
        patterns: Array.isArray((apiData as any).patterns)
          ? (apiData as any).patterns
          : [],
      };

      // ============================================================================
      // ZERO RESULTS HANDLING
      // ============================================================================
      if (data.count === 0 && args.q) {
        log(`[${requestId}] Tool handler COMPLETED: search_patterns (zero results)`);
        return await buildZeroResultsResponse(args.q, format, callApi);
      }

      // Elicitation: Check if results are too broad
      // Threshold: SEARCH_TOO_BROAD_THRESHOLD = 20 (defined in elicitation-helpers.ts)
      const hasFilters = !!(args.category || args.difficulty);
      if (isSearchTooBroad(data.count, hasFilters)) {
        // Extract available categories and difficulties from results
        const categories = Array.from(
          new Set(data.patterns.map((p) => p.category)),
        );
        const difficulties = Array.from(
          new Set(data.patterns.map((p) => p.difficulty)),
        );

        const elicitation = elicitSearchFilters(
          data.count,
          categories,
          difficulties,
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

        log(
          `[${requestId}] Tool handler COMPLETED: search_patterns (too broad elicitation)`,
        );
        return {
          content,
          structuredContent: elicitation.structuredContent,
        };
      }

      // Build structured output
      const defaultLimitCards = data.count <= 3 ? 3 : 3;
      const limitCards = args.limitCards || defaultLimitCards;
      const renderedCards = Math.min(data.patterns.length, limitCards);
      const renderedCardsForMetadata =
        format === "markdown" || format === "both" ? renderedCards : 0;

      // Count contract markers in markdown content
      let markdownText = "";
      const richContent: TextContent[] = [];

      if (format === "markdown" || format === "both") {
        const builtContent = await buildFullSearchContent(
          data,
          args,
          callApi,
          renderedCards,
        );
        richContent.push(...builtContent);
        markdownText = builtContent.map((block) => block.text).join("\n");
      }

      const indexMarkerCount = (
        markdownText.match(
          new RegExp(
            MARKER_PATTERN_INDEX_V1.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "g",
          ),
        ) || []
      ).length;
      const cardMarkerCount = (
        markdownText.match(
          new RegExp(
            MARKER_PATTERN_CARD_V1.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "g",
          ),
        ) || []
      ).length;

      // Build category and difficulty counts
      const categoryCounts: Record<string, number> = {};
      const difficultyCounts: Record<string, number> = {};
      for (const pattern of data.patterns) {
        categoryCounts[pattern.category] =
          (categoryCounts[pattern.category] || 0) + 1;
        difficultyCounts[pattern.difficulty] =
          (difficultyCounts[pattern.difficulty] || 0) + 1;
      }

      // Build query object, omitting undefined values
      const query: SearchResultsOutput["query"] = {};
      if (args.q) query.q = args.q;
      if (args.category) query.category = args.category;
      if (args.difficulty)
        query.difficulty = args.difficulty as
          | "beginner"
          | "intermediate"
          | "advanced";
      if (effectiveLimit !== undefined) query.limit = effectiveLimit;
      query.format = format; // Echo resolved format

      // Cards are rendered for the first K patterns in index order (deterministic)
      const renderedCardIds =
        format === "markdown" || format === "both"
          ? data.patterns.slice(0, renderedCards).map((p) => p.id)
          : [];

      // Validate contract marker counts match rendered content
      // Policy: Dev=warn, CI/tests=fail (via test assertions), Prod=warn only
      const cardMismatch = cardMarkerCount !== renderedCardIds.length;
      const indexMismatch = indexMarkerCount > 1;

      if (cardMismatch) {
        const warning = `Contract marker count mismatch. Expected ${renderedCardIds.length} cards, found ${cardMarkerCount} markers.`;
        log(`WARNING: ${warning}`, {
          renderedCards: renderedCardIds.length,
          markerCount: cardMarkerCount,
        });
      }
      if (indexMismatch) {
        const warning = `Multiple index markers found (${indexMarkerCount}). Expected 0 or 1.`;
        log(`WARNING: ${warning}`, {
          markerCount: indexMarkerCount,
        });
      }

      const metadata: SearchResultsOutput["metadata"] = {
        totalCount: data.count,
        categories: categoryCounts,
        difficulties: difficultyCounts,
        renderedCards: renderedCardsForMetadata,
        renderedCardIds,
        contractMarkers: {
          index: indexMarkerCount,
          cards: cardMarkerCount,
          version: "v1",
        },
      };

      const structuredContent: SearchResultsOutput = {
        kind: "patternSearchResults:v1",
        query,
        metadata,
        patterns: includeStructuredPatterns
          ? data.patterns.map((p) => {
              // Build pattern summary (card view) - omit optional fields if empty
              const pattern: SearchResultsOutput["patterns"][number] = {
                id: p.id,
                title: p.title,
                category: p.category,
                difficulty: p.difficulty as
                  | "beginner"
                  | "intermediate"
                  | "advanced",
                description: truncateAtWordBoundary(p.description, 200),
              };
              if (p.tags && p.tags.length > 0) pattern.tags = [...p.tags];
              return pattern;
            })
          : [],
        provenance: args.includeProvenancePanel
          ? {
              source: "Effect Patterns API",
              timestamp: new Date().toISOString(),
              version: "pps-v2",
            }
          : undefined,
      };

      if (process.env.MCP_DEBUG === "true") {
        const structuredSize = JSON.stringify(structuredContent).length;
        log("[DIAGNOSTIC] structuredContent size (chars)", {
          structuredSize,
          includeStructuredPatterns,
          format,
        });
      }

      // Build content with MIME types
      // Each block is a distinct UI component - do not merge or summarize
      const content: CallToolResult["content"] = [];

      if (format === "markdown" || format === "both") {
        // Add markdown content with MIME type
        // Each block maintains its distinct identity to prevent model overwrite
        for (const block of richContent) {
          content.push({
            ...block,
            mimeType: "text/markdown" as const,
            // Ensure annotations are present to signal "final UI component"
            annotations: normalizeAnnotations(block.annotations) || {
              priority: 1,
              audience: ["user"],
            },
          });
        }
      }

      // Build structuredContent for internal use (best-effort, may be dropped by SDK)
      const jsonContent = JSON.parse(JSON.stringify(structuredContent)); // Ensure JSON-serializable

      // Include JSON content block only when format includes JSON
      if (format === "json" || format === "both") {
        content.push({
          type: "text" as const,
          text: JSON.stringify(jsonContent, null, 2),
          mimeType: "application/json" as const,
        });
      }

      // Safety: Check total output size to prevent stdio flooding (max 1MB)
      // Validate BEFORE returning to prevent sending garbage fragments
      const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB
      const totalSize =
        JSON.stringify(content).length + JSON.stringify(jsonContent).length;

      if (totalSize > MAX_OUTPUT_SIZE) {
        if (isDebug) {
          log(
            `[DIAGNOSTIC] Output size limit exceeded: ${Math.round(totalSize / 1024)}KB (max: ${Math.round(MAX_OUTPUT_SIZE / 1024)}KB)`,
          );
        }
        log(
          `[${requestId}] ERROR: Output size limit exceeded (${totalSize} bytes), returning error response`,
        );
        const errorContent: CallToolResult = {
          content: [
            {
              type: "text" as const,
              text: "Result set too large to render. Please narrow your search query.",
              mimeType: "text/markdown" as const,
            },
          ],
          structuredContent: {
            kind: "toolError:v1",
            code: "SERVER_ERROR",
            message: "Result set too large to render. Please narrow your search query.",
            retryable: false,
          },
          isError: true,
        };
        log(
          `[${requestId}] Tool handler COMPLETED: search_patterns (size limit error)`,
        );
        return errorContent;
      }

      const includeStructuredContent =
        includeStructuredPatterns || format === "json" || format === "both";

      const toolResult: CallToolResult = {
        content,
        ...(includeStructuredContent && { structuredContent: jsonContent }),
        isError: false, // Explicitly set to false for successful searches
      };

      if (isDebug) {
        const finalCharCount =
          JSON.stringify(content).length + JSON.stringify(jsonContent).length;
        const blockCount = content.length;
        log(
          `[DIAGNOSTIC] Final response: ${Math.round(finalCharCount / 1024)}KB (${finalCharCount} chars), ${blockCount} distinct blocks, ${data.count} patterns, ${renderedCards} cards rendered`,
        );
      }

      // Cache result (5 min TTL)
      if (cache) {
        cache.set(cacheKey, toolResult, 5 * 60 * 1000);
      }

      log(`[${requestId}] Tool handler COMPLETED: search_patterns`);
      return toolResult;
    }

    // If API response doesn't have expected structure, build empty structured response
    log(
      `WARNING: API response missing expected structure, building empty response`,
      { data: result.data },
    );

    // Return zero results response
    log(`[${requestId}] Tool handler COMPLETED: search_patterns (empty response)`);
    return await buildZeroResultsResponse(args.q || "", format, callApi);
  } catch (error) {
    log(`[${requestId}] Tool handler ERROR: search_patterns`, error);
    if (error instanceof Error) {
      log(`[${requestId}] Error stack:`, error.stack);
    }
    // Return error as value for consistent handling
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: `Error searching patterns: ${message}` }],
      isError: true,
    };
  }
}

function searchPatternsProgram(
  args: SearchPatternsArgs,
  ctx: EffectToolContext,
): Effect.Effect<CallToolResult> {
  const { callApi, log, cache } = ctx;

  return Effect.gen(function* () {
    const requestId = generateRequestId();
    yield* log(`[${requestId}] Tool handler ENTERED: search_patterns`, args);

    const format = args.format || "markdown";
    const includeStructuredPatterns =
      args.includeStructuredPatterns ?? format !== "markdown";
    const effectiveLimit = args.limit ?? 3;

    if (!isSearchQueryValid(args.q)) {
      const elicitation = elicitSearchQuery();
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

      yield* log(
        `[${requestId}] Tool handler COMPLETED: search_patterns (elicitation)`,
      );
      return {
        content,
        structuredContent: elicitation.structuredContent,
      };
    }

    const cacheKey = generateSearchCacheKey(args);
    const isDebug = process.env.MCP_DEBUG === "true";

    if (cache) {
      const cached = yield* cache.get(cacheKey);
      if (cached) {
        recordSearchHit();
        yield* log(`Cache hit: ${cacheKey}`);
        yield* log(
          `[${requestId}] Tool handler COMPLETED: search_patterns (cached)`,
        );
        return cached as CallToolResult;
      }
      recordSearchMiss();
    }

    const searchParams = new URLSearchParams();
    if (args.q) searchParams.append("q", args.q);
    if (args.category) searchParams.append("category", args.category);
    if (args.difficulty) searchParams.append("difficulty", args.difficulty);
    if (effectiveLimit) searchParams.append("limit", String(effectiveLimit));

    const result = yield* callApi(`/patterns?${searchParams}`);

    if (!result.ok) {
      yield* log(
        `[${requestId}] Tool handler COMPLETED: search_patterns (API error)`,
      );
      return yield* toToolResultEffect(
        result,
        "search_patterns",
        log,
        undefined,
        format,
      );
    }

    const apiData = result.data;
    const apiResponseSize = JSON.stringify(apiData).length;
    const apiResultCount =
      typeof apiData === "object" &&
      apiData !== null &&
      "count" in apiData &&
      typeof (apiData as { count?: unknown }).count === "number"
        ? (apiData as { count: number }).count
        : 0;
    const patterns =
      typeof apiData === "object" &&
      apiData !== null &&
      "patterns" in apiData &&
      Array.isArray((apiData as { patterns?: unknown }).patterns)
        ? (apiData as { patterns: Array<Record<string, unknown>> }).patterns
        : [];

    if (isDebug) {
      if (args.q && patterns.length > 0) {
        const query = args.q.toLowerCase();
        const normalizedQuery = query.replace(/[-_]+/g, " ");
        let matchedById = 0;
        let matchedByTitle = 0;
        let matchedBySummary = 0;
        let matchedByTags = 0;
        for (const pattern of patterns) {
          const normalizedId = ((pattern.id as string | undefined) || "")
            .toLowerCase()
            .replace(/[-_]+/g, " ");
          const normalizedTitle = ((pattern.title as string | undefined) || "")
            .toLowerCase()
            .replace(/[-_]+/g, " ");
          const normalizedSummary = (
            ((pattern.description as string | undefined) ||
              (pattern.summary as string | undefined) ||
              "")
          )
            .toLowerCase()
            .replace(/[-_]+/g, " ");
          const tags = Array.isArray(pattern.tags)
            ? pattern.tags
                .filter((tag): tag is string => typeof tag === "string")
                .map((tag) => tag.toLowerCase().replace(/[-_]+/g, " "))
            : [];
          if (normalizedId.includes(normalizedQuery)) matchedById++;
          if (normalizedTitle.includes(normalizedQuery)) matchedByTitle++;
          if (normalizedSummary.includes(normalizedQuery)) matchedBySummary++;
          if (tags.some((tag) => tag.includes(normalizedQuery))) matchedByTags++;
        }
        yield* log(
          `[DIAGNOSTIC] Query '${args.q}' matched ${apiResultCount} patterns via: ` +
            `id=${matchedById}, title=${matchedByTitle}, summary=${matchedBySummary}, tags=${matchedByTags}`,
        );
      }
      yield* log(
        `[DIAGNOSTIC] API Response Size: ${Math.round(apiResponseSize / 1024)}KB, Pattern Count: ${apiResultCount}`,
      );
    }

    if (apiData && typeof apiData === "object") {
      const data: SearchResultsPayload = {
        count:
          "count" in apiData && typeof apiData.count === "number"
            ? apiData.count
            : 0,
        patterns:
          "patterns" in apiData && Array.isArray(apiData.patterns)
            ? (apiData.patterns as SearchResultsPayload["patterns"])
            : [],
      };

      if (data.count === 0 && args.q) {
        yield* log(
          `[${requestId}] Tool handler COMPLETED: search_patterns (zero results)`,
        );
        return yield* buildZeroResultsResponseEffect(args.q, format, callApi);
      }

      const hasFilters = !!(args.category || args.difficulty);
      if (isSearchTooBroad(data.count, hasFilters)) {
        const categories = Array.from(new Set(data.patterns.map((p) => p.category)));
        const difficulties = Array.from(
          new Set(data.patterns.map((p) => p.difficulty)),
        );

        const elicitation = elicitSearchFilters(
          data.count,
          categories,
          difficulties,
        );

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

        yield* log(
          `[${requestId}] Tool handler COMPLETED: search_patterns (too broad elicitation)`,
        );
        return {
          content,
          structuredContent: elicitation.structuredContent,
        };
      }

      const defaultLimitCards = data.count <= 3 ? 3 : 3;
      const limitCards = args.limitCards || defaultLimitCards;
      const renderedCards = Math.min(data.patterns.length, limitCards);
      const renderedCardsForMetadata =
        format === "markdown" || format === "both" ? renderedCards : 0;

      let markdownText = "";
      const richContent: TextContent[] = [];

      if (format === "markdown" || format === "both") {
        const builtContent = yield* buildFullSearchContentEffect(
          data,
          args,
          callApi,
          renderedCards,
        );
        richContent.push(...builtContent);
        markdownText = builtContent.map((block) => block.text).join("\n");
      }

      const indexMarkerCount = (
        markdownText.match(
          new RegExp(
            MARKER_PATTERN_INDEX_V1.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "g",
          ),
        ) || []
      ).length;
      const cardMarkerCount = (
        markdownText.match(
          new RegExp(
            MARKER_PATTERN_CARD_V1.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "g",
          ),
        ) || []
      ).length;

      const categoryCounts: Record<string, number> = {};
      const difficultyCounts: Record<string, number> = {};
      for (const pattern of data.patterns) {
        categoryCounts[pattern.category] =
          (categoryCounts[pattern.category] || 0) + 1;
        difficultyCounts[pattern.difficulty] =
          (difficultyCounts[pattern.difficulty] || 0) + 1;
      }

      const query: SearchResultsOutput["query"] = {};
      if (args.q) query.q = args.q;
      if (args.category) query.category = args.category;
      if (args.difficulty) {
        query.difficulty = args.difficulty as
          | "beginner"
          | "intermediate"
          | "advanced";
      }
      if (effectiveLimit !== undefined) query.limit = effectiveLimit;
      query.format = format;

      const renderedCardIds =
        format === "markdown" || format === "both"
          ? data.patterns.slice(0, renderedCards).map((p) => p.id)
          : [];

      const cardMismatch = cardMarkerCount !== renderedCardIds.length;
      const indexMismatch = indexMarkerCount > 1;

      if (cardMismatch) {
        const warning = `Contract marker count mismatch. Expected ${renderedCardIds.length} cards, found ${cardMarkerCount} markers.`;
        yield* log(`WARNING: ${warning}`, {
          renderedCards: renderedCardIds.length,
          markerCount: cardMarkerCount,
        });
      }
      if (indexMismatch) {
        const warning = `Multiple index markers found (${indexMarkerCount}). Expected 0 or 1.`;
        yield* log(`WARNING: ${warning}`, {
          markerCount: indexMarkerCount,
        });
      }

      const metadata: SearchResultsOutput["metadata"] = {
        totalCount: data.count,
        categories: categoryCounts,
        difficulties: difficultyCounts,
        renderedCards: renderedCardsForMetadata,
        renderedCardIds,
        contractMarkers: {
          index: indexMarkerCount,
          cards: cardMarkerCount,
          version: "v1",
        },
      };

      const structuredContent: SearchResultsOutput = {
        kind: "patternSearchResults:v1",
        query,
        metadata,
        patterns: includeStructuredPatterns
          ? data.patterns.map((p) => {
              const pattern: SearchResultsOutput["patterns"][number] = {
                id: p.id,
                title: p.title,
                category: p.category,
                difficulty: p.difficulty as
                  | "beginner"
                  | "intermediate"
                  | "advanced",
                description: truncateAtWordBoundary(p.description, 200),
              };
              if (p.tags && p.tags.length > 0) pattern.tags = [...p.tags];
              return pattern;
            })
          : [],
        provenance: args.includeProvenancePanel
          ? {
              source: "Effect Patterns API",
              timestamp: new Date().toISOString(),
              version: "pps-v2",
            }
          : undefined,
      };

      if (process.env.MCP_DEBUG === "true") {
        const structuredSize = JSON.stringify(structuredContent).length;
        yield* log("[DIAGNOSTIC] structuredContent size (chars)", {
          structuredSize,
          includeStructuredPatterns,
          format,
        });
      }

      const content: CallToolResult["content"] = [];

      if (format === "markdown" || format === "both") {
        for (const block of richContent) {
          content.push({
            ...block,
            mimeType: "text/markdown" as const,
            annotations: normalizeAnnotations(block.annotations) || {
              priority: 1,
              audience: ["user"],
            },
          });
        }
      }

      const jsonContent = JSON.parse(JSON.stringify(structuredContent));

      if (format === "json" || format === "both") {
        content.push({
          type: "text" as const,
          text: JSON.stringify(jsonContent, null, 2),
          mimeType: "application/json" as const,
        });
      }

      const maxOutputSize = 1024 * 1024;
      const totalSize =
        JSON.stringify(content).length + JSON.stringify(jsonContent).length;

      if (totalSize > maxOutputSize) {
        if (isDebug) {
          yield* log(
            `[DIAGNOSTIC] Output size limit exceeded: ${Math.round(totalSize / 1024)}KB (max: ${Math.round(maxOutputSize / 1024)}KB)`,
          );
        }
        yield* log(
          `[${requestId}] ERROR: Output size limit exceeded (${totalSize} bytes), returning error response`,
        );
        const errorContent: CallToolResult = {
          content: [
            {
              type: "text" as const,
              text: "Result set too large to render. Please narrow your search query.",
              mimeType: "text/markdown" as const,
            },
          ],
          structuredContent: {
            kind: "toolError:v1",
            code: "SERVER_ERROR",
            message: "Result set too large to render. Please narrow your search query.",
            retryable: false,
          },
          isError: true,
        };
        yield* log(
          `[${requestId}] Tool handler COMPLETED: search_patterns (size limit error)`,
        );
        return errorContent;
      }

      const includeStructuredContent =
        includeStructuredPatterns || format === "json" || format === "both";

      const toolResult: CallToolResult = {
        content,
        ...(includeStructuredContent && { structuredContent: jsonContent }),
        isError: false,
      };

      if (isDebug) {
        const finalCharCount =
          JSON.stringify(content).length + JSON.stringify(jsonContent).length;
        const blockCount = content.length;
        yield* log(
          `[DIAGNOSTIC] Final response: ${Math.round(finalCharCount / 1024)}KB (${finalCharCount} chars), ${blockCount} distinct blocks, ${data.count} patterns, ${renderedCards} cards rendered`,
        );
      }

      if (cache) {
        yield* cache.set(cacheKey, toolResult, 5 * 60 * 1000);
      }

      yield* log(`[${requestId}] Tool handler COMPLETED: search_patterns`);
      return toolResult;
    }

    yield* log(
      "WARNING: API response missing expected structure, building empty response",
      { data: result.data },
    );

    yield* log(
      `[${requestId}] Tool handler COMPLETED: search_patterns (empty response)`,
    );
    return yield* buildZeroResultsResponseEffect(args.q || "", format, callApi);
  });
}

/**
 * Effect.fn version of handleSearchPatterns with automatic OTEL tracing.
 *
 * Creates an "mcp.search_patterns" span per invocation.
 * Delegates to the existing handleSearchPatterns implementation via
 * a ToolContext built from Effect services.
 */
export const searchPatternsEffect = Effect.fn("mcp.search_patterns")(
  function* (args: SearchPatternsArgs) {
    const api = yield* MCPApiService;
    const cache = yield* MCPCacheService;
    const logger = yield* MCPLoggerService;

    yield* Effect.annotateCurrentSpan({
      "mcp.tool": "search_patterns",
      "mcp.query": args.q ?? "",
      "mcp.category": args.category ?? "",
    });

    const ctx: EffectToolContext = {
      callApi: (endpoint, method, data) =>
        api.callApi(endpoint, method ?? "GET", data),
      log: (message, data) => logger.log(message, data),
      cache: {
        get: (key) => cache.get(key),
        set: (key, value, ttl) => cache.set(key, value, ttl),
      },
    };

    return yield* searchPatternsProgram(args, ctx);
  }
);
