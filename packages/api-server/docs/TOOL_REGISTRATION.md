# MCP Tool Registration and Schema Validation

This document describes how tools are registered with the MCP SDK and how output schemas are validated.

## Tool Registration

Tools are registered using the MCP SDK's `server.tool()` method in `src/tools/tool-implementations.ts`.

### Current Implementation

```typescript
server.tool(
  "search_patterns",
  "Search Effect-TS patterns by query, category, difficulty level, and more",
  ToolSchemas.searchPatterns.shape as any,  // Input schema (Zod)
  async (args: SearchPatternsArgs): Promise<CallToolResult> => {
    // Tool implementation
  }
);
```

### Input Schemas

- **Defined in**: `src/schemas/tool-schemas.ts`
- **Format**: Zod schemas
- **Registration**: Passed to `server.tool()` as `ToolSchemas.searchPatterns.shape as any`
- **Note**: The `as any` cast is required because the MCP SDK expects a different schema format than Zod provides

### Output Schemas

- **Defined in**: `src/schemas/output-schemas.ts`
- **Format**: Zod schemas (`SearchResultsOutputSchema`, `PatternDetailsOutputSchema`, `ElicitationSchema`, `ToolErrorSchema`)
- **Validation**: Used internally for runtime validation via Zod schema `safeParse()` (e.g., `SearchResultsOutputSchema.safeParse()`)
- **Registration with MCP SDK**: **NOT SUPPORTED** - The MCP SDK (v1.25.3) does not support `outputSchema` in tool definitions

### Schema Validation Strategy

Since the MCP SDK doesn't support output schema registration, we:

1. **Validate internally** using Zod schemas before returning responses
2. **Provide structured outputs** via `structuredContent` field
3. **Include `kind` discriminator** for type-safe parsing by clients
4. **Document schemas** in `docs/MCP_ADVANCED_PRESENTATION.md` and `docs/EXAMPLE_RESPONSES.md`

### Future Migration Path

When the MCP SDK adds support for `outputSchema`:

1. Convert Zod schemas to JSON Schema format (or whatever the SDK requires)
2. Register schemas with tool definitions:
   ```typescript
   server.tool(
     "search_patterns",
     "...",
     inputSchema,
     handler,
     { outputSchema: SearchResultsOutputJSONSchema }  // When supported
   );
   ```
3. Maintain backward compatibility with `structuredContent` field

## Current Schema Files

### Input Schemas (`src/schemas/tool-schemas.ts`)
- `ToolSchemas.searchPatterns` - Input schema for `search_patterns`
- `ToolSchemas.getPattern` - Input schema for `get_pattern`
- `ToolSchemas.listAnalysisRules` - Input schema for `list_analysis_rules`
- `ToolSchemas.getMcpConfig` - Input schema for `get_mcp_config` (registered only when `MCP_DEBUG=true` or `MCP_ENV=local`)

> **Note**: `analyzeCode` and `reviewCode` schemas were removed from the MCP tool surface.
> **Note**: `get_mcp_config` is a debug/local-only tool; it is not registered in production or staging.

### Output Schemas (`src/schemas/output-schemas.ts`)
- `SearchResultsOutputSchema` - Output schema for `search_patterns`
- `PatternDetailsOutputSchema` - Output schema for `get_pattern`
- `ElicitationSchema` - Output schema for elicitation responses
- `ToolErrorSchema` - Output schema for error responses

## Validation Points

1. **Tool Input**: Validated by MCP SDK using input schemas
2. **Tool Output**: Validated internally using Zod schemas before returning (e.g., `SearchResultsOutputSchema.safeParse()`)
3. **Contract Markers**: Validated server-side (counts must match rendered content)
4. **Rendered Card IDs**: Validated server-side (must match first K patterns)

## Validation Policy

Contract marker validation follows different policies by environment:

- **Development**: Warns to stderr and continues (allows iteration without blocking)
- **CI/Tests**: **Fails via test assertions** - Tests assert that `contractMarkers.cards === renderedCardIds.length` (prevents drift from shipping)
- **Production**: Warns to stderr only (never throws - preserves tool response semantics)

**Important**: Production tool execution **never throws** due to validation failures. This ensures:
- Tool responses always return valid `toolError:v1` payloads (not opaque exceptions)
- Tests catch inconsistencies via assertions before merge
- Production monitors issues without breaking user requests

**Implementation**: 
- Validation warnings in `src/tools/tool-implementations.ts`
- Test assertions in `src/tools/__tests__/rendered-card-ids.test.ts` and `tests/mcp-protocol/structured-output.test.ts`

## Testing

- **Unit tests**: `src/tools/__tests__/structured-output.test.ts` - Schema validation
- **Unit tests**: `src/tools/__tests__/rendered-card-ids.test.ts` - Contract consistency (asserts `contractMarkers.cards === renderedCardIds.length`)
- **Integration tests**: `tests/mcp-protocol/structured-output.test.ts` - End-to-end validation

### Union Schema Validation

All structured content is validated against `ToolStructuredContentSchema` (discriminated union):

```typescript
import { ToolStructuredContentSchema } from "../schemas/output-schemas.js";

const validation = ToolStructuredContentSchema.safeParse(result.structuredContent);
if (!validation.success) {
  // Handle validation error
}
```

This prevents drift as new tool response types are added.

## MCP SDK Version

- **Current**: `@modelcontextprotocol/sdk` v1.25.3
- **Output Schema Support**: Not available
- **Elicitation Support**: Not available (we use structured `needsInput` payloads)

## Client Compatibility

### `structuredContent` Field Preservation

The `structuredContent` field is a custom extension to tool results. We've verified:

- **MCP SDK**: Preserves unknown fields in tool results (does not strip them)
- **Test Client**: Our test client (`tests/mcp-protocol/helpers/mcp-test-client.ts`) includes `structuredContent` in `ToolResult` interface
- **Cursor/IDEs**: Should preserve unknown fields, but if they don't, we can migrate to:
  - A dedicated content block with `type: "structured"` and `mimeType: "application/json"`
  - Or wait for official SDK support for structured outputs

**Current Status**: `structuredContent` is preserved by the MCP SDK and accessible to clients. If a client drops unknown fields, we'll detect it via integration tests and can migrate to content-block encoding.

## References

- Implementation: `src/tools/tool-implementations.ts`
- Schemas: `src/schemas/`
