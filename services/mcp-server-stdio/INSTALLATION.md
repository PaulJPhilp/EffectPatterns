# Effect Patterns MCP Server - Installation Guide

## Prerequisites

- Node.js 18+ or Bun
- Claude Desktop app (for Claude integration)

## Quick Start

### 1. Build the Server

```bash
cd /Users/paul/Projects/Effect-Patterns/services/mcp-server-stdio
bun install
bun run build
```

### 2. Configure Claude Desktop

Edit your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the following configuration:

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

**Important**: Update the path to match your actual installation directory!

### 3. Restart Claude Desktop

Close and reopen Claude Desktop completely. The MCP server will start automatically when Claude launches.

### 4. Verify Installation

In Claude Desktop, you should see the Effect Patterns tools available:
- 🔍 `search_patterns` - Search for Effect patterns
- 📖 `get_pattern` - Get detailed pattern information
- 💻 `generate_snippet` - Generate code snippets

## Testing the Server

You can test the server independently:

```bash
# Run the test script
bun run tsx test-mcp.ts

# Or manually test with stdio
node dist/index.js
```

## Usage in Claude

### Example 1: Search for Patterns

```
Can you search for Effect patterns related to error handling?
```

Claude will use the `search_patterns` tool:
```json
{
  "query": "error handling",
  "category": "error-handling",
  "limit": 10
}
```

### Example 2: Get Pattern Details

```
Show me details about the retry-with-backoff pattern
```

Claude will use the `get_pattern` tool:
```json
{
  "patternId": "retry-with-backoff"
}
```

### Example 3: Generate Code

```
Generate a code snippet for the retry pattern with custom name "retryApiCall"
```

Claude will use the `generate_snippet` tool:
```json
{
  "patternId": "retry-with-backoff",
  "customName": "retryApiCall",
  "moduleType": "esm"
}
```

## Troubleshooting

### Server Not Appearing in Claude

1. Check that the path in `claude_desktop_config.json` is correct
2. Ensure the server is built (`dist/index.js` exists)
3. Check Claude Desktop logs:
   - macOS: `~/Library/Logs/Claude/mcp*.log`
   - Windows: `%APPDATA%\Claude\logs\mcp*.log`

### Build Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
bun install
bun run build
```

### Pattern Data Not Loading

Ensure `data/patterns-index.json` exists in the project root:
```bash
ls -la /Users/paul/Projects/Effect-Patterns/data/patterns-index.json
```

## Advanced Configuration

### Custom Data Path

You can modify the patterns path in `src/index.ts`:

```typescript
const patternsPath = join(__dirname, '../../../data/patterns-index.json');
```

### Environment Variables

Currently, the server doesn't require environment variables, but you can add them to the Claude config:

```json
{
  "mcpServers": {
    "effect-patterns": {
      "command": "node",
      "args": ["..."],
      "env": {
        "DEBUG": "true"
      }
    }
  }
}
```

## Development

### Watch Mode

```bash
bun run dev
```

### Run Tests

```bash
bun run test
```

### Type Checking

```bash
bun run typecheck
```

## Updating

```bash
cd /Users/paul/Projects/Effect-Patterns/services/mcp-server-stdio
git pull
bun install
bun run build
# Restart Claude Desktop
```

## Support

For issues or questions:
- Check the logs in Claude Desktop
- Review the README.md for API documentation
- Test the server independently with `test-mcp.ts`
