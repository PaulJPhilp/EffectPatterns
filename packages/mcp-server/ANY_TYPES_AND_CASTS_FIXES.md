# Any Types and Double Casts - Fixes Summary

## Overview

Comprehensive review and fixes for `any` types and double casts (`as unknown as X`) in the mcp-server package.

**Review Date:** 2026-01-21  
**Issues Fixed:** 30+ instances  
**Files Modified:** 4 files  
**Tests:** All passing ✅

---

## Issues Found and Fixed

### 1. Double Cast in errorHandler.ts ✅

**File:** `src/server/errorHandler.ts`

**Before:**
```typescript
function hasTag(error: unknown): error is { _tag: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    typeof (error as any)._tag === "string"  // ❌ Double cast: unknown → any → _tag
  );
}
```

**After:**
```typescript
function hasTag(error: unknown): error is { _tag: string } {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  
  // Type-safe check for _tag property
  const errorObj = error as Record<string, unknown>;  // ✅ Single cast to Record
  return "_tag" in errorObj && typeof errorObj._tag === "string";
}
```

**Benefits:**
- ✅ Eliminated double cast pattern
- ✅ Type-safe property access
- ✅ Clearer code structure
- ✅ Better type narrowing

---

### 2. Unnecessary Type Assertion in validation/api.ts ✅

**File:** `src/services/validation/api.ts`

**Before:**
```typescript
const result = yield* Schema.decodeUnknown(schema)(input).pipe(
  Effect.mapError((parseError) => {
    return new ValidationError({
      field: context,
      message: `Schema validation failed: ${parseError.message}`,
      value: input,
    });
  })
) as Effect.Effect<A, ValidationError>;  // ❌ Unnecessary assertion
```

**After:**
```typescript
const result = yield* Schema.decodeUnknown(schema)(input).pipe(
  Effect.mapError((parseError) => {
    return new ValidationError({
      field: context,
      message: `Schema validation failed: ${parseError.message}`,
      value: input,
    });
  })
);  // ✅ TypeScript infers the correct type
```

**Benefits:**
- ✅ Removed unnecessary type assertion
- ✅ TypeScript correctly infers the type
- ✅ Better type safety (no bypassing type checking)

---

### 3. Record<string, any> → Record<string, unknown> ✅

**File:** `src/schemas/structured-output.ts`

**Before:**
```typescript
export interface StructuredContent {
    type: "structured";
    mimeType: string;
    data: Record<string, any>;  // ❌ any allows anything
    metadata?: Record<string, any>;
}

export interface ToolAnnotation {
    details?: Record<string, any>;  // ❌ any allows anything
}
```

**After:**
```typescript
export interface StructuredContent {
    type: "structured";
    mimeType: string;
    data: Record<string, unknown>;  // ✅ unknown requires type checking
    metadata?: Record<string, unknown>;
}

export interface ToolAnnotation {
    details?: Record<string, unknown>;  // ✅ unknown requires type checking
}
```

**Files Updated:**
- All 19 instances of `Record<string, any>` replaced with `Record<string, unknown>`
- All function parameters updated
- All builder methods updated

**Benefits:**
- ✅ Type-safe: `unknown` requires explicit type checking
- ✅ Prevents accidental unsafe access
- ✅ Better for refactoring
- ✅ Clearer intent: "we don't know the type" vs "anything goes"

---

### 4. Function Parameters with `any` → Proper Types ✅

**File:** `src/schemas/structured-output.ts`

**Before:**
```typescript
export class PatternContentBuilder {
    static patternSummary(pattern: any): StructuredContent {  // ❌ any
        // ...
    }

    static patternDetails(pattern: any): StructuredContent {  // ❌ any
        // ...
    }

    static searchResults(
        results: any[],  // ❌ any[]
        query: string,
        total?: number,
    ): StructuredContent {
        // ...
    }

    static analysisResults(analysis: any): StructuredContent {  // ❌ any
        // ...
    }
}
```

**After:**
```typescript
/**
 * Pattern data structure for content builders
 */
interface PatternData {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    tags?: readonly string[];
    codeSnippet?: string;
    usageNotes?: string;
    bestPractices?: string;
}

/**
 * Analysis issue structure
 */
interface AnalysisIssue {
    title: string;
    severity: string;
    line: number;
    type: string;
    description: string;
    suggestion: string;
}

/**
 * Analysis results structure
 */
interface AnalysisData {
    filename: string;
    analysisType: string;
    issues?: readonly AnalysisIssue[];
    summary?: string;
    recommendations?: readonly string[];
}

export class PatternContentBuilder {
    static patternSummary(pattern: PatternData): StructuredContent {  // ✅ Typed
        // ...
    }

    static patternDetails(pattern: PatternData): StructuredContent {  // ✅ Typed
        // ...
    }

    static searchResults(
        results: readonly PatternData[],  // ✅ Typed
        query: string,
        total?: number,
    ): StructuredContent {
        // ...
    }

    static analysisResults(analysis: AnalysisData): StructuredContent {  // ✅ Typed
        // ...
    }
}
```

**Benefits:**
- ✅ Type-safe function parameters
- ✅ Better autocomplete
- ✅ Compile-time error checking
- ✅ Self-documenting code

---

### 5. Tool Implementation Parameters ✅

**File:** `src/tools/tool-implementations.ts`

**Before:**
```typescript
server.tool(
    "search_patterns",
    "Search Effect-TS patterns...",
    ToolSchemas.searchPatterns.shape as any,  // ❌ as any (SDK compatibility)
    async (args: any): Promise<CallToolResult> => {  // ❌ any parameter
        // ...
    }
);
```

**After:**
```typescript
import {
  ToolSchemas,
  type SearchPatternsArgs,
  type GetPatternArgs,
  type AnalyzeCodeArgs,
  type ReviewCodeArgs,
} from "../schemas/tool-schemas.js";

// Search Patterns Tool
// Note: `as any` is required for MCP SDK compatibility - Zod schemas need conversion
server.tool(
    "search_patterns",
    "Search Effect-TS patterns...",
    ToolSchemas.searchPatterns.shape as any,  // ⚠️ Required for SDK
    async (args: SearchPatternsArgs): Promise<CallToolResult> => {  // ✅ Typed
        // ...
    }
);
```

**Files Updated:**
- `tool-implementations.ts` - 5 tool handlers
- `mcp-production-client.ts` - 4 tool handlers

**Benefits:**
- ✅ Type-safe handler parameters
- ✅ Better autocomplete in handlers
- ✅ Compile-time validation
- ✅ Documented why `as any` is necessary (SDK compatibility)

**Note:** The `as any` for `ToolSchemas.*.shape` is required because:
- MCP SDK expects a specific schema format
- Zod schemas need conversion to MCP format
- This is a known limitation of the SDK integration

---

### 6. Production Client Parameters ✅

**File:** `src/mcp-production-client.ts`

**Before:**
```typescript
server.registerTool(
    "analyze_code",
    {
        description: "...",
        inputSchema: undefined as any,  // ❌ as any
    },
    async (args: any): Promise<ToolResult> => {  // ❌ any parameter
        // ...
    }
);
```

**After:**
```typescript
// Note: `as any` is required for MCP SDK compatibility - inputSchema format differs
server.registerTool(
    "analyze_code",
    {
        description: "...",
        inputSchema: undefined as any,  // ⚠️ Required for SDK
    },
    async (args: { code: string; filename?: string; analysisType?: string }): Promise<ToolResult> => {  // ✅ Typed
        // ...
    }
);
```

**Benefits:**
- ✅ Type-safe handler parameters
- ✅ Documented SDK compatibility requirement
- ✅ Better developer experience

---

## Summary of Changes

### Files Modified

1. **src/server/errorHandler.ts**
   - Fixed double cast: `(error as any)._tag` → `error as Record<string, unknown>`
   - Improved type narrowing

2. **src/services/validation/api.ts**
   - Removed unnecessary type assertion
   - Let TypeScript infer the type

3. **src/schemas/structured-output.ts**
   - Replaced 19 instances of `Record<string, any>` with `Record<string, unknown>`
   - Added proper interfaces: `PatternData`, `AnalysisIssue`, `AnalysisData`
   - Typed all function parameters

4. **src/tools/tool-implementations.ts**
   - Typed all handler parameters using schema types
   - Added documentation for `as any` casts (SDK compatibility)

5. **src/mcp-production-client.ts**
   - Typed all handler parameters
   - Added documentation for `as any` casts (SDK compatibility)

### Statistics

- **Double Casts Fixed:** 1
- **Unnecessary Assertions Removed:** 1
- **`Record<string, any>` → `Record<string, unknown>`:** 19 instances
- **Function Parameters Typed:** 9 functions
- **Interfaces Created:** 3 new interfaces
- **Documentation Added:** 5 comments explaining SDK compatibility

---

## Test Results

All tests passing:
```
✓ Server Tests: 60/60 tests
✓ Validation Service: 16/16 tests
✓ Error Handler: 6/6 tests

Total: 82/82 tests passing ✅
```

---

## Remaining `any` Types (Acceptable)

### SDK Compatibility (Documented)

These `as any` casts are necessary for MCP SDK compatibility and are documented:

1. **Tool Schema Shapes** (`tool-implementations.ts`, `mcp-production-client.ts`)
   - `ToolSchemas.*.shape as any` - Required for MCP SDK format conversion
   - Documented with comments explaining why

2. **Input Schema** (`mcp-production-client.ts`)
   - `inputSchema: undefined as any` - Required for SDK compatibility
   - Documented with comments

**Rationale:**
- These are at the boundary with external SDK
- Type conversion is required between Zod and MCP formats
- Documentation explains why they're necessary
- Handler parameters are properly typed

### Test Files

`any` types in test files are acceptable for:
- Mocking and test data
- Flexible test scenarios
- Test utilities

---

## Best Practices Established

### ✅ Do's

1. **Use `unknown` instead of `any`**
   - `Record<string, unknown>` for flexible JSON data
   - Requires explicit type checking before use
   - Safer than `any`

2. **Type function parameters**
   - Always type function parameters
   - Use interfaces for complex types
   - Export types for reuse

3. **Avoid double casts**
   - Use single cast to `Record<string, unknown>`
   - Then access properties with type checking

4. **Remove unnecessary assertions**
   - Let TypeScript infer types when possible
   - Only assert when type system can't infer

5. **Document necessary `as any`**
   - Explain why it's needed (SDK compatibility, etc.)
   - Consider alternatives if possible

### ❌ Don'ts

1. **Don't use `any` for function parameters**
   - Always type parameters
   - Use `unknown` if type is truly unknown

2. **Don't use double casts**
   - `(value as any).property` is unsafe
   - Use single cast to appropriate type

3. **Don't use `Record<string, any>`**
   - Use `Record<string, unknown>` instead
   - Requires type checking before use

4. **Don't assert unnecessarily**
   - Let TypeScript infer types
   - Only assert when absolutely necessary

---

## Impact Summary

### Type Safety
- **Eliminated:** 1 double cast pattern
- **Removed:** 1 unnecessary type assertion
- **Replaced:** 19 `any` types with `unknown`
- **Typed:** 9 function parameters

### Code Quality
- **Interfaces Created:** 3 new interfaces for better type safety
- **Documentation:** 5 comments explaining SDK compatibility
- **Clarity:** Clearer intent with proper types

### Developer Experience
- **Better Autocomplete:** Typed parameters provide better IDE support
- **Compile-Time Safety:** Type errors caught at compile time
- **Self-Documenting:** Types document expected structure

---

## Migration Guide

### For Record Types

```typescript
// Before
interface MyType {
    data: Record<string, any>;
}

// After
interface MyType {
    data: Record<string, unknown>;
}

// Usage (requires type checking)
function processData(data: Record<string, unknown>) {
    if (typeof data.value === "string") {
        // TypeScript knows data.value is string here
        console.log(data.value.toUpperCase());
    }
}
```

### For Function Parameters

```typescript
// Before
function processPattern(pattern: any) {
    // ...
}

// After
interface PatternData {
    id: string;
    title: string;
    // ...
}

function processPattern(pattern: PatternData) {
    // TypeScript knows pattern structure
    console.log(pattern.id, pattern.title);
}
```

### For Type Narrowing

```typescript
// Before (double cast)
function hasTag(error: unknown): error is { _tag: string } {
    return typeof (error as any)._tag === "string";
}

// After (single cast with type checking)
function hasTag(error: unknown): error is { _tag: string } {
    if (typeof error !== "object" || error === null) {
        return false;
    }
    const errorObj = error as Record<string, unknown>;
    return "_tag" in errorObj && typeof errorObj._tag === "string";
}
```

---

## Conclusion

All `any` types and double casts have been addressed:

- ✅ **Double casts eliminated** - Type-safe narrowing
- ✅ **Unnecessary assertions removed** - Let TypeScript infer
- ✅ **`any` replaced with `unknown`** - 19 instances
- ✅ **Function parameters typed** - 9 functions
- ✅ **SDK compatibility documented** - Clear explanations

The codebase now has significantly better type safety while maintaining compatibility with external SDKs.

---

**Date:** 2026-01-21  
**Status:** ✅ Complete - All tests passing  
**Files Modified:** 5 files  
**Type Safety Improvements:** 30+ instances fixed
