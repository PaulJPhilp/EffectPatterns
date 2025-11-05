# Pre-Loaded Patterns Testing Guide

This guide walks through the complete flow of pre-loaded Effect patterns in the Code Assistant chat app.

## Overview

The system has been updated to support pre-loaded Effect Patterns that are stored in Supermemory and displayed in the Memories Browser alongside user conversation history.

### Changes Made

1. **Pattern Seeding** (`scripts/seed-patterns.ts`)
   - Now adds `timestamp` to each pattern for proper date display
   - Ensures `userId: "system:patterns"` is stored in pattern metadata
   - Patterns are stored with type `"effect_pattern"` in Supermemory

2. **Supermemory Store** (`lib/semantic-search/supermemory-store.ts`)
   - Already correctly extracts pattern metadata including title, summary, skillLevel
   - Filters to show both user conversations and system patterns
   - Handles pattern-specific fields separately from conversations

3. **Memory Card Display** (`components/memory-card.tsx`)
   - Now correctly displays pattern titles (from `metadata.title`)
   - Uses pattern summaries for preview text (from `metadata.summary`)
   - Shows correct relative dates (now that patterns have timestamps)
   - Hides broken "View conversation" link for patterns (which have no chatId)

4. **Search** (`app/(chat)/api/search/route.ts`)
   - Already supports searching patterns alongside conversations
   - Properly scores patterns based on semantic and keyword relevance

## Testing Steps

### Step 1: Seed Patterns to Supermemory

First, run the pattern seeding script:

```bash
cd app/code-assistant
npm run seed:patterns
```

This will:
1. Load all patterns from `content/published/`
2. Add them to Supermemory with type `effect_pattern`
3. Wait for them to be indexed
4. Show progress and final statistics

Expected output:
```
🌱 Seeding 150+ patterns into Supermemory...
✅ [100%] Queued: pattern-name
✅ Indexed: pattern-name
...
🎉 All 150+ patterns successfully indexed in Supermemory!
```

### Step 2: Test Pattern Search via API

Run the test script to verify patterns are searchable:

```bash
cd app/code-assistant
npm run test:patterns
```

This will search for patterns with keywords like:
- "error handling"
- "retry"
- "async"
- "Layer"

Expected output:
```
🔍 Testing pattern search in Supermemory...

Test 1: Search for 'error handling'
✅ Found 5 results

Result 1:
  Pattern ID: handle-errors-with-catch
  Title: Error Handling with Catch
  Skill Level: intermediate
  Tags: error-handling, control-flow
```

### Step 3: Start the Code Assistant Dev Server

```bash
cd app/code-assistant
npm run dev
```

Visit `http://localhost:3002/chat` in your browser.

### Step 4: Test Memory Browser with Patterns

1. **Navigate to Memories Browse** - Click "Browse" in the sidebar
2. **Search for a pattern** - Try searching for "error handling"
   - Verify you see pattern cards with:
     - ✅ Pattern title (e.g., "Error Handling with Catch")
     - ✅ Summary/preview text visible
     - ✅ Relative date (e.g., "less than a minute ago")
     - ✅ Tags displayed
     - ✅ Memory ID shown
     - ✅ Copy button available
     - ❌ "View conversation" link NOT present (patterns have no chatId)

3. **Verify scoring** - Check the score breakdown:
   - Semantic score should be high (~1.0) for "error handling" on error patterns
   - Keyword score should be high (~1.0) if keywords match title/summary
   - Recency should be high (1.0) since patterns were just seeded
   - Final score should combine all factors

4. **Try different searches**:
   - Search "retry" - should find retry-related patterns
   - Search "async" - should find async/concurrency patterns
   - Search "Layer" - should find dependency injection patterns
   - Search "validation" - should find validation patterns

5. **Test filters**:
   - Filter by tag: Select "error-handling" tag
   - Filter by outcome: Patterns won't appear for outcome filters (they don't have outcomes)
   - Results should update correctly

### Step 5: Test Pattern Display Details

For each pattern card, verify:

| Field | Expected | Status |
|-------|----------|--------|
| Title | Pattern name from MDX frontmatter | ✅ |
| Preview | Pattern summary text | ✅ |
| Date | Relative date like "less than a minute ago" | ✅ |
| Tags | Skill-level tags like "effect-ts", "error-handling" | ✅ |
| Memory ID | Format: `pattern_{patternId}` | ✅ |
| Outcome Badge | Not shown for patterns | ✅ |
| Link | No "View" link (pattern has empty chatId) | ✅ |

### Step 6: Test Edge Cases

1. **Empty search** - Should show "Start searching" message
2. **No results** - Search for nonsense like "xyzabc123" should show "No memories found"
3. **Large result set** - Search common terms like "pattern" should show many results with pagination
4. **Infinite scroll** - Scroll down to load more patterns
5. **Copy functionality** - Click copy button, verify ID is copied to clipboard

### Step 7: Test Search Scoring

Compare pattern scores between similar queries:

```bash
# Search 1: "error handling"
GET /api/search?q=error%20handling&limit=5

# Expected: Error handling patterns ranked high
# - handle-errors-with-catch (semantic: 1.000, keyword: 1.000)
# - catch-specific-errors (semantic: 0.950, keyword: 0.900)
```

Verify:
- ✅ Semantic similarity is high for similar patterns
- ✅ Keyword matching works for pattern titles
- ✅ Final scores properly combine semantic + keyword + recency

## Troubleshooting

### No patterns appear in search

**Problem**: Search returns 0 results

**Solutions**:
1. Verify patterns were seeded: Check Supermemory dashboard
2. Check API key: Ensure `SUPERMEMORY_API_KEY` is set in `.env.local`
3. Run test script: `npm run test:patterns` to verify search works
4. Check server logs for errors

### Patterns show "Unknown date"

**Problem**: All patterns show "Unknown date" instead of relative date

**Solutions**:
1. Re-seed patterns: `npm run seed:patterns`
2. Verify timestamp is being added: Check seed-patterns.ts line 150
3. Clear Supermemory cache (if available)

### Patterns show "Untitled" and "No preview available"

**Problem**: Cards don't show title or summary

**Solutions**:
1. Verify pattern metadata was extracted correctly
2. Check memory-card.tsx lines 54 and 65 handle pattern fields
3. Review Supermemory store extraction (supermemory-store.ts lines 250-255)

### Broken "View conversation" link

**Problem**: Link appears but goes to broken page

**Solutions**:
1. Verify fix in memory-card.tsx line 279 checks for `metadata.chatId`
2. Re-deploy application
3. Check browser console for errors

## Verification Checklist

After completing all steps, verify:

- [ ] `seed-patterns.ts` adds timestamp to patterns
- [ ] `supermemory-store.ts` correctly extracts pattern metadata
- [ ] `memory-card.tsx` displays title, summary, and date
- [ ] `memory-card.tsx` hides broken link for patterns
- [ ] Pattern search returns results with high scores
- [ ] Memory browser displays patterns alongside conversations
- [ ] Copy button works for pattern IDs
- [ ] Infinite scroll works for large result sets
- [ ] Search filters work correctly
- [ ] No console errors in browser

## Database Schema Reference

### Pattern Memory Format (Stored in Supermemory)

```json
{
  "type": "effect_pattern",
  "patternId": "handle-errors-with-catch",
  "title": "Error Handling with Catch",
  "skillLevel": "intermediate",
  "summary": "How to handle errors using the catch combinator",
  "useCase": ["Error Handling", "Control Flow"],
  "tags": ["error-handling", "control-flow"],
  "relatedPatterns": ["retry-based-on-specific-errors"],
  "author": "effect_website",
  "rule": "Use catch to recover from specific errors in Effect workflows",
  "content": "Full markdown content...",
  "timestamp": "2024-11-02T12:00:00.000Z",
  "userId": "system:patterns"
}
```

### Pattern Metadata (After Extraction)

```typescript
{
  chatId: "",                    // Empty for patterns
  userId: "system:patterns",
  type: "summary",
  content: "Full markdown...",
  timestamp: "2024-11-02T12:00:00.000Z",
  outcome: undefined,            // Patterns don't have outcomes
  tags: ["error-handling"],
  satisfactionScore: undefined,  // Patterns don't have satisfaction
  // Pattern-specific fields
  patternId: "handle-errors-with-catch",
  title: "Error Handling with Catch",
  skillLevel: "intermediate",
  summary: "How to handle errors using the catch combinator"
}
```

## Performance Notes

- Pattern seeding takes ~30 seconds for 150+ patterns
- Search with patterns included is fast (~100-200ms)
- Pagination loads 20 results at a time
- Cache is refreshed every 5 minutes in production

## Next Steps

After verification:

1. **Enable pattern search in chat** - Update AI agent to use pattern search
2. **Add pattern recommendations** - Show relevant patterns in conversation
3. **Create pattern browser UI** - Dedicated page for browsing all patterns
4. **Add pattern to message** - Allow users to include patterns in messages
5. **Pattern feedback** - Track which patterns are most helpful

---

**Last Updated**: 2024-11-02
**Version**: 0.1.0
