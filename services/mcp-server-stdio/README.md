# Effect Patterns MCP Server

Model Context Protocol (MCP) server that provides AI assistants with access to Effect-TS patterns, code generation, and pattern search capabilities.

## Features

### 🔧 Tools

1. **search_patterns** - Search for Effect patterns
   - Fuzzy search across titles, descriptions, tags
   - Filter by category and difficulty
   - Limit results

2. **get_pattern** - Get detailed pattern information
   - Full pattern metadata
   - Code examples
   - Use cases and best practices

3. **generate_snippet** - Generate customized code snippets
   - Custom function names
   - Custom input values
   - ESM or CJS module format
   - Effect version comments

## Installation

### For Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "effect-patterns": {
      "command": "node",
      "args": [
        "/Users/paul/Projects/Effect-Patterns/services/mcp-server-stdio/dist/index.js"
      ]
    }
  }
}
```

### For Other MCP Clients

The server communicates via stdio. Run it with:

```bash
node dist/index.js
```

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Run in development mode
bun run dev

# Run tests
bun run test
```

## Usage Examples

### Search for Patterns

```typescript
// Tool call
{
  "name": "search_patterns",
  "arguments": {
    "query": "retry",
    "category": "error-handling",
    "difficulty": "intermediate",
    "limit": 5
  }
}
```

### Get Pattern Details

```typescript
// Tool call
{
  "name": "get_pattern",
  "arguments": {
    "patternId": "retry-with-backoff"
  }
}
```

### Generate Code Snippet

```typescript
// Tool call
{
  "name": "generate_snippet",
  "arguments": {
    "patternId": "retry-with-backoff",
    "customName": "retryRequest",
    "customInput": "apiCall",
    "moduleType": "esm",
    "effectVersion": "3.0.0"
  }
}
```

## Architecture

- **Protocol**: Model Context Protocol (MCP) via stdio
- **SDK**: `@modelcontextprotocol/sdk`
- **Toolkit**: `@effect-patterns/toolkit` for pattern operations
- **Runtime**: Node.js with TypeScript

## Data Source

Patterns are loaded from `data/patterns-index.json` at startup. The server caches all patterns in memory for fast access.

## Error Handling

All tool calls return structured responses:
- Success: `{ content: [{ type: "text", text: "..." }] }`
- Error: `{ content: [{ type: "text", text: "..." }], isError: true }`

## License

MIT
