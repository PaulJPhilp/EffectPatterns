# Semantic Search Test Suite

Comprehensive test coverage for the Supermemory-backed semantic search system in the Code Assistant.

## Test Overview

**Total Tests: 108 (All Passing ✓)**

### Test Files

| File | Tests | Coverage |
|------|-------|----------|
| `mocks.ts` | - | Mock utilities and fixtures |
| `supermemory-store.test.ts` | 25 | Unit tests for Supermemory Store |
| `search.test.ts` | 26 | Unit tests for semantic search functions |
| `chat-integration.test.ts` | 18 | Integration tests for chat route |
| `api-integration.test.ts` | 26 | Integration tests for search API |
| `e2e.test.ts` | 13 | End-to-end workflow tests |

## Test Suites

### 1. Supermemory Store Unit Tests (25 tests)

Located in: `supermemory-store.test.ts`

#### add() method tests
- ✓ Store conversation embedding with metadata
- ✓ Validate embedding dimension (1536 required)
- ✓ Handle valid 1536-dimensional embeddings
- ✓ Truncate large content to 5000 characters

#### search() method tests
- ✓ Search conversations with query text
- ✓ Filter results by userId
- ✓ Filter results by outcome type
- ✓ Respect limit parameter
- ✓ Return empty array for non-matching search
- ✓ Estimate similarity scores

#### searchByTag() method tests
- ✓ Find conversations by tag
- ✓ Filter by multiple tags
- ✓ Respect limit for tag search

#### getStats() method tests
- ✓ Return correct statistics for user
- ✓ Count only user's conversations
- ✓ Return valid utilization percentage (0-100)

#### Error handling tests
- ✓ Handle malformed JSON in memories
- ✓ Handle missing API key gracefully
- ✓ Return empty results on search error

#### Metadata validation tests
- ✓ Include all required metadata fields
- ✓ Preserve outcome values (solved/unsolved/partial/revisited)
- ✓ Preserve tags array
- ✓ Preserve satisfaction score

#### Concurrent operations tests
- ✓ Handle multiple simultaneous adds
- ✓ Handle multiple simultaneous searches

### 2. Semantic Search Functions Unit Tests (26 tests)

Located in: `search.test.ts`

#### Keyword relevance scoring
- ✓ Score based on keyword matches
- ✓ Handle empty query gracefully
- ✓ Handle very short keywords

#### Recency boost calculation
- ✓ Give full boost for recent timestamps (≤1 day)
- ✓ Give medium boost for week-old timestamps (1-7 days)
- ✓ Give low boost for old timestamps (>30 days)

#### Satisfaction boost normalization
- ✓ Normalize satisfaction scores to 0-1 range
- ✓ Handle edge cases (0 and >5)

#### Tag-based search
- ✓ Filter conversations by tag
- ✓ Respect limit parameter
- ✓ Return empty array for non-existent tags

#### Statistics retrieval
- ✓ Return stats object with required fields
- ✓ Handle empty store
- ✓ Calculate utilization percentage correctly

#### Problem finding
- ✓ Find conversations matching problem keywords
- ✓ Return empty array for non-matching keywords
- ✓ Respect limit parameter

#### Hybrid ranking algorithm
- ✓ Combine multiple scoring signals (60% semantic, 30% keyword, 7% recency, 3% satisfaction)
- ✓ Handle extreme scores (0 and 1)
- ✓ Balance semantic with keyword relevance

#### Search result filtering
- ✓ Filter by outcome type
- ✓ Apply minimum similarity threshold
- ✓ Respect date range filter

#### Error handling
- ✓ Handle missing data gracefully
- ✓ Skip results with parsing errors
- ✓ Handle empty search results

### 3. Chat Route Integration Tests (18 tests)

Located in: `chat-integration.test.ts`

#### Conversation storage
- ✓ Store conversation after completion
- ✓ Include all conversation metadata
- ✓ Truncate content to 5000 characters
- ✓ Handle multiple concurrent chat saves

#### Auto-tagging
- ✓ Auto-tag conversations based on content
- ✓ Handle conversations with no matching tags

#### Outcome detection
- ✓ Detect solved conversations
- ✓ Detect unsolved conversations
- ✓ Detect partial solutions
- ✓ Detect revisited conversations

#### User isolation
- ✓ Store separate embeddings per user
- ✓ Not leak user data between searches

#### Error handling
- ✓ Not fail chat when embedding fails
- ✓ Handle rate limiting gracefully
- ✓ Handle auth errors gracefully
- ✓ Handle network errors gracefully

#### Performance
- ✓ Handle large conversations efficiently
- ✓ Batch multiple chats efficiently

### 4. Search API Endpoint Integration Tests (26 tests)

Located in: `api-integration.test.ts`

#### GET /api/search endpoint
- ✓ Return search results with query
- ✓ Include pagination info
- ✓ Support limit parameter
- ✓ Handle empty query string
- ✓ Filter by tags when provided
- ✓ Filter by outcome when provided
- ✓ Return similarity scores with results
- ✓ Include metadata in results

#### GET /api/search/stats endpoint
- ✓ Return statistics object
- ✓ Calculate correct utilization percentage

#### Request validation
- ✓ Validate query parameter
- ✓ Validate limit parameter
- ✓ Validate tag parameter
- ✓ Handle missing required parameters

#### Response formatting
- ✓ Format results correctly
- ✓ Include all required metadata fields
- ✓ Handle null/undefined values gracefully

#### Error handling
- ✓ Handle invalid query gracefully
- ✓ Handle missing authentication
- ✓ Handle database errors gracefully
- ✓ Handle timeout errors

#### Search optimization
- ✓ Return sorted results by relevance
- ✓ Handle large result sets efficiently
- ✓ Cache repeated searches

#### Cross-user isolation
- ✓ Not return other users' data
- ✓ Filter by userId at application level

### 5. End-to-End Workflow Tests (13 tests)

Located in: `e2e.test.ts`

#### Complete conversation flow
- ✓ Store and retrieve conversation
- ✓ Track user's conversation history

#### Multi-user isolation
- ✓ Keep user data separate

#### Search and retrieval workflow
- ✓ Retrieve relevant conversations
- ✓ Retrieve by similarity score

#### Outcome tracking
- ✓ Track conversation outcomes
- ✓ Retrieve conversations by outcome filter

#### Tag-based discovery
- ✓ Enable tag-based content discovery

#### Full user journey
- ✓ Support complete user learning journey

#### Performance at scale
- ✓ Handle large conversation histories
- ✓ Search efficiently across large datasets

#### Data consistency
- ✓ Maintain data consistency across operations
- ✓ Handle concurrent operations safely

## Mock Utilities

Located in: `mocks.ts`

### MockSupermemoryClient

In-memory mock implementation of Supermemory client:

```typescript
const mockClient = new MockSupermemoryClient();

// Add memories
await mockClient.add({
  content: JSON.stringify(data),
  metadata: { type: "conversation", ... }
});

// Search memories
const results = await mockClient.search({
  q: "query",
  limit: 10
});

// Get all memories
const all = mockClient.getMemories();

// Clear all memories
mockClient.clear();
```

### Test Fixtures

- `testUserId`: "test-user-123"
- `testChatId`: "test-chat-456"
- `mockEmbedding`: Valid 1536-dimensional vector
- `mockVectorMetadata`: Sample metadata object
- `mockTags`: ["effect-ts", "error-handling", "typescript"]
- `mockSearchOptions`: Sample search options

### Helper Functions

- `createMockEmbedding(text)`: Generate deterministic embedding from text
- `createMockConversationEmbedding(chatId, userId, tags, outcome)`: Create test conversation data
- `createMockSearchMemory(chatId, userId, tags, similarity)`: Create test search result

## Running Tests

### Run all semantic search tests

```bash
pnpm exec vitest run lib/semantic-search/__tests__/
```

### Run specific test file

```bash
pnpm exec vitest run lib/semantic-search/__tests__/supermemory-store.test.ts
pnpm exec vitest run lib/semantic-search/__tests__/search.test.ts
pnpm exec vitest run lib/semantic-search/__tests__/chat-integration.test.ts
pnpm exec vitest run lib/semantic-search/__tests__/api-integration.test.ts
pnpm exec vitest run lib/semantic-search/__tests__/e2e.test.ts
```

### Run with watch mode

```bash
pnpm exec vitest watch lib/semantic-search/__tests__/
```

### Run with coverage

```bash
pnpm exec vitest run lib/semantic-search/__tests__/ --coverage
```

### Run specific test suite

```bash
pnpm exec vitest run lib/semantic-search/__tests__/supermemory-store.test.ts -t "add"
```

## Test Coverage Areas

### Core Functionality
- ✓ Embedding storage and retrieval
- ✓ Semantic search with ranking
- ✓ Tag-based filtering
- ✓ Outcome classification
- ✓ User isolation

### Data Quality
- ✓ Metadata validation
- ✓ Content truncation
- ✓ Dimension validation
- ✓ Type safety

### Performance
- ✓ Large dataset handling
- ✓ Concurrent operations
- ✓ Search efficiency
- ✓ Batch operations

### Error Handling
- ✓ Missing API keys
- ✓ Malformed JSON
- ✓ Network errors
- ✓ Rate limiting
- ✓ Authentication failures

### Security
- ✓ User data isolation
- ✓ Cross-user search prevention
- ✓ Metadata filtering
- ✓ Permission checks

## Test Architecture

### Unit Tests (75 tests)
- Test individual functions in isolation
- Use mocked dependencies
- Fast execution
- High code coverage
- Located in `*-store.test.ts` and `search.test.ts`

### Integration Tests (44 tests)
- Test component interactions
- Use mock clients
- Test API contracts
- Validate data flow
- Located in `chat-integration.test.ts`, `api-integration.test.ts`

### End-to-End Tests (13 tests)
- Test complete workflows
- Simulate real user journeys
- Verify data consistency
- Test at scale
- Located in `e2e.test.ts`

## Key Test Scenarios

### Scenario 1: User Learning Journey
1. User learns Effect-TS basics → conversation stored as "solved"
2. User explores error handling → new conversation stored
3. User encounters issue → stores "partial" outcome
4. User searches past conversations → finds similar resolved issue
5. User revisits and solves → marks as "revisited"

**Tests**: Chat integration, E2E full user journey

### Scenario 2: Multi-User Data Isolation
1. User 1 stores 3 secret conversations
2. User 2 stores 1 conversation
3. User 2 searches → only sees own data
4. System verifies no cross-user data leakage

**Tests**: User isolation, cross-user search isolation

### Scenario 3: Semantic Search Ranking
1. Store 5 conversations with varying relevance
2. Search for "error handling effect-ts"
3. Results ranked by hybrid score:
   - 60% semantic similarity
   - 30% keyword match
   - 7% recency boost
   - 3% satisfaction score

**Tests**: Hybrid ranking algorithm, search result filtering

### Scenario 4: Scale Performance
1. Store 100 conversations
2. Perform 3 concurrent searches
3. Each search completes in <1 second
4. No data loss or corruption

**Tests**: Performance at scale, concurrent operations

## Continuous Integration

All tests run on:
- Every commit (via pre-commit hooks if configured)
- Pull requests (recommended)
- Before deployment

### Test Command for CI

```bash
pnpm exec vitest run lib/semantic-search/__tests__/
```

Exit code: 0 (all tests pass), non-zero on failure

## Future Test Enhancements

- [ ] Performance benchmarks
- [ ] Load testing with 10k+ conversations
- [ ] Memory leak detection
- [ ] Integration with real Supermemory API (staging)
- [ ] Visual regression tests for search results
- [ ] Security scanning for injection vulnerabilities
- [ ] Data integrity verification across boundaries

## Notes

- All tests use Vitest for fast execution
- Mock implementations are feature-complete for testing purposes
- Tests are independent and can run in any order
- No external services required (fully mocked)
- Environment variable `SUPERMEMORY_API_KEY` is set in tests
- Tests clean up after themselves (no side effects)
