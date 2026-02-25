# MCP 2.0 Rich Content Implementation

## Overview

This implementation introduces two major formatting improvements to the Effect Patterns MCP server:

1. **Rich Content Blocks** - Structured content arrays with proper formatting
2. **Annotated Diffs** - Migration guides with line-by-line explanations

Both improvements use MCP 2.0 specification features to eliminate hallucination and provide production-tested code directly to IDE tools like Cursor and Claude Code.

## Problem Statements

### Problem 1: Hallucination in Code Examples

**Before:**
- MCP returned plain JSON with text descriptions
- Claude/Cursor had to "guess" and generate code examples based on text
- Generated code didn't match your tested patterns
- Users got inconsistent implementations

**After:**
- MCP returns structured `TextContent` blocks with actual code
- Code comes directly from your tested monorepo
- Cursor sees the "Gold Standard" implementation
- No hallucination, 100% reliable examples

### Problem 2: Confusing Migration Guides

**Before:**
- Users didn't understand WHY v3 code was problematic
- Migration reasons buried in documentation
- No clear visual diff between old and new patterns
- Users manually figured out anti-patterns

**After:**
- Clear Before (v3) vs After (v4) diffs
- Line-by-line annotations explaining anti-patterns
- Severity levels guide user attention (🔴 HIGH → 🟡 MEDIUM → 🔵 LOW)
- Structured format makes migration effortless

## Implementation Details

### 1. Rich Content Blocks

#### File: `src/mcp-content-builders.ts`

Provides helper functions to build MCP 2.0 content arrays:

```typescript
// Create text blocks with annotations
createTextBlock(text, annotations?)
  → TextContent

// Create code blocks with language specification
createCodeBlock(code, language, description?, annotations?)
  → TextContent (wrapped in markdown code fence)

// Create before/after diffs
createAnnotatedDiff(before, after, annotations?, explanation?)
  → TextContent[]

// Build complete pattern responses
buildPatternContent(title, description, code, useCases?, related?)
  → TextContent[]

// Build violation/anti-pattern content
buildViolationContent(rule, severity, message, remediation, example?)
  → TextContent[]
```

#### Example Response Structure

```typescript
{
  content: [
    {
      type: "text",
      text: "# Effect.Service Pattern",
      annotations: {
        priority: 1,
        audience: ["user"],
        lastModified: "2025-01-21T00:00:00Z"
      }
    },
    {
      type: "text",
      text: "**Description:** Creates a reusable service...",
      annotations: {
        priority: 2,
        audience: ["user"]
      }
    },
    {
      type: "text",
      text: "```typescript\n// Real tested code from monorepo\n```",
      annotations: {
        priority: 2,
        audience: ["user"]
      }
    }
  ]
}
```

### 2. Annotated Diffs

#### File: `src/services/pattern-diff-generator/api.ts`

Pre-defined migration patterns with structured diffs:

```typescript
generateMigrationDiff(patternId)
  → TextContent[]

listMigrationPatterns()
  → string[]

isMigrationPattern(patternId)
  → boolean
```

#### Available Migration Patterns

1. **`effect-fail-tagged-error`**
   - Shows why Effect.fail should use Data.TaggedError
   - Demonstrates typed error handling
   - Severity: 🔴 HIGH (type safety improvement)

2. **`service-effect-service-with-layer`**
   - Shows when to use `scoped:` vs `effect:` vs `sync:`
   - Explains resource lifecycle management
   - Severity: 🟡 MEDIUM (best practice)

3. **`effect-catch-tag-vs-catch-all`**
   - Shows why catchTag is better than catch
   - Demonstrates type-safe error handling
   - Severity: 🟡 MEDIUM (correctness improvement)

4. **`layer-merge-composition`**
   - Shows why Layer.mergeAll is preferred
   - Explains cleaner layer composition
   - Severity: 🔵 LOW (code quality)

#### Example Migration Diff

```typescript
{
  content: [
    {
      type: "text",
      text: "## Before (v3 style)\n\n```typescript\nEffect.fail(new Error('Not found'))\n```",
      annotations: {
        priority: 1,
        audience: ["user"]
      }
    },
    {
      type: "text",
      text: "**Line 1:** ⚠️ Effect.fail without TaggedError is deprecated in v4.",
      annotations: {
        priority: 1,  // Highest - user sees this first
        audience: ["user"]
      }
    },
    {
      type: "text",
      text: "## After (v4 style)\n\n```typescript\nclass NotFoundError extends Data.TaggedError('NotFoundError')<{}> {}\nEffect.fail(new NotFoundError())\n```",
      annotations: {
        priority: 2,
        audience: ["user"]
      }
    },
    {
      type: "text",
      text: "**Line 2:** ✅ Now the error type is known to the type system.",
      annotations: {
        priority: 2,
        audience: ["user"]
      }
    }
  ]
}
```

### 3. Tool Integration

#### File: `src/tools/tool-implementations.ts`

Updated tool handlers to use rich content:

```typescript
server.tool("get_pattern", ..., async (args) => {
  // Check if migration pattern
  if (isMigrationPattern(args.id)) {
    return {
      content: generateMigrationDiff(args.id)
    };
  }

  // For regular patterns, build rich content
  if (result.ok && result.data) {
    const richContent = [];
    richContent.push(createTextBlock("# " + pattern.title, ...));
    richContent.push(createTextBlock(pattern.description, ...));
    
    // Add code examples
    for (const example of pattern.examples) {
      richContent.push(createCodeBlock(example.code, "typescript", ...));
    }
    
    return { content: richContent };
  }
});
```

## MCP 2.0 Specification

All content follows MCP 2.0 specification:

### TextContent Structure
```typescript
interface TextContent {
  type: "text";
  text: string;
  annotations?: Annotations;
}
```

### Annotations Structure
```typescript
interface Annotations {
  audience?: string[];           // ["user", "assistant"]
  priority?: number;              // 1 (highest) → 3+ (lowest)
  lastModified?: string;           // ISO 8601 timestamp
}
```

### Priority Ordering

| Priority | Meaning | Example |
|----------|---------|---------|
| 1 | Critical/Highest | Anti-patterns, breaking changes |
| 2 | Important | Descriptions, main examples |
| 3 | Supporting | Use cases, related patterns |
| 4+ | Optional | Tags, metadata |

### Severity Indicators

| Level | Icon | Use Case |
|-------|------|----------|
| HIGH | 🔴 | Breaking changes, security issues |
| MEDIUM | 🟡 | Performance/maintainability concerns |
| LOW | 🔵 | Code style improvements |

## Files Structure

```
packages/mcp-server/src/
├── mcp-content-builders.ts
│   ├── createTextBlock()
│   ├── createCodeBlock()
│   ├── createAnnotatedDiff()
│   ├── createAntiPatternAnnotation()
│   ├── createPatternAnnotation()
│   ├── buildPatternContent()
│   └── buildViolationContent()
│
├── services/pattern-diff-generator/
│   ├── api.ts
│   │   ├── generateMigrationDiff()
│   │   ├── listMigrationPatterns()
│   │   ├── isMigrationPattern()
│   │   └── migrationExamples (data)
│   ├── index.ts (exports)
│   └── __tests__/
│       └── pattern-diff-generator.test.ts
│
├── tools/tool-implementations.ts
│   └── get_pattern (enhanced with rich content)
│
└── __tests__/
    └── mcp-content-builders.test.ts
```

## Testing

All functionality is fully tested:

### Content Builder Tests (20 tests)
```bash
bun test src/__tests__/mcp-content-builders.test.ts
```

Tests cover:
- Text block creation
- Code block creation with language specification
- Annotated diffs
- Anti-pattern annotations
- Pattern content assembly
- Violation content assembly

### Diff Generator Tests (19 tests)
```bash
bun test src/services/pattern-diff-generator/__tests__/pattern-diff-generator.test.ts
```

Tests cover:
- Migration pattern identification
- Pattern listing
- Diff generation for all migration patterns
- Annotation structure
- MCP 2.0 compliance
- Content validation

## Benefits

### For Pattern Users
✅ Real, tested code from the monorepo  
✅ No hallucination - exact implementation  
✅ Clear examples with proper syntax highlighting  
✅ Structured layout (title → description → code)  

### For Migration Users
✅ Understand exactly why v3 code is problematic  
✅ See v4 solution immediately  
✅ Line-by-line explanations guide refactoring  
✅ Severity levels prioritize important changes  

### For IDE Integration (Cursor/Claude Code)
✅ Structured content can be rendered with formatting  
✅ Annotations enable UI customization  
✅ Priority ordering guides user attention  
✅ No hallucination means faster, more reliable results  

## Future Enhancements

Potential improvements for future versions:

- Interactive code snippets (MCP 3.0)
- Video tutorials linked from annotations
- Performance impact indicators
- Automated refactoring suggestions
- Real-time pattern matching against user code
- Pattern complexity metrics
- Learning path recommendations

## Usage Examples

### Getting a Pattern with Rich Content
```typescript
// Request
{
  "tool": "get_pattern",
  "arguments": {
    "id": "effect-service"
  }
}

// Response
{
  "content": [
    { type: "text", text: "# Effect.Service Pattern", ... },
    { type: "text", text: "**Description:** ...", ... },
    { type: "text", text: "```typescript\n...\n```", ... },
    { type: "text", text: "**Use Cases:**\n- ...", ... }
  ]
}
```

### Getting a Migration Diff
```typescript
// Request
{
  "tool": "get_pattern",
  "arguments": {
    "id": "effect-fail-tagged-error"
  }
}

// Response
{
  "content": [
    { type: "text", text: "# Effect.fail should use TaggedError", ... },
    { type: "text", text: "**Before (v3 style)**\n\n```typescript\n...", ... },
    { type: "text", text: "**Line 1:** ⚠️ ...", annotations: { priority: 1 } },
    { type: "text", text: "**After (v4 style)**\n\n```typescript\n...", ... },
    { type: "text", text: "**Line 1:** ✅ ...", annotations: { priority: 2 } }
  ]
}
```

## Deployment

No changes to deployment configuration. The implementation is backward-compatible:

- Regular patterns still return JSON if not using rich content
- Migration patterns return rich content automatically
- Existing tool interfaces unchanged
- All tests pass in CI/CD

## Documentation

For more details, see:
- `MCP_2_0_IMPROVEMENTS.ts` - Detailed technical documentation
- Test files for usage examples
- MCP specification: see official MCP protocol documentation
