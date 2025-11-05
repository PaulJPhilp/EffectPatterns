# Semantic Search - Testing Guide

## Prerequisites

Before testing, ensure:

1. ✅ Build completes successfully
2. ✅ `.env.local` has `OPENAI_API_KEY` (or `VOYAGE_API_KEY`, or local Ollama running)
3. ✅ Development server is running
4. ✅ You're logged in as a user

---

## Part 1: Manual Testing via cURL

### Test 1: Basic Search

```bash
# Search for "error handling"
curl "http://localhost:3002/api/search?q=error%20handling&limit=5" \
  -H "Cookie: your-auth-cookie"
```

**Response:**
```json
{
  "query": "error handling",
  "limit": 5,
  "minSimilarity": 0.3,
  "outcome": null,
  "count": 0,
  "results": []
}
```

**Note:** Results will be empty until you have conversations. See "Part 2" to generate test conversations.

### Test 2: Search with Filters

```bash
# Search for "async" in "solved" conversations only
curl "http://localhost:3002/api/search?q=async&outcome=solved&limit=3" \
  -H "Cookie: your-auth-cookie"
```

### Test 3: Search by Tag

```bash
# Find all "effect-ts" tagged conversations
curl "http://localhost:3002/api/search?tag=effect-ts&limit=10" \
  -H "Cookie: your-auth-cookie"
```

### Test 4: Error Handling

```bash
# Missing query parameter
curl "http://localhost:3002/api/search" \
  -H "Cookie: your-auth-cookie"

# Response: 400 Bad Request
# {"error": "bad_request", "message": "Query parameter 'q' is required..."}
```

```bash
# Invalid limit (will be clamped to 1-50)
curl "http://localhost:3002/api/search?q=test&limit=1000" \
  -H "Cookie: your-auth-cookie"

# Limit will be capped at 50
```

---

## Part 2: Create Test Conversations

To test search, you need conversations to search through. Follow these steps:

### Step 1: Start Development Server

```bash
cd /Users/paul/Projects/Published/Effect-Patterns/app/code-assistant
pnpm dev
```

Open http://localhost:3002 in your browser.

### Step 2: Create Test Conversations

Have a conversation with the AI about these topics (to create test data):

**Conversation 1: Error Handling**
```
User: How do I handle errors in Effect?
AI: [response]
```

**Conversation 2: Async Patterns**
```
User: Can you explain async/await with Effect?
AI: [response]
```

**Conversation 3: Type Safety**
```
User: How does Effect improve type safety?
AI: [response]
```

**Conversation 4: Performance**
```
User: What optimizations does Effect provide?
AI: [response]
```

**Conversation 5: Testing**
```
User: How do I test Effect code?
AI: [response]
```

Each conversation will automatically:
- Generate embeddings
- Extract tags (effect-ts, error-handling, etc.)
- Detect outcome (partial, solved)
- Store in vector store

**Monitor in console for:**
```
[Semantic Search] Stored conversation embedding (3 tags, partial outcome)
```

### Step 3: Verify Embeddings Were Stored

Check browser console for logs:

```javascript
// In browser console
// You should see logs like:
// [Semantic Search] Stored conversation embedding (3 tags, partial outcome)
```

Or check server logs:

```bash
# In terminal where pnpm dev is running
# Look for lines starting with:
# [Semantic Search] Stored conversation embedding
```

---

## Part 3: Test Search API

### Test 3a: Search After Creating Conversations

After creating 5+ test conversations:

```bash
# Search for "error"
curl "http://localhost:3002/api/search?q=error&limit=5" \
  -H "Cookie: your-session-cookie"
```

**Expected Response:**
```json
{
  "query": "error",
  "limit": 5,
  "minSimilarity": 0.3,
  "outcome": null,
  "count": 1,
  "results": [
    {
      "id": "conv_chat-123",
      "metadata": {
        "chatId": "chat-123",
        "userId": "user-456",
        "type": "conversation",
        "content": "How do I handle errors in Effect? [AI response...]",
        "timestamp": "2025-11-01T17:30:00.000Z",
        "tags": ["effect-ts", "error-handling", "typescript"],
        "outcome": "partial"
      },
      "score": {
        "vector": "0.856",
        "keyword": "1.000",
        "recency": "1.000",
        "satisfaction": "0.500",
        "final": "0.843"
      }
    }
  ]
}
```

### Test 3b: Semantic Matching (The Cool Part!)

Try these queries - even without exact keyword matches:

```bash
# Query: "exception handling" (different words than "error handling")
curl "http://localhost:3002/api/search?q=exception%20handling&limit=5"

# Should still find: "How do I handle errors in Effect?" ✅
```

```bash
# Query: "async patterns" (similar meaning to async/await conversation)
curl "http://localhost:3002/api/search?q=async%20patterns&limit=5"

# Should still find the async/await conversation ✅
```

```bash
# Query with typo: "eroor" instead of "error"
curl "http://localhost:3002/api/search?q=eroor&limit=5"

# Semantic search is typo-tolerant! ✅
```

### Test 3c: Filtering Tests

```bash
# Only solved conversations
curl "http://localhost:3002/api/search?q=effect&outcome=solved&limit=10"

# Only unsolved
curl "http://localhost:3002/api/search?q=effect&outcome=unsolved&limit=10"

# Only Effect-related
curl "http://localhost:3002/api/search?tag=effect-ts&limit=10"
```

### Test 3d: Similarity Threshold

```bash
# Strict matching (high threshold)
curl "http://localhost:3002/api/search?q=error&minSimilarity=0.8&limit=10"

# Loose matching (low threshold)
curl "http://localhost:3002/api/search?q=error&minSimilarity=0.1&limit=10"

# Note: Second request may return more results
```

---

## Part 4: Programmatic Testing

### JavaScript/TypeScript Test

```typescript
// In browser console:

// Test 1: Basic search
async function testSearch() {
  const response = await fetch(
    '/api/search?q=error%20handling&limit=5'
  );
  const data = await response.json();
  console.log('Search results:', data);
  console.log('Count:', data.count);
  console.log('First result:', data.results[0]);
}

testSearch();
```

### Node.js Test Script

Create `test-search.js`:

```javascript
const api = 'http://localhost:3002';

async function testSearch(query, options = {}) {
  const params = new URLSearchParams({
    q: query,
    limit: options.limit || 5,
    ...(options.outcome && { outcome: options.outcome }),
    ...(options.tag && { tag: options.tag }),
  });

  const url = `${api}/api/search?${params.toString()}`;
  console.log(`\n📝 Testing: ${query}`);
  console.log(`📍 URL: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        // You may need to add auth headers
        'Cookie': 'your-session-cookie',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error:', data);
      return;
    }

    console.log(`✅ Found ${data.count} results:`);
    data.results.forEach((result, idx) => {
      console.log(`\n  ${idx + 1}. ${result.metadata.chatId}`);
      console.log(`     Tags: ${result.metadata.tags?.join(', ')}`);
      console.log(`     Outcome: ${result.metadata.outcome}`);
      console.log(`     Score: ${result.score.final}`);
    });
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

// Run tests
async function runTests() {
  await testSearch('error handling');
  await testSearch('async patterns');
  await testSearch('type safety');
  await testSearch('effect', { outcome: 'solved' });
  await testSearch('test', { tag: 'effect-ts' });
}

runTests();
```

Run it:
```bash
node test-search.js
```

---

## Part 5: Integration Testing

### Test with Real Workflow

1. **Create conversation about Effect errors**
   ```
   User: I'm getting a type error with Effect. How do I debug it?
   AI: [response]
   ```

2. **Wait for embedding to store** (watch console for log)

3. **Search for related issue in new chat**
   ```
   User: Help me fix this compilation error
   AI: [response, but should reference similar past solution!]
   ```

4. **Verify similar conversations shown**
   - Check if system prompt includes similar conversations
   - Look for references to past solutions

---

## Part 6: Performance Testing

### Measure Search Speed

```typescript
async function measureSearchSpeed() {
  console.time('First search');
  const response1 = await fetch('/api/search?q=error');
  await response1.json();
  console.timeEnd('First search');
  // Expected: 500-2000ms (includes embedding generation)

  console.time('Second search (cached)');
  const response2 = await fetch('/api/search?q=error');
  await response2.json();
  console.timeEnd('Second search (cached)');
  // Expected: 50-200ms (cached embedding)

  console.time('Similar search');
  const response3 = await fetch('/api/search?q=exception');
  await response3.json();
  console.timeEnd('Similar search');
  // Expected: 500-2000ms (new embedding)
}

measureSearchSpeed();
```

### Monitor Memory Usage

```typescript
// Check vector store statistics
async function checkMemory() {
  // In the network tab, search for the /api/search requests
  // Look at response size - should be small (few KB)

  // Or check server-side:
  // Vector store size = number of conversations × 6KB
  // 10 conversations ≈ 60KB
  // 100 conversations ≈ 600KB
  // 1000 conversations ≈ 6MB
}
```

---

## Part 7: Debugging Issues

### Issue: "Search returns 0 results"

**Check:**
1. Are conversations actually being created?
   ```bash
   # Look in browser console for:
   # [Semantic Search] Stored conversation embedding
   ```

2. Is API key set?
   ```bash
   # In terminal:
   echo $OPENAI_API_KEY
   # Should print: sk-...
   ```

3. Try with very loose threshold:
   ```bash
   curl "http://localhost:3002/api/search?q=test&minSimilarity=0"
   ```

### Issue: "Embedding generation fails"

**Check logs for:**
```
[Semantic Search] Missing API key
[Semantic Search] Rate limited
[Semantic Search] Failed to store embedding
```

**Solutions:**
1. Add API key: `OPENAI_API_KEY=sk-...` in `.env.local`
2. Wait if rate limited (exponential backoff)
3. Try with local Ollama: `ollama pull nomic-embed-text`

### Issue: "Search is slow"

**First query slow (500-2000ms)?**
- Normal - includes embedding generation

**All queries slow?**
- Check network tab for API latency
- May indicate OpenAI API issue
- Try local Ollama for faster inference

### Issue: "Wrong results returned"

**Debug scoring:**
```typescript
// Look at the score breakdown:
{
  "vector": "0.856",    // Semantic similarity
  "keyword": "1.000",   // Keyword match
  "recency": "1.000",   // How recent
  "satisfaction": "0.500", // User liked it
  "final": "0.843"      // Combined
}
```

If vector score is low (< 0.3), search engine doesn't find it similar.

---

## Test Checklist

- [ ] Create 5+ test conversations
- [ ] Verify embeddings are logged
- [ ] Test basic search (exact matches)
- [ ] Test semantic search (synonym matches)
- [ ] Test with filters (outcome, tag)
- [ ] Test error handling (missing query)
- [ ] Measure first query speed (should be slow)
- [ ] Measure cached query speed (should be fast)
- [ ] Test tag-based search
- [ ] Verify results are ranked correctly
- [ ] Monitor API costs (if using cloud)
- [ ] Check vector store size (should grow)

---

## Expected Behavior

### Embedding Storage
```
User sends message
         ↓
Chat completes
         ↓
onFinish handler runs
         ↓
Embeddings generated (500-800ms)
         ↓
Vector store updated
         ↓
Log: "[Semantic Search] Stored conversation embedding (3 tags, partial outcome)"
```

### Search Execution
```
User queries /api/search?q=error
         ↓
Generate embedding for query (500-800ms if not cached)
         ↓
Vector search (10-50ms)
         ↓
Rank and filter results (5-20ms)
         ↓
Return JSON response
         ↓
Total: 520-870ms (first query), 15-30ms (cached)
```

---

## Quick Reference

| Test | Command | Expected |
|------|---------|----------|
| Basic search | `q=error` | Find error-related chats |
| Typo tolerance | `q=eroor` | Still finds "error" |
| Tag filter | `tag=effect-ts` | Only Effect-related |
| Outcome filter | `outcome=solved` | Only solved chats |
| Min similarity | `minSimilarity=0.8` | Stricter results |
| Limit | `limit=5` | Max 5 results |

---

## Next Steps After Testing

1. ✅ If searches work → Great! Ready for production
2. ❌ If searches empty → Check prerequisites & embeddings logs
3. ⚠️ If searches slow → May need local Ollama or different API
4. 🔄 If wrong results → Adjust weights in search algorithm

---

## Support

If issues persist:

1. Check `SEMANTIC_SEARCH_GUIDE.md` for architecture details
2. Check `SEMANTIC_SEARCH_IMPLEMENTATION.md` for integration steps
3. Review error logs in browser console and server terminal
4. Verify OpenAI API key is valid (try manual curl to OpenAI API)
5. Check vector store has conversations (`[Semantic Search]` logs)
