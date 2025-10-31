# Search Algorithm Analysis - Document Index

## Overview

This directory contains a comprehensive analysis of the `searchPatterns` function in the `@effect-patterns/toolkit` package. The analysis identifies why the search function returns empty results for common queries like "error handling" and "retry".

## Documents Included

### 1. Quick Reference (Start Here)
**File:** `SEARCH_ALGORITHM_QUICK_REFERENCE.md`
**Reading Time:** 5-10 minutes
**Best For:** Getting up to speed quickly

Contains:
- Summary of the issue
- Root causes with exact file/line locations
- Test proof that demonstrates the problem
- Quick solution approaches
- Testing instructions

### 2. Detailed Analysis
**File:** `SEARCH_ALGORITHM_ANALYSIS.md`
**Reading Time:** 15-20 minutes
**Best For:** Understanding the complete algorithm

Contains:
- Comprehensive technical explanation
- Three main algorithm components (fuzzy score, relevance calculation, search function)
- Detailed problem breakdown with test cases
- Four identified issues
- Real-world impact analysis
- Five recommended solutions
- Complete test results

### 3. Visual Explanation
**File:** `SEARCH_ALGORITHM_VISUALIZATION.md`
**Reading Time:** 10-15 minutes
**Best For:** Visual learners and implementation reference

Contains:
- Flow diagrams of the search process
- Character-by-character matching breakdown
- Expected vs actual behavior comparison
- Early return problem visualization
- Data structure mismatch illustration
- Testing examples
- File location summary
- Fix implementation guide

### 4. This Index
**File:** `SEARCH_ANALYSIS_INDEX.md`
**Your Location:** You are here

## Quick Summary

### The Problem

The `searchPatterns` function uses strict character-by-character fuzzy matching that fails when:

1. **Space vs Hyphen Mismatches**
   - Query: "error handling" (with space)
   - Data: "error-handling" (with hyphen)
   - Result: NO MATCH (completely fails)

2. **All-or-Nothing Matching**
   - Every character in the query must be found in sequence
   - If one character doesn't match, the entire search fails
   - Space character cannot match hyphen character

3. **Early Returns**
   - Searches title field first, returns immediately if any score
   - Never checks tags/category if title returns a score
   - Lower-weighted fields never get evaluated

### Root Cause

**Location:** `packages/toolkit/src/search.ts` lines 20-46
**Critical Line:** Line 40 - `if (queryIndex !== query.length) return 0;`

```typescript
// This line returns 0 if not ALL characters from query are found
// When space character can't match hyphen, the entire search fails
if (queryIndex !== query.length) return 0;
```

### Impact

Common searches that fail:
- "error handling" → cannot find patterns tagged "error-handling"
- "data transformation" → cannot find patterns tagged "data-transformation"
- "resource management" → cannot find patterns tagged "resource-management"
- Any multi-word query with natural spaces

### Solution

Normalize separators before matching:

```typescript
const normalize = (str: string) => str.replace(/[-_]/g, ' ');
```

This allows "error handling" to match "error-handling" by treating both as "error handling" before comparison.

## Source Code Locations

### Implementation Files

**Pure Function Version:**
- File: `/Users/paul/Projects/Published/Effect-Patterns/packages/toolkit/src/search.ts`
- Lines 20-46: `fuzzyScore()` - The core matching algorithm (CRITICAL ISSUE HERE)
- Lines 55-76: `calculateRelevance()` - Scoring across pattern fields
- Lines 109-146: `searchPatterns()` - Main search function

**Effect Service Version:**
- File: `/Users/paul/Projects/Published/Effect-Patterns/packages/toolkit/src/services/search.ts`
- Lines 33-235: `PatternSearch` Effect service
- Lines 241-279: Legacy `searchPatterns()` function
- Lines 284-336: Helper functions (fuzzyScore, calculateRelevance)

### Schema Definitions

- File: `/Users/paul/Projects/Published/Effect-Patterns/packages/toolkit/src/schemas/pattern.ts`
- Lines 13-24: `PatternCategory` enum (uses hyphens)
- Lines 53-66: `Pattern` schema definition

### Data Files

- File: `/Users/paul/Projects/Published/Effect-Patterns/data/patterns-index.json`
- Contains pattern definitions with hyphenated categories/tags

## Reading Guide

### For Quick Understanding
1. Read `SEARCH_ALGORITHM_QUICK_REFERENCE.md` (5-10 min)
2. Review the "Test Proof" section to see it fail
3. Look at "Solution Approaches" for fix ideas

### For Implementation
1. Read `SEARCH_ALGORITHM_VISUALIZATION.md` section "Fix Implementation Location"
2. Review exact code locations listed above
3. Implement separator normalization
4. Test with provided test cases

### For Complete Understanding
1. Start with `SEARCH_ALGORITHM_QUICK_REFERENCE.md`
2. Read `SEARCH_ALGORITHM_ANALYSIS.md` in full
3. Reference `SEARCH_ALGORITHM_VISUALIZATION.md` for diagrams
4. Review source code at locations specified above

## Test Cases

All three documents include test cases to verify the issue:

**Quick Test:**
```bash
node -e "
function fuzzyScore(query, target) {
  let queryIndex = 0, targetIndex = 0;
  while (queryIndex < query.length && targetIndex < target.length) {
    if (query[queryIndex] === target[targetIndex]) {
      queryIndex++;
    }
    targetIndex++;
  }
  if (queryIndex !== query.length) return 0;
  return 1;
}

console.log('Query \"error handling\" vs \"error-handling\":', fuzzyScore('error handling', 'error-handling'));
console.log('Query \"error handling\" vs \"error handling\":', fuzzyScore('error handling', 'error handling'));
"
```

Expected Output:
```
Query "error handling" vs "error-handling": 0
Query "error handling" vs "error handling": 1
```

## Issues Identified

1. **Substring Matching vs Word Matching**
   - Algorithm does character-by-character matching
   - Does not understand word boundaries
   - Fails on space/hyphen mismatches

2. **Early Return Logic**
   - Returns immediately when title field matches
   - Never checks tags/category fields if title returns > 0
   - Causes loss of potential matches

3. **Case Sensitivity**
   - While strings are lowercased, no tolerance for punctuation variations
   - Treats space and hyphen as different characters

4. **Space Handling**
   - Spaces are treated as literal characters to match
   - Natural language queries use spaces
   - Data uses hyphens/underscores
   - Mismatch causes complete failure

## Recommended Solutions

Listed from quickest to most comprehensive:

### Option 1: Normalize Separators (Quickest)
Replace hyphens/underscores with spaces before matching

### Option 2: Remove Early Returns (Better)
Check all fields and return highest score

### Option 3: Token-Based Matching (Best)
Split into tokens and match word-by-word

### Option 4: Full Word Boundary Support (Most Robust)
Complete rewrite with proper word boundary detection

Details for each solution are in the analysis documents.

## Files To Modify

To implement a fix, modify these two files:

1. `/Users/paul/Projects/Published/Effect-Patterns/packages/toolkit/src/search.ts`
   - Modify `fuzzyScore()` function (lines 20-46)

2. `/Users/paul/Projects/Published/Effect-Patterns/packages/toolkit/src/services/search.ts`
   - Modify `fuzzyScore()` function (lines 284-310)
   - Both functions contain identical code

## Next Steps

1. **Understand the Issue**
   - Read SEARCH_ALGORITHM_QUICK_REFERENCE.md
   - Run the test cases to see it fail

2. **Plan Implementation**
   - Review SEARCH_ALGORITHM_VISUALIZATION.md for fix location
   - Choose solution approach from SEARCH_ALGORITHM_ANALYSIS.md

3. **Implement Fix**
   - Modify the two `fuzzyScore()` functions
   - Add separator normalization
   - Test with provided cases

4. **Verify**
   - Run search with "error handling" query
   - Verify it now finds "error-handling" patterns
   - Check existing tests still pass

## Contact

For questions about this analysis, refer to the detailed documents or review the source code locations mentioned above.

---

**Analysis Date:** October 31, 2025
**Project:** Effect Patterns Hub
**Toolkit Package:** `@effect-patterns/toolkit`
**Files Analyzed:** 5
**Issues Found:** 4 root causes
**Impact:** Search returns empty results for multi-word queries
EOF
cat /Users/paul/Projects/Published/Effect-Patterns/SEARCH_ANALYSIS_INDEX.md
