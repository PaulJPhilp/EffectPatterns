# Semantic Search Implementation Guide

## Overview

Semantic search adds intelligent, context-aware retrieval to your memory system by understanding the **meaning** of queries rather than just matching keywords. This enables finding similar conversations, solutions, and patterns even when exact keywords don't match.

## Current State

**What We Have:**
- Supermemory API for storing memories with keyword search
- Conversation context, metadata, and activity tracking
- Stored conversations with themes and topics

**What's Missing:**
- Semantic/vector search capabilities
- Embeddings for conversations and user queries
- Similarity-based ranking

## Architecture Approaches

### Option 1: Supermemory Built-in Semantic Search (Recommended)

**Pros:**
- ✅ Works with existing Supermemory API
- ✅ No additional infrastructure needed
- ✅ Handles embeddings automatically
- ✅ Simple to implement

**Cons:**
- ❌ Requires Supermemory Pro/Enterprise tier
- ❌ Limited customization
- ❌ Vendor lock-in

**Implementation:**
```typescript
// Supermemory likely has semantic search built-in:
const results = await client.search.memories({
  q: "error handling patterns",
  semantic: true,  // Enable semantic search
  limit: 10,
});
```

**Check:** Contact Supermemory support or review latest SDK docs

---

### Option 2: Hybrid Search (Keyword + Semantic) - RECOMMENDED FOR FULL CONTROL

**Pros:**
- ✅ Best of both worlds (keyword + semantic)
- ✅ No vendor lock-in
- ✅ Highly customizable
- ✅ Can use any embedding model

**Cons:**
- ⚠️ Requires embedding service (free/paid)
- ⚠️ More complex implementation
- ⚠️ Need to store embeddings

**Components:**
1. **Embedding Model** - Convert text to vectors
2. **Vector Storage** - Store embeddings with metadata
3. **Search Layer** - Keyword + vector similarity ranking
4. **Ranking Algorithm** - Combine scores

---

### Option 3: AI-Powered Semantic Search

**Pros:**
- ✅ Use Claude API for semantic understanding
- ✅ Very accurate
- ✅ Can do reasoning-based search

**Cons:**
- ❌ Expensive (API calls per search)
- ❌ Slower than embeddings
- ❌ Overkill for many use cases

---

## Detailed Implementation: Option 2 (Hybrid Search)

### Step 1: Choose an Embedding Model

**Best Options:**

| Model | Provider | Quality | Cost | Speed | Setup |
|-------|----------|---------|------|-------|-------|
| Voyage AI | Voyage AI | ⭐⭐⭐⭐⭐ | $$$$ | Fast | API |
| OpenAI | OpenAI | ⭐⭐⭐⭐⭐ | $$ | Fast | API |
| Cohere | Cohere | ⭐⭐⭐⭐ | $$$ | Fast | API |
| Ollama | Local | ⭐⭐⭐ | FREE | Slow | Self-hosted |
| Nomic | Local | ⭐⭐⭐⭐ | FREE | Medium | Self-hosted |

**Recommendation:** OpenAI `text-embedding-3-small` for best cost/quality balance

### Step 2: Choose Vector Storage

**In-Process Options:**
- `hnswlib` - Simple, works in-memory
- `vectordb` - TypeScript native
- `sqlite-vec` - SQLite with vector support

**Cloud Options:**
- Pinecone - Managed vector DB
- Weaviate - Open-source vector search
- Milvus - Distributed vector DB
- PostgreSQL pgvector - SQL + vectors

**Recommendation:** Start with in-process (`hnswlib`) or PostgreSQL (if already using DB)

### Step 3: Implementation Structure

```typescript
// lib/semantic-search/embeddings.ts
import { Anthropic } from "@anthropic-ai/sdk";

export interface EmbeddingResult {
  text: string;
  vector: number[];
  model: string;
}

export const generateEmbedding = async (
  text: string,
  model: "openai" | "anthropic" | "voyage" = "openai"
): Promise<EmbeddingResult> => {
  // Implementation varies by provider
  // Returns text + 1024/1536/3072 dimensional vector
};

// lib/semantic-search/vector-store.ts
import HierarchicalNSW from "hnswlib-wasm";

export interface VectorStoreItem {
  id: string;
  embedding: number[];
  metadata: {
    chatId: string;
    userId: string;
    type: "conversation" | "summary" | "learning";
    content: string;
    timestamp: string;
  };
}

export class VectorStore {
  private index: HierarchicalNSW;
  private items: Map<string, VectorStoreItem>;

  constructor(dimension: number = 1536) {
    this.index = new HierarchicalNSW("cosine", dimension);
    this.items = new Map();
  }

  add(item: VectorStoreItem): void {
    this.index.addItem(item.embedding, this.items.size);
    this.items.set(item.id, item);
  }

  search(queryVector: number[], limit: number = 5): VectorStoreItem[] {
    const results = this.index.searchKnn(queryVector, limit);
    return results.map(idx => {
      const entries = Array.from(this.items.values());
      return entries[idx];
    });
  }
}

// lib/semantic-search/search.ts
export const semanticSearchConversations = async (
  userId: string,
  query: string,
  options?: {
    limit?: number;
    minSimilarity?: number;
    filters?: {
      tags?: string[];
      outcome?: string;
      dateRange?: [string, string];
    };
  }
): Promise<SearchResult[]> => {
  // 1. Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // 2. Search vector store
  const vectorResults = vectorStore.search(
    queryEmbedding.vector,
    options?.limit || 10
  );

  // 3. Also do keyword search in Supermemory
  const keywordResults = await userMemoryService.searchKeyword(query);

  // 4. Merge and rank results
  const merged = mergeResults(vectorResults, keywordResults, {
    vectorWeight: 0.6,
    keywordWeight: 0.4,
  });

  // 5. Apply filters and return
  return applyFilters(merged, options?.filters);
};
```

---

## Integration Points

### 1. Store Embeddings When Saving Conversations

```typescript
// In chat/api/chat/route.ts - onFinish handler
const onFinish = async ({ messages }: any) => {
  // ... existing code ...

  // Add semantic search integration
  const conversationText = messages
    .map((m: any) => m.parts?.[0]?.text || "")
    .join(" ");

  const embedding = await generateEmbedding(conversationText);

  await vectorStore.add({
    id: `conv_${id}`,
    embedding: embedding.vector,
    metadata: {
      chatId: id,
      userId: session.user.id,
      type: "conversation",
      content: conversationText,
      timestamp: new Date().toISOString(),
    },
  });

  // Also store tags and summaries separately for richer search
  const tags = autoTagConversation(messages);
  const tagsEmbedding = await generateEmbedding(tags.join(" "));

  await vectorStore.add({
    id: `tags_${id}`,
    embedding: tagsEmbedding.vector,
    metadata: {
      chatId: id,
      userId: session.user.id,
      type: "summary",
      content: tags.join(", "),
      timestamp: new Date().toISOString(),
    },
  });
};
```

### 2. Create Search API Endpoint

```typescript
// app/(chat)/api/search/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") || "10");
  const semantic = searchParams.get("semantic") === "true";

  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  try {
    if (semantic) {
      const results = await semanticSearchConversations(
        session.user.id,
        query,
        { limit }
      );
      return Response.json(results);
    } else {
      // Fallback to keyword search
      const results = await userMemoryService.searchKeyword(query);
      return Response.json(results);
    }
  } catch (error) {
    console.error("Search error:", error);
    return new ChatSDKError("offline:api").toResponse();
  }
}
```

### 3. Use in Chat Context

```typescript
// In systemPrompt to include similar conversations
export const systemPrompt = ({
  selectedChatModel,
  requestHints,
  customInstructions,
  conversationContext,
  similarConversations, // NEW
}: {
  // ... existing params ...
  similarConversations?: SearchResult[];
}) => {
  // ... existing code ...

  let similarConversationsSection = "";
  if (similarConversations && similarConversations.length > 0) {
    similarConversationsSection = "\n\n## Similar Past Conversations";
    similarConversations.forEach((conv, idx) => {
      similarConversationsSection += `\n\n### Similar #${idx + 1} (${conv.metadata.outcome})`;
      similarConversationsSection += `\nTags: ${conv.metadata.tags?.join(", ") || "N/A"}`;
      similarConversationsSection += `\nSummary: ${conv.metadata.content.substring(0, 200)}...`;
    });
  }

  return `${regularPrompt}${customInstructionsSection}${conversationContextSection}${similarConversationsSection}\n\n${requestPrompt}\n\n${artifactsPrompt}`;
};
```

---

## Ranking Algorithm

Hybrid search combines multiple signals:

```typescript
interface SearchScore {
  vectorSimilarity: number;    // 0-1 (cosine similarity)
  keywordRelevance: number;    // 0-1 (fuzzy match score)
  recencyBoost: number;        // 0-1 (recent = higher)
  satisfactionBoost: number;   // 0-1 (solved conversations higher)
  topicMatch: number;          // 0-1 (matching tags)
}

const calculateFinalScore = (
  item: SearchResult,
  weights: {
    vector: number;      // 0.4
    keyword: number;     // 0.3
    recency: number;     // 0.15
    satisfaction: number;// 0.1
    topic: number;       // 0.05
  }
): number => {
  return (
    item.score.vectorSimilarity * weights.vector +
    item.score.keywordRelevance * weights.keyword +
    item.score.recencyBoost * weights.recency +
    item.score.satisfactionBoost * weights.satisfaction +
    item.score.topicMatch * weights.topic
  );
};
```

---

## Step-by-Step Implementation

### Phase 1: Add Embedding Support
1. Install embedding library (`yarn add @anthropic-ai/sdk` - already have it)
2. Create `lib/semantic-search/embeddings.ts`
3. Add embedding generation function
4. Test with sample conversations

### Phase 2: Add Vector Storage
1. Install vector store (`yarn add hnswlib-wasm`)
2. Create `lib/semantic-search/vector-store.ts`
3. Implement CRUD operations
4. Persist to disk (optional)

### Phase 3: Integrate with Chat
1. Update chat route to generate/store embeddings
2. Create search API endpoint
3. Update systemPrompt to include similar conversations
4. Test with various queries

### Phase 4: Optimize & Monitor
1. Add caching for embeddings
2. Implement batch processing
3. Add search analytics
4. Monitor embedding quality

---

## Code Examples

### Using OpenAI Embeddings
```typescript
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateEmbedding = async (text: string): Promise<number[]> => {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
};
```

### Using Anthropic Embeddings (When Available)
```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const generateEmbedding = async (text: string): Promise<number[]> => {
  // Anthropic embeddings API (if available in future versions)
  // For now, use OpenAI or Voyage AI
};
```

### Using Local Embeddings (Ollama)
```typescript
export const generateEmbedding = async (text: string): Promise<number[]> => {
  const response = await fetch("http://localhost:11434/api/embeddings", {
    method: "POST",
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text,
    }),
  });
  const data = await response.json();
  return data.embedding;
};
```

---

## Comparison Matrix

| Feature | Keyword Search | Semantic Search | Hybrid |
|---------|---|---|---|
| Exact match | ✅ | ❌ | ✅ |
| Concept match | ❌ | ✅ | ✅ |
| Typo tolerance | ⚠️ | ✅ | ✅ |
| Speed | ⚡ | 🐢 | ⚡⚡ |
| Quality | 6/10 | 9/10 | 9.5/10 |
| Complexity | Simple | Complex | Medium |
| Cost | FREE | $$ | $$ |

---

## Next Steps

1. **Quick Win:** Try Supermemory's built-in semantic search first
2. **If that doesn't work:** Implement Option 2 (Hybrid)
3. **Long-term:** Consider integrating with your patterns toolkit search

## Files to Create/Modify

```
lib/semantic-search/
├── embeddings.ts         # Generate embeddings
├── vector-store.ts       # Store/retrieve vectors
├── search.ts            # Search algorithms
└── ranking.ts           # Ranking/scoring

app/(chat)/api/search/
└── route.ts             # Search API endpoint

lib/ai/prompts.ts        # Update systemPrompt
app/(chat)/api/chat/route.ts  # Store embeddings
```

---

## Questions to Answer Before Implementation

1. **Embedding Service:** OpenAI, Voyage AI, or local?
2. **Storage:** In-memory, SQLite, PostgreSQL, or Supermemory?
3. **Budget:** How much can we spend on embeddings?
4. **Performance:** Is 100ms search latency acceptable?
5. **Scope:** All conversations or just recent ones?

