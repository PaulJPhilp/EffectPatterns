# Search Implementation Files - Quick Navigation Index

## Overview
This index provides direct links to all search-related files in the Effect Patterns Hub codebase, organized by functionality.

---

## Search Algorithm Files

### Pure Function Implementation (Core)
**Primary search implementation - no dependencies**

- **File:** `/Users/paul/Projects/Published/Effect-Patterns/packages/toolkit/src/search.ts`
- **Lines:** 200 total
- **Key Functions:**
  - `fuzzyScore()` - Lines 33-63 (character-by-character matching)
  - `calculateRelevance()` - Lines 76-97 (multi-field scoring with weights)
  - `searchPatterns()` - Lines 131-168 (main search with filters)
  - `getPatternById()` - Lines 177-182 (direct lookup)
  - `toPatternSummary()` - Lines 190-199 (lightweight conversion)

### Effect Service Wrapper
**Production-ready with configuration, logging, and DI**

- **File:** `/Users/paul/Projects/Published/Effect-Patterns/packages/toolkit/src/services/search.ts`
- **Lines:** 380 total
- **Key Components:**
  - `PatternSearch` service class - Lines 33-235 (Effect.Service implementation)
  - Legacy `searchPatterns()` - Lines 241-279 (backward compatibility)
  - Helper functions - Lines 284-336 (fuzzyScore, calculateRelevance)
- **Dependencies:** ToolkitConfig, ToolkitLogger, Effect.Service pattern

### Schema Definitions
**Pattern data structure**

- **File:** `/Users/paul/Projects/Published/Effect-Patterns/packages/toolkit/src/schemas/pattern.ts`
- **Contains:** Pattern interface, PatternSummary, category enum, difficulty levels

### Data Loading
**JSON file loading with caching**

- **File:** `/Users/paul/Projects/Published/Effect-Patterns/packages/toolkit/src/io.ts`
- **Key Functions:**
  - `loadPatternsFromJson()` - Loads patterns from JSON
  - `loadPatternsFromJsonRunnable()` - With Node layer

---

## Supermemory Integration Files

### User Memory Service
**Supermemory API integration for user preferences and conversation memory**

- **File:** `/Users/paul/Projects/Published/Effect-Patterns/app/code-assistant/lib/memory.ts`
- **Lines:** 719 total
- **Class:** UserMemoryService
- **Key Methods:**
  - `getPreferences()` - Line 149
  - `setPreferences()` - Line 182
  - `getConversationMemory()` - Line 204
  - `setConversationMemory()` - Line 236
  - `getUserData()` - Line 257
  - `setUserData()` - Line 289
  - `getConversationMetadata()` - Line 334
  - `getUserActivity()` - Line 387
  - `setUserActivity()` - Line 417
- **Supermemory API Calls:**
  - `client.search.memories()` - Lines 153, 207, 260, 337, 390
  - `client.memories.add()` - Lines 188, 240, 293, 368, 421

### User Preferences Hook
**React hook for loading and saving user preferences**

- **File:** `/Users/paul/Projects/Published/Effect-Patterns/app/code-assistant/lib/hooks/use-user-preferences.ts`
- **Lines:** 122 total
- **Hook Function:** `useUserPreferences()`
- **Key Methods:**
  - `loadPreferences()` - Line 14
  - `savePreferences()` - Line 55
  - `updatePreference()` - Line 106
- **API Endpoint:** `/api/user/preferences`
- **Features:** Auto-load, graceful degradation, optimistic updates

---

## AI Tool Integration Files

### Search Patterns Tool
**AI SDK tool definitions for pattern search**

- **File:** `/Users/paul/Projects/Published/Effect-Patterns/app/code-assistant/lib/ai/tools/search-patterns.ts`
- **Lines:** 151 total
- **Tools Defined:**
  - `searchPatternsTool()` - Lines 37-80
    - Parameters: query, category, difficulty, limit
    - Uses: `searchPatterns()` from toolkit (line 49)
  - `getPatternByIdTool()` - Lines 82-125
    - Parameter: pattern ID
  - `listPatternCategoriesTool()` - Lines 127-150
    - Static category list
- **Data Source:** `data/patterns-index.json` (loaded via `loadPatterns()`)

---

## Chat Engine & Orchestration

### Chat Engine
**Main chat processing and tool integration**

- **File:** `/Users/paul/Projects/Published/Effect-Patterns/app/code-assistant/lib/chat/engine.ts`
- **Lines:** 300+ (partial file read)
- **Key Imports:**
  - `searchPatternsTool` - Line 13
  - `getPatternByIdTool` - Line 11
  - `listPatternCategoriesTool` - Line 12
- **Function:** `processChat()` - Line 83
- **Context:** Uses tools in AI model provider (streamText)

### Chat Route Endpoint
**Express route handler for chat API**

- **File:** `/Users/paul/Projects/Published/Effect-Patterns/app/code-assistant/app/(chat)/api/chat/route.ts`
- **Method:** POST
- **Orchestration:** Calls Chat Engine for processing
- **Returns:** Streamed AI response with tool results

---

## User Preferences API

### Preferences Route
**API endpoint for getting/setting user preferences**

- **File:** `/Users/paul/Projects/Published/Effect-Patterns/app/code-assistant/app/(chat)/api/user/preferences/route.ts`
- **Methods:**
  - GET - Retrieve current preferences
  - POST - Save new preferences
- **Integration:** Uses Supermemory via UserMemoryService
- **Authentication:** Optional (graceful degradation for guests)

---

## Data Files

### Pattern Index
**Generated pattern catalog**

- **File:** `/Users/paul/Projects/Published/Effect-Patterns/data/patterns-index.json`
- **Format:**
  ```json
  {
    "patterns": [
      {
        "id": "pattern-id",
        "title": "Pattern Title",
        "description": "...",
        "category": "error-handling",
        "difficulty": "intermediate",
        "tags": ["tag1", "tag2"],
        "examples": [...],
        "useCases": [...]
      }
    ]
  }
  ```
- **Generated by:** Publishing pipeline
- **Size:** ~150 patterns

### Pattern Source Files
**Published patterns in MDX format**

- **Directory:** `/Users/paul/Projects/Published/Effect-Patterns/content/published/`
- **Format:** MDX files with YAML frontmatter
- **Content:** Pattern documentation, code examples, use cases

---

## Related Documentation

### Search Algorithm Analysis
**Detailed analysis of the search algorithm limitations**

- **File:** `/Users/paul/Projects/Published/Effect-Patterns/SEARCH_ALGORITHM_ANALYSIS.md`
- **Content:**
  - Algorithm breakdown
  - Known issues and test cases
  - Real-world impact analysis
  - Recommended solutions

### Search Implementation Findings
**Comprehensive search implementation overview**

- **File:** `/Users/paul/Projects/Published/Effect-Patterns/SEARCH_IMPLEMENTATION_FINDINGS.md`
- **Content:**
  - All 3 search layers
  - Supermemory API patterns
  - Data flow diagrams
  - Current limitations
  - Enhancement opportunities

---

## Testing Files

### Toolkit Search Tests
- **Location:** `packages/toolkit/src/__tests__/` (if exists)
- **Tests:** Fuzzy matching, filtering, edge cases

### Chat Tool Tests
- **Location:** `app/code-assistant/__tests__/` (if exists)
- **Tests:** Tool integration, AI model interaction

---

## Import Paths & Exports

### From Toolkit Package
```typescript
// Import search functions
import {
  searchPatterns,
  getPatternById,
  toPatternSummary,
  type SearchPatternsParams,
} from "@effect-patterns/toolkit"

// Import from service
import { PatternSearch, PatternSearchLive } from "@effect-patterns/toolkit/services"
```

### From Code Assistant
```typescript
// Chat tools
import {
  searchPatternsTool,
  getPatternByIdTool,
  listPatternCategoriesTool,
} from "@/lib/ai/tools/search-patterns"

// Memory service
import { userMemoryService } from "@/lib/memory"

// Preferences hook
import { useUserPreferences } from "@/lib/hooks/use-user-preferences"
```

---

## Dependency Graph

```
Data Layer (JSON files)
    ↓
packages/toolkit/src/io.ts (loadPatternsFromJson)
    ↓
packages/toolkit/src/search.ts (searchPatterns, fuzzyScore)
    ↓
packages/toolkit/src/services/search.ts (Effect.Service wrapper)
    ↓
app/code-assistant/lib/ai/tools/search-patterns.ts (AI SDK tools)
    ↓
app/code-assistant/lib/chat/engine.ts (Chat orchestration)
    ↓
app/code-assistant/app/(chat)/api/chat/route.ts (Chat endpoint)
    ↓
User Interface / AI Model

PARALLEL:
Supermemory API
    ↓
app/code-assistant/lib/memory.ts (UserMemoryService)
    ↓
app/code-assistant/lib/hooks/use-user-preferences.ts (React hook)
    ↓
app/code-assistant/app/(chat)/api/user/preferences/route.ts (API endpoint)
    ↓
User Preferences & Memory Storage
```

---

## Quick Edit Guide

**Want to improve search?**
1. Fix fuzzy matching: `/Users/paul/Projects/Published/Effect-Patterns/packages/toolkit/src/search.ts` lines 33-63
2. Fix relevance scoring: `/Users/paul/Projects/Published/Effect-Patterns/packages/toolkit/src/search.ts` lines 76-97
3. Test changes: Run `bun test`
4. Rebuild toolkit: `bun run toolkit:build`

**Want to add Supermemory features?**
1. Add method to UserMemoryService: `/Users/paul/Projects/Published/Effect-Patterns/app/code-assistant/lib/memory.ts`
2. Add Supermemory API calls: Use `client.search.memories()` or `client.memories.add()`
3. Add React hook: Update `/Users/paul/Projects/Published/Effect-Patterns/app/code-assistant/lib/hooks/use-user-preferences.ts`
4. Add API endpoint: Create route in `/Users/paul/Projects/Published/Effect-Patterns/app/code-assistant/app/(chat)/api/`

**Want to use search in new places?**
1. Import tool: `import { searchPatternsTool } from "@/lib/ai/tools/search-patterns"`
2. Add to tools array in chat engine
3. Or import function: `import { searchPatterns } from "@effect-patterns/toolkit"`

---

## File Size Reference

| File | Lines | Type |
|------|-------|------|
| search.ts (pure) | 200 | Functions |
| search.ts (service) | 380 | Service |
| memory.ts | 719 | Class |
| search-patterns.ts | 151 | Tools |
| use-user-preferences.ts | 122 | Hook |
| patterns-index.json | ~1500 | Data |

---

**Last Updated:** 2025-11-01
**Documentation Version:** 1.0
