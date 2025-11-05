# Pattern Indexing Troubleshooting Guide

**Last Updated**: November 3, 2025
**Current Issue**: Patterns not appearing in search results
**Root Cause**: Supermemory list API returning 500 error

---

## Quick Diagnosis Checklist

- [ ] Patterns appear in memory browser search results? → **No**
- [ ] Getting error message? → **No, just 0 results**
- [ ] Can search conversations? → **Yes**
- [ ] Dev server running? → **Yes (localhost:3001)**
- [ ] SUPERMEMORY_API_KEY set? → **Yes**

**Conclusion**: External service issue with Supermemory API

---

## What We Know

### ✅ Confirmed Working
- Seeding script queued 130 patterns (Phase 1: 100%)
- Memory card display code is correct
- Timestamps added to patterns
- User ID set correctly (system:patterns)
- Supermemory API key is valid
- Search API endpoint working

### ❌ Confirmed Not Working
- Supermemory `memories.list()` returns 500 error
- Pattern search returns 0 results
- Patterns not visible in list/fetch operations
- Direct API access returns 404

---

## Issue: Supermemory List API 500 Error

**Error Message**:
```
500 {"details":"Internal server error","error":"INTERNAL_SERVER_ERROR"}
```

**Where It Happens**:
- File: `lib/semantic-search/supermemory-store.ts:82`
- Function: `fetchAllMemories()`
- Call: `await (this.client.memories as any).list({ page, limit: 100 })`

**Impact**:
- Cannot retrieve list of stored memories
- Pattern search falls back to 0 results
- Memory browser shows no patterns

---

## Immediate Actions for Users

### Step 1: Wait and Retry (30-60 minutes)

Some services batch process indexing. Try:

```bash
# In 30-60 minutes, run this test
cd app/code-assistant
npm run test:patterns

# Look for output like:
# ✅ Found 5+ results for 'error handling'
# ✅ Found 3+ results for 'retry'
```

If patterns appear → **Problem resolved!** Supermemory was just processing.

### Step 2: Check Supermemory Dashboard

1. Log into your Supermemory account
2. Navigate to "Memories" or "Collections"
3. Look for entries with type "effect_pattern"
4. Expected: 130 pattern entries
5. If found: Patterns are stored correctly
6. If not found: Contact Supermemory support

### Step 3: Verify API Key

In `app/code-assistant/.env.local`:

```bash
# Should look like:
SUPERMEMORY_API_KEY=sm_xxxxxxxxxxxxxxxx_xxxxxxxxxxxxx

# If empty or wrong, update it
# Then restart dev server:
npm run dev
```

### Step 4: Contact Supermemory Support

If patterns still not appearing after 60 minutes:

**Report Details**:
- Issue: `memories.list()` API returns 500 error
- Status: Bulk seeded 130 patterns
- Expected: Patterns should be searchable after ~15 min
- Actual: 0 results, list API failing
- API Key: `sm_BpkYMBGxk4M4jYH2LbiFWx_JwJdIAnyqJcZkYbozamuMaBLPfPARvbNYfEFJwzUnLEjvdjOqXmzFahMWvqdqkWy`

---

## For Developers: Quick Fixes

### Option A: Add Retry Logic (5 min implementation)

Edit `supermemory-store.ts`, modify `fetchAllMemories()`:

```typescript
async fetchAllMemories(): Promise<any[]> {
  // ... existing code ...
  const maxRetries = 3;
  let lastError;

  for (let retry = 0; retry < maxRetries; retry++) {
    try {
      const response = await (this.client.memories as any).list({ page, limit: 100 });
      // ... rest of code ...
      return allMemories;
    } catch (error) {
      lastError = error;
      if (retry < maxRetries - 1) {
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, retry) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

### Option B: Fallback to Search API (10 min implementation)

If list API fails, fall back to search:

```typescript
async fetchAllMemories(): Promise<any[]> {
  try {
    // Try list API first
    return await this.listAllMemories();
  } catch (error) {
    console.warn("List API failed, falling back to search");
    // Use search API as fallback
    return await this.searchAllMemories();
  }
}

async searchAllMemories(): Promise<any[]> {
  const results = [];
  const queries = ["effect", "error", "async", "data", "retry", "pattern"];

  for (const query of queries) {
    const response = await this.client.search.memories({ q: query, limit: 50 });
    if (response.results) {
      results.push(...response.results);
    }
  }

  // Remove duplicates by ID
  return Array.from(new Map(results.map(r => [r.id, r])).values());
}
```

### Option C: Use Local Cache (15 min implementation)

Store patterns in PostgreSQL after seeding:

```typescript
// In seed-patterns.ts, after successfully queuing pattern:
await db.insert(patterns).values({
  id: `pattern_${patternId}`,
  type: 'effect_pattern',
  title: frontmatter.title,
  summary: frontmatter.summary,
  content: JSON.stringify(memoryData),
  userId: 'system:patterns',
  createdAt: new Date(),
});
```

Then in search, check DB first:

```typescript
// In supermemory-store.ts:
async searchByList(query, options) {
  try {
    // Try Supermemory
    return await this.searchSupermemory(query, options);
  } catch {
    // Fall back to DB
    return await this.searchPostgres(query, options);
  }
}
```

---

## Testing the Fix

After implementing a fix, test with:

```bash
# Test 1: Direct API test
cd app/code-assistant
npx tsx scripts/test-patterns.ts

# Expected output:
# ✅ Found 3+ results for 'error handling'
# ✅ Found 2+ results for 'retry'

# Test 2: Manual browser test
npm run dev
# Open http://localhost:3001
# Click "Browse" in sidebar
# Search "error" or "retry"
# Should see pattern results with titles, dates, summaries

# Test 3: Run test command
npm run test:patterns
# Should show pattern IDs starting with "pattern_"
```

---

## Long-Term Solutions

### 1. Monitor Supermemory Status
Add periodic health checks:

```typescript
async function checkSupermemoryHealth() {
  try {
    const result = await client.memories.list({ page: 1, limit: 1 });
    return result ? "healthy" : "no_data";
  } catch (error) {
    return "error";
  }
}
```

### 2. Implement Caching Strategy
Cache list results for 5 minutes to reduce API calls

### 3. Add Error Recovery
- Log all 500 errors
- Alert if list API fails
- Provide fallback UI for search failures

### 4. Consider Hybrid Storage
- Keep patterns in both Supermemory (for search) and PostgreSQL (for reliability)
- Query both in parallel
- Merge and deduplicate results

---

## FAQ

**Q: Will patterns ever appear?**
A: Yes, once Supermemory fixes their 500 error or you implement a workaround.

**Q: Why did seeding succeed but patterns don't show?**
A: Phase 1 (queueing) succeeded. Phase 2/3 (indexing/discovery) failed due to API issue.

**Q: Can I search for conversations?**
A: Yes, conversations work fine. Only patterns have issues due to the list API error.

**Q: Should I reseed patterns?**
A: Probably not yet. Wait 30-60 min first. If list API still returns 500, seeding again won't help.

**Q: Is this a code bug?**
A: No. Our code is correct. This is an external service issue (Supermemory API).

**Q: What's in INDEXING_INVESTIGATION.md?**
A: Detailed technical analysis of the issue. Read if you want full context.

---

## Key Files to Know

| File | Purpose | Status |
|------|---------|--------|
| `scripts/seed-patterns.ts` | Seeds patterns to Supermemory | ✅ Works |
| `scripts/test-patterns.ts` | Tests if patterns are searchable | ❌ Returns 0 results |
| `scripts/diagnose-supermemory.ts` | Diagnostic tool | 🔍 Reveals 500 error |
| `lib/semantic-search/supermemory-store.ts` | List/search API calls | ❌ List API fails |
| `components/memory-card.tsx` | Display patterns | ✅ Code is correct |
| `INDEXING_INVESTIGATION.md` | Detailed technical analysis | 📊 Full findings |

---

## Next Steps

### If You're a User:
1. Wait 30-60 minutes for Supermemory to process
2. Try searching again: `npm run test:patterns`
3. If still not working, contact Supermemory support with the details above

### If You're a Developer:
1. Read `INDEXING_INVESTIGATION.md` for full context
2. Implement Option A (retry logic) - lowest risk, quick win
3. Test with `npm run test:patterns`
4. Monitor Supermemory status going forward

### If You're a DevOps/Maintainer:
1. Check Supermemory service status
2. Contact Supermemory support
3. Monitor for resolution
4. Consider implementing Option B or C as permanent fix

---

**Summary**: Patterns were seeded successfully but Supermemory's API has an issue. Either wait for them to fix it or implement a workaround. Our code is correct.
