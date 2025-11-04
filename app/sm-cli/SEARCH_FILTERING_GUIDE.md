# Search and Filtering Guide

**Version**: 1.0
**Status**: Complete
**Last Updated**: November 4, 2025

This guide covers advanced search and filtering capabilities in the Supermemory CLI, powered by Supermemory's dual search endpoints (v3 for documents, v4 for memories).

## Quick Start

### Memory Search

```bash
# Simple search
bun run sm-cli memories search "kubernetes"

# With similarity threshold (0.0-1.0, default 0.5)
bun run sm-cli memories search "kubernetes" --threshold 0.7

# With reranking for higher accuracy
bun run sm-cli memories search "kubernetes" --rerank

# Filter by container/user
bun run sm-cli memories search "kubernetes" --container team_devops

# Limit results
bun run sm-cli memories search "kubernetes" --limit 50
```

### Document Search

```bash
# Search documents/PDFs
bun run sm-cli documents search "machine learning"

# With relevance thresholds
bun run sm-cli documents search "machine learning" \
  --document-threshold 0.7 \
  --chunk-threshold 0.8

# With query rewriting (expands query for coverage)
bun run sm-cli documents search "ML" --rewrite-query

# Include full document context
bun run sm-cli documents search "kubernetes" --include-full-docs

# Filter by containers/tags
bun run sm-cli documents search "python" --containers research,ai
```

## Understanding Thresholds

Thresholds control the sensitivity of search results:

- **0.0** = Broad search (many results, lower quality)
- **0.5** = Balanced search (recommended default)
- **1.0** = Precise search (fewer results, higher quality)

### Threshold Strategies

**For Exploratory Search** (cast wide net):
```bash
bun run sm-cli memories search "effect" --threshold 0.2
```

**For Balanced Search** (good for most use cases):
```bash
bun run sm-cli memories search "effect" --threshold 0.5
```

**For Precise Search** (high quality only):
```bash
bun run sm-cli memories search "effect" --threshold 0.8 --rerank
```

## Advanced Features

### Query Rewriting

Query rewriting expands your search to include synonyms and related terms:

```bash
# Without rewriting
bun run sm-cli documents search "ML"
# Might miss: "machine learning", "artificial intelligence"

# With rewriting
bun run sm-cli documents search "ML" --rewrite-query
# Finds: "ML", "machine learning", "artificial intelligence", "deep learning"
```

**Cost**: Adds ~400ms latency
**When to use**: Abbreviations, domain-specific terms, when coverage is important

### Reranking

Reranking re-scores results using a different algorithm for higher accuracy:

```bash
# Without reranking (fast)
bun run sm-cli documents search "kubernetes"

# With reranking (slower but more accurate)
bun run sm-cli documents search "kubernetes" --rerank
```

**When to use**: Critical searches where accuracy matters more than speed

### Container Filtering

Filter results by organizational groupings (users, teams, projects):

```bash
# Filter to specific container
bun run sm-cli memories search "patterns" --container team_backend

# Document search with multiple containers
bun run sm-cli documents search "security" --containers research,security,compliance
```

## Supermemory Search Architecture

### Two Optimized Endpoints

#### 1. Memory Search (v4/search)

**Optimized for**: User preferences, conversational AI, personalization
**Typical latency**: 100-200ms
**Best for**: Understanding user context, auto-selection

```bash
bun run sm-cli memories search "kubernetes" \
  --threshold 0.7 \
  --rerank \
  --container team_devops
```

**Key parameters**:
- `threshold`: Similarity threshold (0.0-1.0)
- `rerank`: Re-score for higher accuracy
- `container`: User/organization identifier
- `limit`: Result count

#### 2. Document Search (v3/search)

**Optimized for**: RAG, chat with files, document discovery
**Typical latency**: 150-300ms
**Best for**: Legal/finance documents, knowledge bases

```bash
bun run sm-cli documents search "policy" \
  --document-threshold 0.7 \
  --chunk-threshold 0.8 \
  --include-full-docs
```

**Key parameters**:
- `documentThreshold`: Document relevance (0.0-1.0)
- `chunkThreshold`: Chunk relevance (0.0-1.0)
- `rerank`: Re-score results
- `rewriteQuery`: Expand query for coverage
- `includeFullDocs`: Include full document context
- `containers`: Filter by organizational tags

## Output Formats

### Human-Readable (default)

```
╔══════════════════════════════════════════════════════════════════════╗
║ Search Results                                                       ║
║ Query: "kubernetes" - Found 5 results | threshold: 0.7 | rerank: on ║
╚══════════════════════════════════════════════════════════════════════╝

  Similarity | Memory                                             | ID
  ────────────────────────────────────────────────────────────────────────
      98.5% | Kubernetes deployment automation                   | abc123def456
      95.2% | Container orchestration best practices              | def456ghi789
      92.1% | K8s networking and service mesh                    | ghi789jkl012
```

### JSON Format

```bash
bun run sm-cli memories search "kubernetes" --format json
```

Returns:
```json
{
  "results": [
    {
      "id": "abc123def456",
      "memory": "Kubernetes deployment automation patterns...",
      "similarity": 0.985,
      "updatedAt": "2025-11-04T10:30:00Z"
    }
  ],
  "timing": 145,
  "total": 5
}
```

## Examples

### Use Case 1: Learning New Topic

```bash
# Start broad, then narrow
bun run sm-cli memories search "machine learning" --threshold 0.3

# Review results, then get more specific
bun run sm-cli memories search "machine learning classification" \
  --threshold 0.7 \
  --rerank
```

### Use Case 2: Finding Existing Solutions

```bash
# Look in specific team's knowledge base
bun run sm-cli memories search "authentication" \
  --container team_security \
  --threshold 0.8 \
  --rerank
```

### Use Case 3: Document Discovery

```bash
# Search through uploaded documents with tight filtering
bun run sm-cli documents search "error handling" \
  --document-threshold 0.7 \
  --chunk-threshold 0.8 \
  --include-full-docs \
  --limit 10
```

### Use Case 4: Handling Abbreviations

```bash
# Without query rewriting - may miss results
bun run sm-cli documents search "REST"

# With query rewriting - finds RESTful API, REST API, HTTP APIs, etc.
bun run sm-cli documents search "REST" --rewrite-query
```

### Use Case 5: Multi-Container Search

```bash
# Search across multiple organizational containers
bun run sm-cli documents search "deployment" \
  --containers devops,infrastructure,platform \
  --document-threshold 0.6
```

## Performance Tips

### Speed vs Accuracy Trade-offs

| Scenario | Command | Speed | Accuracy |
|----------|---------|-------|----------|
| Quick lookup | `search "query" --threshold 0.5` | Fast | Good |
| Precise results | `search "query" --threshold 0.8 --rerank` | Slow | Excellent |
| Broad discovery | `search "query" --threshold 0.2` | Fast | Fair |
| Query expansion | `search "query" --rewrite-query` | Slowest | Excellent |

### Optimization Strategies

**For low latency** (< 200ms target):
```bash
# Use defaults, skip reranking and rewriting
bun run sm-cli memories search "query"
```

**For balanced performance** (200-400ms):
```bash
# Good accuracy without maximum features
bun run sm-cli memories search "query" --threshold 0.7
```

**For high accuracy** (400ms+):
```bash
# Best quality, accept longer latency
bun run sm-cli documents search "query" \
  --rerank \
  --rewrite-query \
  --document-threshold 0.7 \
  --chunk-threshold 0.8
```

## Troubleshooting

### No Results Found

**Problem**: Search returns no results

**Solutions**:
1. Lower the threshold: `--threshold 0.3`
2. Try query rewriting: `--rewrite-query`
3. Check container filtering: `--container team_name`
4. Broaden search terms

```bash
# Debug: Start very broad
bun run sm-cli memories search "keyword" --threshold 0.1
```

### Too Many Results

**Problem**: Search returns too many low-quality results

**Solutions**:
1. Increase threshold: `--threshold 0.8`
2. Enable reranking: `--rerank`
3. Reduce limit: `--limit 10`
4. Narrow search terms

```bash
# Narrow and refine
bun run sm-cli memories search "specific query" \
  --threshold 0.8 \
  --rerank \
  --limit 5
```

### Slow Performance

**Problem**: Search takes too long (> 1s)

**Solutions**:
1. Disable query rewriting: remove `--rewrite-query`
2. Disable reranking: remove `--rerank`
3. Lower limits: `--limit 10`
4. Use higher threshold: `--threshold 0.7`

```bash
# Fast search
bun run sm-cli documents search "query" \
  --limit 10 \
  --document-threshold 0.5
```

### Inconsistent Results

**Problem**: Same query returns different results

**Solutions**:
1. Use consistent threshold
2. Enable reranking for stability: `--rerank`
3. Fix container tags
4. Check for timing-dependent results

```bash
# Stabilize results
bun run sm-cli memories search "query" \
  --threshold 0.7 \
  --rerank \
  --container specific_container
```

## Advanced Metadata Filtering

Future versions will support rich metadata filtering:

```bash
# Planned: Advanced filtering
bun run sm-cli documents search "kubernetes" \
  --filter "category:devops AND author:alice OR author:bob" \
  --filter-type "AND"
```

For now, use container tags and thresholds for filtering.

## API Integration

### Service Methods

If integrating with the CLI as a library:

```typescript
import { SupermemoryServiceLive } from './services/supermemory.js';
import { Effect } from 'effect';

// Memory search
const memoryResults = yield* supermemoryService.searchMemoriesAdvanced({
  q: "kubernetes",
  limit: 20,
  threshold: 0.7,
  rerank: true,
  containerTag: "team_devops"
});

// Document search
const docResults = yield* supermemoryService.searchDocuments({
  q: "machine learning",
  limit: 50,
  documentThreshold: 0.7,
  chunkThreshold: 0.8,
  rerank: true,
  rewriteQuery: true
});
```

## Best Practices

1. **Start Broad, Then Narrow**
   - Begin with low threshold (0.3-0.5)
   - Review results
   - Increase threshold for precision

2. **Use Containers for Organization**
   - Filter by team/project
   - Reduces noise in results
   - Improves relevance

3. **Leverage Reranking for Critical Searches**
   - Better accuracy
   - Worth the ~100-200ms overhead
   - Use when precision matters

4. **Try Query Rewriting for Abbreviations**
   - Expand domain-specific terms
   - Find synonyms
   - Cost: ~400ms

5. **Monitor Performance**
   - Results include timing info
   - Typical: 100-300ms
   - Alert if > 1s

## Frequently Asked Questions

**Q: What's the difference between threshold and reranking?**

A: Threshold controls *sensitivity* (broad vs. precise), while reranking improves *accuracy* of scoring. Use both together for best results.

**Q: Should I always use reranking?**

A: No. Use reranking only when accuracy matters more than latency. For real-time applications, skip it.

**Q: Can I combine memory and document search?**

A: Not yet. They're separate endpoints. Future versions will support combined search.

**Q: What happens if I set threshold to 0.0?**

A: You'll get maximum results but lower quality. Good for exploratory search, not for precise filtering.

**Q: How often are results updated?**

A: Results reflect the latest indexed content. Ingestion latency varies by document size.

## Related Documentation

- [Supermemory API Docs](https://supermemory.ai/docs)
- [SM-CLI Configuration](./README.md)
- [Type Definitions](./src/types.ts)
- [Filter Parser](./src/lib/filter-parser.ts)

## Contributing

Found a bug? Have suggestions? Please open an issue or discussion in the main repository.

---

**Questions?** Check the troubleshooting section or open an issue.
