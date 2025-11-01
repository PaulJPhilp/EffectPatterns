import { auth } from "@/app/(auth)/auth";
import {
  semanticSearchConversations,
  searchByTag,
  getSearchStats,
} from "@/lib/semantic-search";
import { ChatSDKError } from "@/lib/errors";

/**
 * GET /api/search
 *
 * Semantic search for conversations
 *
 * Query Parameters:
 * - q: Search query (required)
 * - limit: Number of results (default: 10, max: 50)
 * - outcome: Filter by outcome (solved, unsolved, partial, revisited)
 * - tag: Filter by tag (effect-ts, error-handling, etc.)
 * - minSimilarity: Minimum similarity score (0-1, default: 0.3)
 * - type: Result type (conversation, summary, learning - default: conversation)
 *
 * Example:
 * - GET /api/search?q=error%20handling&limit=5&outcome=solved
 * - GET /api/search?q=effect&tag=effect-ts&limit=10
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const limitStr = searchParams.get("limit") || "10";
  const outcome = searchParams.get("outcome");
  const tag = searchParams.get("tag");
  const minSimilarityStr = searchParams.get("minSimilarity") || "0.3";

  // Validate query parameter
  if (!query || query.trim().length === 0) {
    return Response.json(
      {
        error: "bad_request",
        message: "Query parameter 'q' is required and cannot be empty",
      },
      { status: 400 }
    );
  }

  // Validate and parse numeric parameters
  const limit = Math.min(Math.max(parseInt(limitStr) || 10, 1), 50);
  const minSimilarity = Math.max(
    Math.min(parseFloat(minSimilarityStr) || 0.3, 1),
    0
  );

  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError("unauthorized:api").toResponse();
    }

    const userId = session.user.id;

    console.log(
      `[Search] Query: "${query}", limit: ${limit}, outcome: ${outcome}, tag: ${tag}`
    );

    // Use tag-based search if tag specified
    if (tag) {
      const results = await searchByTag(userId, tag, { limit });
      console.log(
        `[Search] Found ${results.length} conversations with tag "${tag}"`
      );

      return Response.json({
        query,
        tag,
        limit,
        count: results.length,
        results,
      });
    }

    // Use semantic search for query
    const results = await semanticSearchConversations(userId, query, {
      limit,
      minSimilarity,
      filters: {
        outcome: (outcome as any) || undefined,
      },
    });

    console.log(
      `[Search] Found ${results.length} results for query "${query}"`
    );

    // Return results with metadata
    return Response.json({
      query,
      limit,
      minSimilarity,
      outcome: outcome || null,
      count: results.length,
      results: results.map(result => ({
        id: result.id,
        metadata: result.metadata,
        score: {
          vector: result.score.vectorSimilarity.toFixed(3),
          keyword: result.score.keywordRelevance.toFixed(3),
          recency: result.score.recencyBoost.toFixed(3),
          satisfaction: result.score.satisfactionBoost.toFixed(3),
          final: result.score.finalScore.toFixed(3),
        },
      })),
    });
  } catch (error: any) {
    console.error("[Search] Error:", error);

    // Handle specific errors
    if (error?.code === "RATE_LIMIT") {
      return Response.json(
        {
          error: "rate_limit",
          message: "Search service rate limited. Please try again later.",
        },
        { status: 429 }
      );
    }

    if (error?.code === "AUTH_ERROR") {
      return Response.json(
        {
          error: "auth_error",
          message: "Search service not configured. Please contact support.",
        },
        { status: 503 }
      );
    }

    if (error?.code === "NETWORK_ERROR") {
      return Response.json(
        {
          error: "network_error",
          message: "Failed to reach search service. Please try again.",
        },
        { status: 503 }
      );
    }

    // Generic error
    return Response.json(
      {
        error: "internal_error",
        message: "Search failed. Please try again later.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/search/stats
 *
 * Get search statistics (for debugging/monitoring)
 */
export async function getStatsRoute(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError("unauthorized:api").toResponse();
    }

    const stats = await getSearchStats(session.user.id);

    return Response.json({
      vectorStore: {
        size: stats.vectorStoreSize,
        dimension: stats.embeddingDimension,
        utilizationPercent: stats.utilizationPercent.toFixed(1),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Search Stats] Error:", error);
    return new ChatSDKError("offline:api").toResponse();
  }
}
