# MCP Advanced Presentation Features

This document describes the advanced MCP presentation features implemented in the Effect Patterns MCP server.

## Overview

The MCP server implements three key presentation upgrades:

1. **Structured Outputs with Zod-Validated Schemas** - Machine-readable payloads alongside human-readable markdown
2. **MIME-Typed Content Blocks** - Explicit content type declarations for better rendering
3. **NeedsInput Payloads (Elicitation-like)** - Structured prompts for missing or ambiguous input

## Important: Implementation Status (Reality of the Transport)

This MCP server provides **human-readable Markdown** and **machine-readable structured JSON**. Because some MCP transports/clients may drop unknown top-level fields and/or strip `mimeType`, the contract is defined on MCP-supported surfaces.

### What is Canonical vs Best-Effort

- **Canonical structured contract (reliable):**
  - The **JSON content block** returned when `format="json"` or `format="both"`.
  - Clients should parse this JSON block and validate it against the documented schema (Zod).

- **Best-effort convenience (not reliable):**
  - The top-level `structuredContent` field (may be dropped by some clients/transports).
  - Treat this as an optimization only; do not rely on it for correctness.

- **MIME types:**
  - The server sets `mimeType` (e.g., `text/markdown`, `application/json`) when supported.
  - Some MCP SDK/client layers may strip `mimeType`; clients should not depend on it.

### Format Gating (User UX vs Structured Access)

The `format` parameter controls whether a JSON content block is emitted:

| format | Markdown blocks | JSON content block | structuredContent |
|---|---:|---:|---:|
| `"markdown"` (default) | ✅ | ❌ | ✅ best-effort |
| `"json"` | ❌ | ✅ | ✅ best-effort |
| `"both"` | ✅ | ✅ | ✅ best-effort |

**Default is `"markdown"`** to avoid polluting IDE UI with JSON blobs.
If you need reliable structured data, request `format="json"` or `format="both"`.

**See**: `docs/TOOL_REGISTRATION.md` for detailed schema registration and validation strategy.

## 1. Structured Outputs

### Purpose

Tools return **both** human-readable markdown presentation and machine-readable structured data. This enables:
- Programmatic access to pattern data without parsing markdown
- Type-safe integration with client applications
- Stable API contracts via Zod schema validation

### Actual Tool Result Shape

#### `search_patterns` - Normal Response (format="markdown" default)

```typescript
{
  content: [
    {
      type: "text",
      text: "# Search Results for \"error\"\nFound **5** patterns...",
      mimeType: "text/markdown"
    },
    // ... more markdown blocks
    // NO JSON content block when format="markdown" (default)
  ],
  structuredContent: {
    // Best-effort/internal-only (may be dropped by MCP SDK)
    // For reliable structured access, use format="json" or format="both" and parse JSON block
    kind: "patternSearchResults:v1",  // Discriminator
    query: {
      q: "error",
      format: "markdown",
      limit: 5
      // category, difficulty omitted (not provided in request)
    },
    metadata: {
      totalCount: 5,
      categories: { "error-handling": 3, "validation": 2 },
      difficulties: { "beginner": 2, "intermediate": 3 },
      renderedCards: 3,
      contractMarkers: {
        index: 1,
        cards: 3,
        version: "v1"
      }
    },
    patterns: [
      // ALL matching patterns (not just rendered cards)
      {
        id: "error-handling-match",
        title: "Error Handling with Match",
        category: "error-handling",
        difficulty: "beginner",
        description: "Use Effect.match to handle errors...",
        tags: ["Effect.match", "error-handling"]
        // examples, useCases, relatedPatterns omitted in search results (use get_pattern for full details)
      },
      // ... all other matches
    ]
    // provenance omitted (only included if includeProvenancePanel=true)
  }
}
```

#### `search_patterns` - Format "json"

```typescript
{
  content: [
    {
      type: "text",
      text: "{\n  \"kind\": \"patternSearchResults:v1\",\n  \"query\": {...},\n  ...\n}",
      mimeType: "application/json"
    }
  ],
  structuredContent: {
    // Best-effort/internal-only (may be dropped by MCP SDK)
    // Canonical structured content is in the JSON content block above
    kind: "patternSearchResults:v1",
    query: { q: "concurrency", format: "json" },
    metadata: {...},
    patterns: [...]
  }
}
```

#### `search_patterns` - Format "both"

```typescript
{
  content: [
    // Markdown blocks first
    { type: "text", text: "# Search Results...", mimeType: "text/markdown" },
    // ... more markdown blocks
    // Then JSON block
    { type: "text", text: "{...}", mimeType: "application/json" }
  ],
  structuredContent: {
    // Best-effort/internal-only (may be dropped by MCP SDK)
    // Canonical structured content is in the JSON content block above
    kind: "patternSearchResults:v1",
    query: { q: "service", format: "both" },
    metadata: {...},
    patterns: [...]
  }
}
```

**Format gating**:
- `format="markdown"` (default): Returns markdown blocks only (NO JSON content block)
- `format="json"`: Returns JSON content block only
- `format="both"`: Returns markdown blocks + JSON content block

**Structured content access**:
- **Canonical contract**: JSON content block (only when `format="json"` or `format="both"`)
- **`structuredContent` field**: Best-effort convenience only (may be absent, may be dropped by MCP SDK)
- **Client guidance**: Some transports/clients may drop unknown top-level fields. Therefore clients must treat the JSON content block as canonical when they need structured data.
- **Elicitation in markdown mode**: Default markdown mode is UX-first; structured elicitation may be unavailable depending on client. For reliable structured elicitation, call with `format="json"` or `format="both"`.

#### `search_patterns` - Elicitation (Empty Query, format="markdown" default)

```typescript
{
  content: [
    {
      type: "text",
      text: "## Search Query Needed\n\nWhat pattern are you looking for? Please provide a search query.",
      mimeType: "text/markdown"
    }
    // NO JSON content block in markdown mode (default)
  ],
  structuredContent: {
    // Best-effort/internal-only (may be dropped by MCP SDK)
    // For reliable structured elicitation, use format="json" or format="both"
    kind: "needsInput:v1",  // Discriminator
    type: "elicitation",
    message: "What pattern are you looking for? Please provide a search query.",
    needsInput: {
      fields: ["q"],
      reason: "Search query is required to find relevant patterns",
      suggestions: {
        q: [
          "error handling",
          "service pattern",
          "concurrency",
          "resource management"
        ]
      }
    }
  }
}
```

**Note**: In default `format="markdown"` mode, elicitation responses include only markdown content. The `structuredContent` field may be dropped by MCP SDK. For programmatic clients that need reliable structured elicitation, call with `format="json"` or `format="both"` to receive a JSON content block.

#### `search_patterns` - Elicitation (Too Broad, format="markdown" default)

**Trigger**: >20 results without category/difficulty filters (threshold: `SEARCH_TOO_BROAD_THRESHOLD = 20`)

```typescript
{
  content: [
    {
      type: "text",
      text: "## Narrow Your Search\n\nFound 50 patterns. Would you like to narrow your search...",
      mimeType: "text/markdown"
    }
    // NO JSON content block in markdown mode (default)
  ],
  structuredContent: {
    // Best-effort/internal-only (may be dropped by MCP SDK)
    // For reliable structured elicitation, use format="json" or format="both"
    kind: "needsInput:v1",
    type: "elicitation",
    message: "Found 50 patterns. Would you like to narrow your search by category or difficulty?",
    needsInput: {
      fields: ["category", "difficulty"],
      reason: "Too many results (50). Narrowing filters will help find the right pattern.",
      suggestions: {
        category: ["error-handling", "service", "validation"],
        difficulty: ["beginner", "intermediate", "advanced"]
      }
    },
    options: [
      { label: "error-handling", value: "error-handling", description: "Filter by error-handling category", field: "category" },
      { label: "beginner", value: "beginner", description: "Filter by beginner difficulty", field: "difficulty" }
    ]
  }
}
```

**Note**: Same format-gating applies - use `format="json"` or `format="both"` for reliable structured elicitation.

#### `get_pattern` - Normal Response

```typescript
{
  content: [
    {
      type: "text",
      text: "# Effect.Service Pattern\n\n<!-- kind:pattern-card:v1 -->\n...",
      mimeType: "text/markdown"
    },
    // ... more markdown blocks
  ],
  structuredContent: {
    kind: "patternDetails:v1",  // Discriminator
    id: "effect-service",
    title: "Effect.Service Pattern",
    category: "service",
    difficulty: "intermediate",
    summary: "Create reusable services using Effect.Service...",
    description: "Full description of the pattern...",
    tags: ["Effect.Service", "dependency-injection"],
    useGuidance: {
      useWhen: "When you need to create reusable, testable services",
      avoidWhen: "For simple one-off operations"
    },
    sections: [
      {
        title: "Description",
        content: "Full description...",
        type: "description"
      },
      {
        title: "Example",
        content: "export class MyService...",
        type: "example"
      }
    ],
    examples: [
      {
        code: "export class MyService extends Effect.Service...",
        language: "typescript",
        description: "Basic service definition"
      }
    ],
    provenance: {
      source: "Effect Patterns API",
      timestamp: "2026-01-22T21:30:00.000Z",  // ISO 8601
      version: "pps-v2",
      marker: "v1"
    }
  }
}
```

#### `get_pattern` - Invalid ID (404)

```typescript
{
  content: [
    {
      type: "text",
      text: "## Pattern Not Found\n\nPattern \"invalid-id\" not found...",
      mimeType: "text/markdown"
    }
  ],
  structuredContent: {
    kind: "needsInput:v1",
    type: "elicitation",
    message: "Pattern \"invalid-id\" not found. Please provide a valid pattern ID.",
    needsInput: {
      fields: ["id"],
      reason: "Pattern ID \"invalid-id\" is invalid or does not exist",
      suggestions: {
        id: ["effect-service", "error-handling-match"]  // Top 5 matches from search
      }
    },
    options: [
      { label: "effect-service", value: "effect-service", description: "Pattern ID: effect-service", field: "id" },
      { label: "error-handling-match", value: "error-handling-match", description: "Pattern ID: error-handling-match", field: "id" }
    ]
  }
}
```

### Schema Definitions

Structured outputs are validated against Zod schemas defined in `src/schemas/output-schemas.ts`:

- `SearchResultsOutputSchema` - Validates search results
- `PatternDetailsOutputSchema` - Validates pattern details
- `ElicitationSchema` - Validates needsInput responses

**Note**: These are internal validation schemas. We do NOT register `outputSchema` with the MCP SDK (it doesn't support it yet). When the SDK adds support, we will register these schemas formally.

### Field Type Specifications

#### Query Parameters

```typescript
query: {
  q?: string;                    // Search query string (omitted if not provided)
  category?: string;              // Category filter (omitted if not provided)
  difficulty?: "beginner" | "intermediate" | "advanced";  // Union type (omitted if not provided)
  limit?: number;                 // Result limit (1-100, omitted if not provided)
  format?: "markdown" | "json" | "both";  // Resolved output format (echoed back)
}
```

**Note**: 
- Undefined values are **omitted** from JSON (keys not included). This ensures valid JSON serialization.
- `format` is always included in the query echo (shows the resolved format used for the response)

#### Timestamps

All timestamps use **ISO 8601 format**: `2026-01-22T21:30:00.000Z`

- `provenance.timestamp` - ISO 8601
- Consistent across all tools

#### Pattern Arrays

- `patterns[]` in search results contains **ALL matching patterns**, not just rendered cards
- `metadata.renderedCards` indicates how many cards are rendered in markdown
- `metadata.renderedCardIds` lists which pattern IDs were rendered as cards (in order)
- **Rendering Rule**: Cards are rendered for the first K patterns in index order (deterministic). `renderedCardIds` always matches `patterns.slice(0, renderedCards).map(p => p.id)`
- Patterns in search results use "card summary" format: id/title/category/difficulty/description/tags (no examples/useCases/relatedPatterns)
- Full details (examples, sections, useGuidance) are available via `get_pattern`
- This allows clients to access full result set programmatically while markdown shows top N
- **Contract Validation**: Server-side validation ensures `contractMarkers.cards === renderedCardIds.length` and logs warnings if mismatched

#### Description vs Summary

- **Search results** (`patterns[]`): Use `description` field (full description)
- **Pattern details**: Use both `summary` (brief, ~200 chars) and `description` (full)

### Format Parameter Behavior

| Format | Markdown Blocks | JSON Block | structuredContent |
|--------|----------------|-----------|-------------------|
| `"markdown"` (default) | ✅ | ❌ | ✅ (best-effort) |
| `"json"` | ❌ | ✅ | ✅ (best-effort) |
| `"both"` | ✅ | ✅ | ✅ (best-effort) |

**Important**: 
- **Default is `"markdown"`** - Returns markdown blocks only (no JSON block) for clean IDE UX
- When `format="json"`, we return JSON content block only
- When `format="both"`, we return markdown blocks + JSON content block
- **The JSON content block is the canonical source** for programmatic access (MCP-supported surface)
- The `structuredContent` field is best-effort/internal-only and may be dropped by MCP SDK
- **Clients should parse the JSON content block** when `format="json"` or `format="both"` for reliable structured access
- JSON blocks use `type: "text"` with `mimeType: "application/json"`. Some clients may treat `type: "text"` as display text, so parsing is required.

## 2. MIME-Typed Content Blocks

### Purpose

Content blocks explicitly declare their MIME type, enabling:
- Proper rendering by clients
- Content-type-specific handling
- Better integration with rendering systems

### Supported MIME Types

- `text/markdown` - Markdown-formatted content (default for pattern presentation, always included when format="markdown" or format="both")
- `application/json` - JSON data (only included when format="json" or format="both")
- `text/plain` - Plain text (for errors)

### Implementation

Content blocks include a `mimeType` field:

```typescript
{
  type: "text",
  text: "# Pattern Title\n\nDescription...",
  mimeType: "text/markdown"  // Explicit MIME type
}
```

**Important**: The server sets `mimeType` best-effort; some transports/clients may strip it. Clients must not depend on `mimeType` for content identification. Use schema-validated JSON parsing (see Testing section) to identify structured content blocks.

## 3. NeedsInput Payloads (Elicitation-like)

### Purpose

When user input is insufficient or ambiguous, tools return structured "needsInput" payloads instead of errors or generic messages. This improves UX by:
- Providing clear prompts for missing input
- Offering suggestions and options
- Enabling automated input collection

**Note**: This is NOT MCP SDK native elicitation (SDK doesn't support it yet). We use `structuredContent.type = "elicitation"` as a structured data format. When the SDK adds native elicitation support, we will migrate.

### Elicitation Schema

```typescript
{
  kind: "needsInput:v1",  // Discriminator
  type: "elicitation",
  message: string;  // Human-readable prompt
  needsInput?: {
    fields: string[];                              // Array of field names needing input
    reason: string;                                // Why input is needed
    suggestions?: Record<string, string[]>;        // Suggested values grouped by field
  },
  options?: Array<{
    label: string;
    value: string;
    description?: string;
    field?: string;                                // Field this option applies to (for grouping)
  }>
}
```

**Note**: 
- `fields` is an array (not a single string) to support multiple fields
- `suggestions` is keyed by field name (e.g., `{ "category": [...], "difficulty": [...] }`)
- `options` include `field` property so clients can group/separate by field type

### Elicitation Scenarios

#### Missing Search Query

**Trigger:** Empty or missing `q` parameter

**Threshold:** Query length < 1 character (after trim)

**Response:** See example above under "search_patterns - Elicitation (Empty Query)"

#### Too-Broad Search Results

**Trigger:** Results > `SEARCH_TOO_BROAD_THRESHOLD` (20) without category/difficulty filters

**Threshold Constant:** `SEARCH_TOO_BROAD_THRESHOLD = 20` (defined in `src/tools/elicitation-helpers.ts`)

**Behavior:**
- Threshold is independent of `limit` parameter
- Suggested filters are extracted from actual result distribution
- Options include both categories and difficulties found in results

**Response:** See example above under "search_patterns - Elicitation (Too Broad)"

#### Invalid Pattern ID

**Trigger:** Pattern ID not found (404) or empty string

**Behavior:**
- Searches for similar pattern IDs using the invalid ID as query
- Returns top 5 matches as suggestions
- If no matches found, suggestions array is empty

**Response:** See example above under "get_pattern - Invalid ID"

### Fallback Behavior

If the MCP client doesn't support structured elicitation, tools return:
1. Clean markdown prompt asking for missing fields
2. Structured `needsInput` object in JSON content block (when `format="json"` or `format="both"`) for programmatic access
3. Best-effort `structuredContent` field (may be dropped by client/transport)

## Backward Compatibility

All changes preserve backward compatibility:

- **Markdown rendering** remains unchanged and stable
- **Existing clients** continue to work with default `format="markdown"` (they ignore `structuredContent` and JSON blocks)
- **Default `format="markdown"`** preserves legacy UX (clean markdown, no JSON blobs)
- **Clients that request `format="json"`** must handle JSON content blocks
- **Error handling** remains consistent
- **MIME types** are optional (clients can ignore them)
- **Structured access**: Clients that need structured data should request `format="json"` or `format="both"`

## Size Limits and Truncation

### Code Examples

- **Search results**: Examples are omitted (card summary format only - id/title/category/difficulty/description/tags)
- **Pattern details**: Examples included in full
- **Future**: If pattern detail examples exceed 10KB, consider truncation with `...` indicator

### Descriptions

- **Search results**: Full descriptions included
- **Pattern details**: Both `summary` (~200 chars) and full `description` provided

### Security Notes

- **Provenance fields**: Never include secrets, API keys, or absolute local file paths
- **File paths**: If included, use relative paths only
- **Timestamps**: Use ISO 8601 format (no timezone-sensitive data)

## Contract Markers

Structured outputs include contract marker counts in metadata:

```typescript
contractMarkers: {
  index: 1,    // Number of `<!-- kind:pattern-index:v1 -->` markers
  cards: 3,    // Number of `<!-- kind:pattern-card:v1 -->` markers
  version: "v1"
}
```

This enables verification that presentation markers are present and correctly counted.

### Server-Side Validation Policy

Contract marker validation follows different policies by environment:

- **Development**: Warns to stderr and continues (allows iteration without blocking)
- **CI/Tests**: **Fails via test assertions** - Tests assert that `contractMarkers.cards === renderedCardIds.length` (prevents drift from shipping)
- **Production**: Warns to stderr only (never throws - preserves tool response semantics)

**Important**: Production tool execution **never throws** due to validation failures. This ensures:
- Tool responses always return valid `toolError:v1` payloads (not opaque exceptions)
- Tests catch inconsistencies via assertions before merge
- Production monitors issues without breaking user requests

**Implementation**: 
- Validation warnings in `src/tools/tool-implementations.ts` (logs to stderr, never throws)
- Test assertions in `src/tools/__tests__/rendered-card-ids.test.ts` and `tests/mcp-protocol/structured-output.test.ts` (fail fast in CI)

## Discriminators

All structured outputs include a `kind` discriminator for type-safe parsing:

- `"patternSearchResults:v1"` - Search results
- `"patternDetails:v1"` - Pattern details
- `"needsInput:v1"` - Elicitation/needsInput responses

Clients can use this to determine the response type without inspecting the structure.

## Versioning

- **Output schemas** are versioned via Zod schema definitions and `kind` discriminator
- **Marker versions** are tracked in `contractMarkers.version`
- **Breaking changes** will increment schema versions (e.g., `v1` → `v2`)

## Testing (Canonical Contract Validation)

Because some clients may strip `mimeType` and/or drop `structuredContent`, tests validate the **canonical structured contract** by:

1) calling tools with `format: "json"` or `format: "both"`
2) locating a JSON content block by attempting `JSON.parse`
3) validating the parsed payload using `ToolStructuredContentSchema` (Zod discriminated union)

### Example: Extract and Validate Structured JSON

```typescript
import { ToolStructuredContentSchema } from "@/schemas/output-schemas";

export function extractStructuredPayload(result: any) {
  const blocks = Array.isArray(result?.content) ? result.content : [];

  // Prefer scanning from the end so the "JSON block last" convention works for format="both".
  for (const block of [...blocks].reverse()) {
    if (block?.type !== "text" || typeof block.text !== "string") continue;

    try {
      const parsed = JSON.parse(block.text);
      const validated = ToolStructuredContentSchema.safeParse(parsed);
      if (validated.success) return validated.data;
    } catch {
      // Not JSON (or not the structured schema)
    }
  }

  throw new Error("No structured JSON content block found (or schema mismatch).");
}
```

### Example: Search Results Contract Test

```typescript
const result = await tool.call("search_patterns", {
  q: "error",
  format: "json"
});

const structured = extractStructuredPayload(result);
expect(structured.kind).toBe("patternSearchResults:v1");
```

### Example: NeedsInput/Elicitation Contract Test

```typescript
const result = await tool.call("search_patterns", {
  q: "",
  format: "json"
});

const structured = extractStructuredPayload(result);
expect(structured.kind).toBe("needsInput:v1");
expect(structured.type).toBe("elicitation");
expect(structured.needsInput.fields).toContain("q");
```

### Markdown-Only Mode Tests

For `format="markdown"` (default), tests should assert:
- the output contains required presentation contract markers (index/card markers)
- no JSON block is present
- no tool narration appears in user-visible text

## Error Responses

For non-elicitation errors (network failures, server errors, etc.), tools return structured error responses:

```typescript
{
  kind: "toolError:v1",
  code: "NETWORK_ERROR" | "SERVER_ERROR" | "CLIENT_ERROR" | "NOT_FOUND" | "AUTHENTICATION_ERROR" | "UNKNOWN_ERROR",
  message: string,
  retryable?: boolean,
  details?: Record<string, unknown>
}
```

This allows clients to handle errors consistently without parsing markdown error messages.

**See**: `docs/ERROR_RESPONSES.md` for complete error response examples including network errors, authentication errors, and server errors.

## Future Enhancements

Potential improvements:
- **Native MCP elicitation** - Migrate to SDK's elicitation mechanism when available
- **Output schema registration** - Register schemas with MCP SDK when supported (see `docs/TOOL_REGISTRATION.md`)
- **Interactive elicitation flows** - Client-side validation when available
- **Content negotiation** - Client requests specific MIME types
- **Streaming structured outputs** - For large result sets
- **Example truncation** - For very large code examples (>10KB)

## References

- MCP SDK: `@modelcontextprotocol/sdk` v1.25.3
- Schema validation: Zod v4
- Implementation: `src/tools/tool-implementations.ts`
- Schemas: `src/schemas/output-schemas.ts`
- Elicitation helpers: `src/tools/elicitation-helpers.ts`
