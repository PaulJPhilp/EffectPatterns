/**
 * Semantic Search - Embeddings Module
 *
 * Generates embeddings for conversations, queries, and text snippets.
 * Supports multiple embedding providers via fetch-based API calls.
 *
 * Currently implemented:
 * - OpenAI (text-embedding-3-small): Primary provider
 * - Voyage AI: Alternative high-quality provider
 * - Anthropic: Placeholder for future embeddings API
 */

export interface EmbeddingOptions {
  model?: "openai" | "anthropic" | "voyage";
  dimensions?: number;
}

export interface EmbeddingResult {
  text: string;
  vector: number[];
  model: string;
  dimensions: number;
}

export interface EmbeddingError {
  code: string;
  message: string;
  retryable: boolean;
}

/**
 * Generate embedding for text using OpenAI's text-embedding-3-small
 *
 * This is currently the best balance of:
 * - Quality (256-1536 dimensions available)
 * - Cost ($0.02 per 1M tokens)
 * - Speed (fast inference)
 * - Reliability (well-established service)
 */
export const generateEmbedding = async (
  text: string,
  options: EmbeddingOptions = {}
): Promise<EmbeddingResult> => {
  const { model = "openai", dimensions = 1536 } = options;

  // Trim and validate input
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw {
      code: "EMPTY_INPUT",
      message: "Cannot generate embedding for empty text",
      retryable: false,
    } as EmbeddingError;
  }

  // Limit text to prevent API errors (OpenAI limit is 8192 tokens ≈ 32KB)
  const maxChars = 30000;
  if (trimmedText.length > maxChars) {
    console.warn(
      `Text truncated from ${trimmedText.length} to ${maxChars} characters for embedding`
    );
  }
  const textToEmbed = trimmedText.substring(0, maxChars);

  try {
    if (model === "openai") {
      return await generateOpenAIEmbedding(textToEmbed, dimensions);
    } else if (model === "anthropic") {
      return await generateAnthropicEmbedding(textToEmbed, dimensions);
    } else if (model === "voyage") {
      return await generateVoyageEmbedding(textToEmbed, dimensions);
    }

    throw {
      code: "INVALID_MODEL",
      message: `Unsupported embedding model: ${model}`,
      retryable: false,
    } as EmbeddingError;
  } catch (error: any) {
    // Handle rate limiting
    if (error.status === 429 || error.code === "RATE_LIMITED") {
      throw {
        code: "RATE_LIMIT",
        message: "Embedding service rate limited",
        retryable: true,
      } as EmbeddingError;
    }

    // Handle auth errors
    if (error.status === 401 || error.code === "UNAUTHORIZED") {
      throw {
        code: "AUTH_ERROR",
        message: `Missing or invalid API key for ${model}`,
        retryable: false,
      } as EmbeddingError;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw {
        code: "NETWORK_ERROR",
        message: "Failed to reach embedding service",
        retryable: true,
      } as EmbeddingError;
    }

    // Re-throw as semantic error
    throw {
      code: "EMBEDDING_ERROR",
      message: error.message || "Failed to generate embedding",
      retryable: true,
    } as EmbeddingError;
  }
};

/**
 * Generate embedding using OpenAI's text-embedding-3-small
 *
 * Models:
 * - text-embedding-3-small: 1536 dimensions (recommended for most use cases)
 * - text-embedding-3-large: 3072 dimensions (for higher quality)
 */
const generateOpenAIEmbedding = async (
  text: string,
  dimensions: number
): Promise<EmbeddingResult> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw {
      code: "MISSING_OPENAI_KEY",
      message: "OPENAI_API_KEY environment variable not set",
      retryable: false,
    } as EmbeddingError;
  }

  // Use fetch to avoid adding another dependency
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      dimensions: Math.min(dimensions, 1536), // Max 1536 for small model
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw {
      code: `OPENAI_${response.status}`,
      message: error.error?.message || "OpenAI API error",
      retryable: response.status >= 500,
    } as EmbeddingError;
  }

  const data = await response.json();
  const embedding = data.data[0].embedding;

  return {
    text,
    vector: embedding,
    model: "openai-text-embedding-3-small",
    dimensions: embedding.length,
  };
};

/**
 * Generate embedding using Anthropic (future support)
 *
 * Note: Anthropic embeddings API not yet available
 * Placeholder for future integration
 */
const generateAnthropicEmbedding = async (
  text: string,
  dimensions: number
): Promise<EmbeddingResult> => {
  // Future implementation when Anthropic releases embeddings API
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw {
      code: "MISSING_ANTHROPIC_KEY",
      message: "ANTHROPIC_API_KEY environment variable not set",
      retryable: false,
    } as EmbeddingError;
  }

  // Placeholder - will be implemented when API is available
  throw {
    code: "NOT_IMPLEMENTED",
    message: "Anthropic embeddings API not yet available",
    retryable: false,
  } as EmbeddingError;
};

/**
 * Generate embedding using Voyage AI
 *
 * Voyage AI offers optimized models for different use cases:
 * - voyage-large-2: High-quality, good for retrieval
 * - voyage-2: Balanced quality and speed
 * - voyage-lite-02: Fast, good for real-time applications
 */
const generateVoyageEmbedding = async (
  text: string,
  dimensions: number
): Promise<EmbeddingResult> => {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw {
      code: "MISSING_VOYAGE_KEY",
      message: "VOYAGE_API_KEY environment variable not set",
      retryable: false,
    } as EmbeddingError;
  }

  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "voyage-large-2",
      input: text,
      input_type: "document",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw {
      code: `VOYAGE_${response.status}`,
      message: error.detail || "Voyage AI API error",
      retryable: response.status >= 500,
    } as EmbeddingError;
  }

  const data = await response.json();
  const embedding = data.data[0].embedding;

  return {
    text,
    vector: embedding,
    model: "voyage-large-2",
    dimensions: embedding.length,
  };
};

/**
 * Calculate cosine similarity between two vectors
 *
 * Result:
 * - 1.0: Identical vectors
 * - 0.5: Moderately similar
 * - 0.0: Orthogonal (no similarity)
 * - -1.0: Opposite vectors
 */
export const cosineSimilarity = (
  vectorA: number[],
  vectorB: number[]
): number => {
  if (vectorA.length !== vectorB.length) {
    throw new Error("Vectors must have the same dimension");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
};

/**
 * Generate embeddings for multiple texts in batch
 *
 * More efficient than calling generateEmbedding separately
 */
export const generateBatchEmbeddings = async (
  texts: string[],
  options: EmbeddingOptions = {}
): Promise<EmbeddingResult[]> => {
  // For now, just map over individual calls
  // In production, would use batch API endpoints
  return Promise.all(texts.map((text) => generateEmbedding(text, options)));
};

/**
 * Cache embeddings for frequently accessed content
 *
 * Key: hash of text content
 * Value: embedding result
 */
const embeddingCache = new Map<string, EmbeddingResult>();

/**
 * Generate embedding with optional caching
 */
export const generateEmbeddingWithCache = async (
  text: string,
  options: EmbeddingOptions & { cache?: boolean } = {}
): Promise<EmbeddingResult> => {
  const { cache = true, ...embeddingOpts } = options;

  if (!cache) {
    return generateEmbedding(text, embeddingOpts);
  }

  // Simple hash of text for cache key
  const cacheKey = text.substring(0, 100);

  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  const result = await generateEmbedding(text, embeddingOpts);
  embeddingCache.set(cacheKey, result);

  return result;
};

/**
 * Clear embedding cache (useful for memory management)
 */
export const clearEmbeddingCache = (): void => {
  embeddingCache.clear();
};

/**
 * Get cache statistics
 */
export const getEmbeddingCacheStats = (): {
  size: number;
  entries: string[];
} => {
  return {
    size: embeddingCache.size,
    entries: Array.from(embeddingCache.keys()),
  };
};
