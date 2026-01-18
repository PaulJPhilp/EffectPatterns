# Effect Patterns MCP Server Configuration Guide

This guide explains how to configure and run the Effect Patterns MCP (Model Context Protocol) server with Claude Code IDE and other MCP clients.

## Overview

The Effect Patterns MCP Server provides access to 700+ Effect-TS patterns through a Model Context Protocol interface. It allows Claude Code IDE to:

- Search Effect-TS patterns by query, category, and difficulty level
- Retrieve detailed pattern documentation and code examples
- Analyze TypeScript code for anti-patterns and best practices violations
- Get AI-powered architectural reviews and recommendations
- Generate customized code from pattern templates
- Apply automated refactoring patterns

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+ or Bun 1.0+
- API key (for accessing the patterns API)
- The Effect Patterns repository cloned locally

### Step 1: Install Dependencies

```bash
cd /path/to/Effect-Patterns
bun install
```

### Step 2: Get Your API Key

Set your API key as an environment variable:

```bash
export PATTERN_API_KEY="your-api-key-here"
```

Or add to your `.env.local`:

```
PATTERN_API_KEY=your-api-key-here
```

### Step 3: Start the MCP Server

From the mcp-server directory:

```bash
cd packages/mcp-server
bun run mcp
```

Or with debug logging enabled:

```bash
bun run mcp:debug
```

The server will start and listen on stdio, ready to accept MCP requests.

### Step 4: Configure Claude Code IDE

#### Via `.windsurf/mcp_config.json` (Windsurf IDE)

Create or update `.windsurf/mcp_config.json` in your project root:

```json
{
  "mcpServers": {
    "effect-patterns": {
      "command": "bun",
      "args": ["run", "mcp"],
      "cwd": "packages/mcp-server",
      "env": {
        "PATTERN_API_KEY": "your-api-key-here",
        "EFFECT_PATTERNS_API_URL": "http://localhost:3000"
      },
      "disabled": false
    }
  }
}
```

#### Via Claude Desktop (Official Claude)

1. Open Claude settings
2. Navigate to "Developer" → "Model Context Protocol"
3. Click "Add MCP Server"
4. Configure:
   - **Name**: Effect Patterns
   - **Command**: `bun`
   - **Arguments**: `["run", "mcp"]`
   - **Working Directory**: `/path/to/Effect-Patterns/packages/mcp-server`
   - **Environment Variables**:
     ```
     PATTERN_API_KEY=your-api-key-here
     EFFECT_PATTERNS_API_URL=http://localhost:3000
     ```

#### Via Other MCP Clients

The server can be used with any MCP-compatible client by running:

```bash
cd packages/mcp-server
PATTERN_API_KEY=your-api-key-here bun run mcp
```

And configuring your client to connect via stdio.

## Environment Variables

The MCP server respects the following environment variables:

### Required

- **`PATTERN_API_KEY`**: API key for accessing the patterns API
  - Default: None (required)
  - Example: `export PATTERN_API_KEY=sk-...`

### Optional

- **`EFFECT_PATTERNS_API_URL`**: Base URL for the patterns API
  - Default: `http://localhost:3000`
  - Example: `export EFFECT_PATTERNS_API_URL=https://api.example.com`

- **`MCP_DEBUG`**: Enable debug logging to stderr
  - Default: `false`
  - Values: `true` or `false`
  - Example: `export MCP_DEBUG=true`

## Available Tools

The MCP server provides 8 tools:

### 1. `search_patterns`

Search Effect-TS patterns with optional filters.

**Parameters:**
- `q` (string, optional): Search query (e.g., "error handling", "async")
- `category` (string, optional): Pattern category filter
- `difficulty` (string, optional): Difficulty level (beginner, intermediate, advanced)
- `limit` (number, optional): Maximum results (1-100, default: 20)

**Example:**
```json
{
  "q": "error handling",
  "difficulty": "intermediate",
  "limit": 10
}
```

### 2. `get_pattern`

Retrieve full details for a specific pattern by ID.

**Parameters:**
- `id` (string, required): Pattern identifier (e.g., "effect-service")

**Example:**
```json
{
  "id": "effect-service"
}
```

### 3. `list_analysis_rules`

List all available code analysis rules for anti-pattern detection.

**Parameters:** None

### 4. `analyze_code`

Analyze TypeScript code for Effect-TS anti-patterns and best practices violations.

**Parameters:**
- `source` (string, required): TypeScript source code to analyze
- `filename` (string, optional): Filename for context (e.g., "service.ts")
- `analysisType` (string, optional): Analysis type (validation, patterns, errors, all; default: "all")

**Example:**
```json
{
  "source": "const x = Effect.try(() => { /* ... */ })",
  "filename": "service.ts",
  "analysisType": "all"
}
```

### 5. `review_code`

Get AI-powered architectural review and recommendations for Effect code.

**Parameters:**
- `code` (string, required): Source code to review
- `filePath` (string, optional): File path for context (e.g., "src/services/user.ts")

**Example:**
```json
{
  "code": "export const MyService = Effect.gen(function* () { /* ... */ })",
  "filePath": "src/services/user.ts"
}
```

### 6. `generate_pattern_code`

Generate customized code from a pattern template.

**Parameters:**
- `patternId` (string, required): Pattern template ID (e.g., "effect-service", "error-handler")
- `variables` (object, optional): Variables for template substitution

**Example:**
```json
{
  "patternId": "effect-service",
  "variables": {
    "serviceName": "UserService",
    "methods": "getUser,createUser"
  }
}
```

### 7. `analyze_consistency`

Detect inconsistencies and anti-patterns across multiple TypeScript files.

**Parameters:**
- `files` (array, required): Array of files to analyze
  - Each file has:
    - `filename` (string): File path
    - `source` (string): File source code

**Example:**
```json
{
  "files": [
    {
      "filename": "src/services/user.ts",
      "source": "/* ... */"
    },
    {
      "filename": "src/services/product.ts",
      "source": "/* ... */"
    }
  ]
}
```

### 8. `apply_refactoring`

Apply automated refactoring patterns to code.

**Parameters:**
- `refactoringIds` (array, required): List of refactoring IDs to apply
- `files` (array, required): Files to refactor (same format as analyze_consistency)
- `preview` (boolean, optional): Preview changes without applying (default: true)

**Example:**
```json
{
  "refactoringIds": ["fix-error-handling", "simplify-pipes"],
  "files": [
    {
      "filename": "src/service.ts",
      "source": "/* ... */"
    }
  ],
  "preview": true
}
```

## Troubleshooting

### Server fails to start with "PATTERN_API_KEY is required"

**Solution**: Ensure the `PATTERN_API_KEY` environment variable is set:

```bash
export PATTERN_API_KEY="your-api-key-here"
bun run mcp
```

### Server crashes with "Cannot find module '@modelcontextprotocol/sdk'"

**Solution**: Reinstall dependencies:

```bash
cd /path/to/Effect-Patterns
bun install
```

### Claude Code IDE cannot connect to server

**Possible causes:**
1. The MCP server process is not running
2. The working directory in configuration is incorrect
3. Environment variables are not being passed properly

**Solutions:**
1. Start the server manually to verify it works:
   ```bash
   cd packages/mcp-server
   PATTERN_API_KEY=your-key bun run mcp:debug
   ```

2. Check the working directory is absolute:
   ```json
   "cwd": "/full/path/to/Effect-Patterns/packages/mcp-server"
   ```

3. Verify environment variables in configuration are spelled correctly

### Tools are registered but fail to execute

**Possible causes:**
1. The backend API is not running
2. API key is invalid
3. The API URL is incorrect

**Solutions:**
1. Verify the API server is running (default: http://localhost:3000)
2. Check your API key is correct
3. Use `MCP_DEBUG=true` to see actual errors:
   ```bash
   MCP_DEBUG=true bun run mcp
   ```

### "API key" errors in logs

**Solution**: Never log actual API keys. The server sanitizes API keys in logs for security. If you see `API key` in a log message, it means the key itself is not logged (which is correct).

## Development Workflow

### Local Development with API Server

To develop against a local API server:

```bash
# Terminal 1: Start the API server
cd packages/mcp-server
bun run dev  # Starts Next.js API server on port 3000

# Terminal 2: Start the MCP server
cd packages/mcp-server
PATTERN_API_KEY=dev-key bun run mcp
```

### With Debug Logging

Enable debug output to stderr:

```bash
MCP_DEBUG=true PATTERN_API_KEY=dev-key bun run mcp
```

This will log:
- Tool calls and parameters
- API requests and responses
- Error messages with full context

### Building for Production

To create a standalone bundle:

```bash
cd packages/mcp-server
bun run mcp:build
```

This creates `dist/mcp-stdio.js` (668KB bundled).

## Integration with Claude Code IDE Features

### Pattern Search in Conversations

Use the search_patterns tool in conversation prompts:

```
Search for patterns about error handling with difficulty level intermediate
```

Claude will automatically use the `search_patterns` tool and show results.

### Code Analysis in Context

When analyzing code, Claude can use `analyze_code`:

```
Analyze this code for Effect-TS anti-patterns: [code snippet]
```

### Pattern Generation

Generate code from patterns:

```
Generate a UserService using the effect-service pattern with these methods: getUser, createUser, updateUser
```

### Refactoring Projects

Analyze and refactor entire project sections:

```
Analyze these Effect service files for consistency and suggest refactorings: [files]
```

## Security Considerations

1. **API Keys**: Never commit API keys to version control. Use environment variables or `.env.local`
2. **Log Files**: When `MCP_DEBUG=true`, sensitive information might appear in stderr. Redirect logs carefully
3. **Network**: The server communicates with the backend API. Ensure HTTPS is used in production
4. **Input Validation**: All inputs are validated by the MCP SDK before reaching handlers

## Performance Tips

1. **Caching**: Pattern searches are cached server-side for 5 minutes
2. **Limits**: The API has rate limits (default: 100 requests/minute per key)
3. **Large Files**: For analyzing multiple files, keep total size under 10MB
4. **Batch Operations**: Group multiple refactorings into a single `apply_refactoring` call

## Support and Debugging

For issues:

1. Check the [main documentation](./CLAUDE.md)
2. Review logs with debug enabled: `MCP_DEBUG=true bun run mcp`
3. Verify API connectivity: `curl -H "x-api-key: $PATTERN_API_KEY" http://localhost:3000/api/patterns?q=service`
4. Check MCP specification: https://spec.modelcontextprotocol.io/

## Next Steps

- [Read the main Claude integration guide](./CLAUDE.md)
- [Review the agents documentation](./AGENTS.md)
- [Explore pattern examples](./packages/toolkit/src/patterns/)
