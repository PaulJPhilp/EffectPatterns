# Severity Signaling in Markdown - Rich Content Improvements

## Overview

Enhanced the MCP 2.0 rich content blocks with standardized Markdown formatting for severity levels, making findings and violations immediately scannable in Cursor IDE.

## Problem Statement

Previously, violation and finding blocks were difficult to scan quickly:
- No clear visual hierarchy for different severity levels
- Users had to read entire blocks to understand importance
- Mixed formatting styles across different content types
- Hard to prioritize which issues to fix first

## Solution Implemented

Introduced standardized severity labels with Markdown headers and blockquotes:

```markdown
[🔴 HIGH SEVERITY] - Critical architectural flaws
[🟡 ADVISORY]      - Important improvements
[🔵 INFO]          - Informational notes
```

## Key Improvements

### 1. Scannable Headers

**Before:**
```markdown
🔴 high **Effect.fail should use TaggedError**
```

**After:**
```markdown
## [🔴 HIGH SEVERITY] Effect.fail should use TaggedError
```

**Benefits:**
- H2/H3 headers create visual breaks in the IDE
- Color-coded emoji immediately signals importance
- Semantic HTML structure improves accessibility

### 2. Blockquoted Descriptions

**Before:**
```markdown
Effect.fail without a TaggedError is deprecated in v4.
```

**After:**
```markdown
> **Issue:** Effect.fail without a TaggedError is deprecated in v4.
```

**Benefits:**
- Blockquotes visually separate content from code
- Creates indented emphasis in most renderers
- Improves visual hierarchy
- Better distinction between content types

### 3. Structured Sections

**Before:**
```markdown
**Example of violation:**
[code block]
**Remediation:**
[remediation text]
```

**After:**
```markdown
### Problematic Pattern
[code block]

### How to Fix
> [remediation text]
```

**Benefits:**
- Clear subsections with headers
- Consistent formatting across all violations
- Easy navigation within long findings lists

## API Functions

### `createSeverityBlock(severity, title, description, relatedCode?)`

Creates a single scannable finding block:

```typescript
createSeverityBlock(
  "high",
  "Missing Error Types",
  "All Effect.fail calls must use typed errors via Data.TaggedError",
  `
    // ❌ Don't do this
    Effect.fail(new Error("Something went wrong"))
    
    // ✅ Do this
    Effect.fail(new UserError({ id: 123 }))
  `
)
```

### `createFindingsSummary(findings)`

Generates a findings summary grouped by severity:

```typescript
createFindingsSummary([
  {
    severity: "high",
    title: "Untyped Errors",
    description: "Error types must be explicit",
    code: "Effect.fail(new Error(...))",
  },
  {
    severity: "medium",
    title: "Missing Documentation",
    description: "Service requires JSDoc comments",
  },
  {
    severity: "low",
    title: "Code Style",
    description: "Consider using const instead of let",
  },
])
```

Produces:

```markdown
## Findings Summary (3 total)

### 🔴 High Severity (1)
#### [🔴 HIGH SEVERITY] Untyped Errors
> **Issue:** Error types must be explicit

[code block]

### 🟡 Advisory (1)
#### [🟡 ADVISORY] Missing Documentation
> **Issue:** Service requires JSDoc comments

### 🔵 Info (1)
#### [🔵 INFO] Code Style
> **Issue:** Consider using const instead of let
```

### `buildViolationContent(ruleName, severity, message, remediation, example?)`

Enhanced violation blocks with severity signaling:

```typescript
buildViolationContent(
  "async-await-in-effect",
  "🔴 high",
  "Using async/await in Effect context",
  "Replace with Effect combinators like Effect.promise or Effect.tryPromise",
  `
    // ❌ Don't
    async function getData() {
      const data = await fetchUser();
      return data;
    }
    
    // ✅ Do
    const getData = () => Effect.tryPromise({
      try: () => fetchUser(),
      catch: (error) => new FetchError({ cause: error })
    })
  `
)
```

## Rendering Examples

### High Severity Finding

Renders as:

```
## [🔴 HIGH SEVERITY] Untyped Error Handling

> **Issue:** Effect.fail() requires typed errors via Data.TaggedError 
> for proper error tracking and type safety.

### Problematic Pattern

```typescript
export const getUser = (id: number) =>
  Effect.fail(new Error('User not found'))  // ❌ Untyped
```

### How to Fix

> Define a TaggedError type for each error scenario, then use it 
> consistently across your service.
```

### Medium Severity Finding

Renders as:

```
### [🟡 ADVISORY] Missing Error Boundaries

> **Issue:** This service lacks proper error handling at its boundaries.

### How to Fix

> Wrap async operations with Effect.tryPromise and handle potential errors 
> using Effect.catchTag for specific error types.
```

### Low Severity Finding

Renders as:

```
#### [🔵 INFO] Code Style Note

> Consider using const instead of let for better immutability semantics.
```

## Benefits for Users

### 1. Immediate Scannability
- Users see severity at a glance
- Color-coded emoji provides instant visual feedback
- No need to read entire block to understand importance

### 2. Better Prioritization
- High severity findings appear first
- Clear visual separation between priority levels
- Easier to focus on critical issues

### 3. Improved Readability
- Markdown headers create natural breaks
- Blockquotes emphasize important information
- Consistent structure across all findings

### 4. IDE Integration
- Cursor IDE renders headers with proper styling
- Blockquotes appear indented and emphasized
- Emoji support for visual distinction

## Usage in Code Review Tools

Perfect for:
- Code analysis tool outputs
- Pattern violation reports
- Migration guidance documents
- Architecture review findings
- Anti-pattern detection results

## Backward Compatibility

The new functions are additions to the existing API:
- Existing functions remain unchanged
- New functions follow the same conventions
- Easy gradual migration path
- No breaking changes

## Implementation Details

### Priority Mapping

Severity levels map to MCP annotation priorities:

```typescript
severity: "high"   → priority: 1 (highest)
severity: "medium" → priority: 2 (medium)
severity: "low"    → priority: 3 (lowest)
```

### Audience Tagging

All severity blocks tagged with:
```typescript
audience: ["user"]  // Visible to end users
```

### Markdown Structure

Follows semantic HTML conventions:
- H1: Document title
- H2: Major sections (Before/After, Severity groups)
- H3: Subsections (Issues to Address, Key Improvements)
- Blockquotes: Emphasis and recommendations
- Code fences: Code examples

## Testing

All new functions maintain:
- Type safety with TypeScript
- Proper Markdown rendering
- Consistent annotation structure
- MCP 2.0 compliance

See `mcp-content-builders.test.ts` for examples.

## Future Enhancements

Potential additions:
- Custom color schemes per severity
- Expandable/collapsible sections
- Interactive severity filters
- Export to different formats (HTML, PDF)
- Integration with IDE quick fixes

## References

- [MCP 2.0 Specification](https://modelcontextprotocol.io/docs/spec/2.0/protocol)
- [Markdown Guide](https://www.markdownguide.org)
- [Semantic HTML](https://developer.mozilla.org/en-US/docs/Glossary/Semantics)
