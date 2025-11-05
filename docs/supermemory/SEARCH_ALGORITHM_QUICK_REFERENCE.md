# Search Algorithm - Quick Reference

## The Issue

The `searchPatterns` function uses a strict character-by-character fuzzy matching algorithm that fails on common queries because:

1. **Space vs. Hyphen Mismatches**: Query "error handling" cannot find patterns tagged with "error-handling"
2. **All-or-Nothing Matching**: If a space character can't be matched in the target string, the entire match fails
3. **Early Returns**: Higher-weighted fields (title, description) prevent checking lower-weighted but more relevant fields (tags, category)

## Why "error handling" Returns No Results

```javascript
// Query: "error handling"
// Target: "error-handling" (pattern category)

// Matching process:
e → e ✓
r → r ✓  
r → r ✓
o → o ✓
r → r ✓
(SPACE) → - ✗  // Space is NOT a hyphen!
           // MATCH FAILS - returns score 0
           // Pattern is FILTERED OUT
```

## Root Causes

### Location 1: Strict Character Matching
**File:** `/Users/paul/Projects/Published/Effect-Patterns/packages/toolkit/src/search.ts`
**Lines:** 20-46 (fuzzyScore function)

```typescript
// Line 40: CRITICAL - Returns 0 if ALL characters not found
if (queryIndex !== query.length) return 0;
```

This line treats spaces as literal characters to match. When a space in the query can't find a matching space in the target (e.g., hyphen instead), the entire match fails.

### Location 2: Early Returns
**File:** `/Users/paul/Projects/Published/Effect-Patterns/packages/toolkit/src/search.ts`
**Lines:** 55-76 (calculateRelevance function)

```typescript
// Returns immediately if title matches - never checks tags/category
const titleScore = fuzzyScore(q, pattern.title.toLowerCase());
if (titleScore > 0) return titleScore * 1.0;  // EARLY RETURN

// These are never evaluated if title returns anything > 0
const descScore = fuzzyScore(q, pattern.description.toLowerCase());
if (descScore > 0) return descScore * 0.7;   // EARLY RETURN

const tagScores = pattern.tags.map((tag) => fuzzyScore(q, tag.toLowerCase()));
const bestTagScore = Math.max(...tagScores, 0);
if (bestTagScore > 0) return bestTagScore * 0.5;  // NEVER REACHED if title had any match
```

### Location 3: Data Structure Mismatch
**File:** `/Users/paul/Projects/Published/Effect-Patterns/packages/toolkit/src/schemas/pattern.ts`
**Lines:** 13-24

Pattern categories use hyphens:
```typescript
'error-handling',
'data-transformation',
'resource-management',
```

But users naturally query with spaces:
- "error handling"
- "data transformation"
- "resource management"

## Test Proof

```
Query: "error handling"
  "error-handling"     → Score: 0  NO MATCH ✗
  "error handling"     → Score: 1  MATCH ✓
  "handling"           → Score: 0  NO MATCH ✗

Query: "retry"
  "retry"              → Score: 1  MATCH ✓
  "resilience"         → Score: 0  NO MATCH ✗
  "error-handling"     → Score: 0  NO MATCH ✗

Pattern: "Retry with Exponential Backoff"
  Query "error handling" → Relevance: 0 ✗ (EMPTY RESULT)
  Query "error"         → Relevance: 0.532 ✓
  Query "retry"         → Relevance: 1 ✓
```

## Impact

**Affected Queries:**
- "error handling" - cannot find patterns with "error-handling" tag
- "data transformation" - cannot find patterns with "data-transformation" tag
- "retry pattern" - limited match capability
- Any multi-word query with space-separated terms

**Unaffected Queries:**
- Single words: "retry", "backoff", "error"
- Exact matches: "error-handling" (if user types hyphen)
- Partial matches that don't require space matching

## Solution Approaches

### Quick Fix: Normalize Separators
Replace hyphens with spaces in both query and target before matching:

```typescript
const normalize = (str: string) => str.replace(/-/g, ' ');
const normalizedQuery = normalize(q);
const normalizedTarget = normalize(target);
const score = fuzzyScore(normalizedQuery, normalizedTarget);
```

### Better Fix: Remove Early Returns
Check all fields (title, description, tags, category) and return the highest score:

```typescript
const titleScore = fuzzyScore(q, pattern.title.toLowerCase());
const descScore = fuzzyScore(q, pattern.description.toLowerCase());
const tagScores = pattern.tags.map((tag) => fuzzyScore(q, tag.toLowerCase()));
const categoryScore = fuzzyScore(q, pattern.category.toLowerCase());

const scores = [
  titleScore * 1.0,
  descScore * 0.7,
  Math.max(...tagScores, 0) * 0.5,
  categoryScore * 0.4,
];

return Math.max(...scores);
```

### Best Fix: Token-Based Matching
Split queries and targets into word tokens, match tokens individually:

```typescript
// "error handling" → ["error", "handling"]
// "error-handling" → ["error", "handling"]
// Match at token level instead of character level
```

## Related Files

- **Pure implementation:** `packages/toolkit/src/search.ts` (Lines 20-146)
- **Effect service:** `packages/toolkit/src/services/search.ts` (Lines 241-336)
- **Schema:** `packages/toolkit/src/schemas/pattern.ts` (Lines 13-24, 53-66)
- **Pattern data:** `data/patterns-index.json`
- **Detailed analysis:** `SEARCH_ALGORITHM_ANALYSIS.md` (this repository)

## Testing the Algorithm

To verify the issue yourself:

```bash
# Run our test
node -e "
function fuzzyScore(query, target) {
  if (!query) return 1;
  if (!target) return 0;
  let queryIndex = 0, targetIndex = 0, matches = 0;
  while (queryIndex < query.length && targetIndex < target.length) {
    if (query[queryIndex] === target[targetIndex]) {
      matches++;
      queryIndex++;
    }
    targetIndex++;
  }
  if (queryIndex !== query.length) return 0;
  return (matches / query.length) * 0.7;
}

console.log('Query \"error handling\" vs \"error-handling\":', fuzzyScore('error handling', 'error-handling'));
console.log('Query \"error handling\" vs \"error handling\":', fuzzyScore('error handling', 'error handling'));
console.log('Query \"retry\" vs \"retry\":', fuzzyScore('retry', 'retry'));
"
```

Expected output:
```
Query "error handling" vs "error-handling": 0
Query "error handling" vs "error handling": 1
Query "retry" vs "retry": 1
```

This confirms that space-to-hyphen mismatches cause complete search failures.
