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
  - Optional for MCP server (pure transport)
  - Required by the HTTP API for authenticated requests
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

The MCP server provides 5 tools (free-tier surface only). Paid features are exposed via the HTTP API, not the MCP server.

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

### Paid Features (HTTP API Only)

The following paid-tier features are available via the HTTP API only (not exposed as MCP tools):
- `generate_pattern_code` → `POST /api/generate-pattern`
- `analyze_consistency` → `POST /api/analyze-consistency`
- `apply_refactoring` → `POST /api/apply-refactoring`

## Troubleshooting

### Server fails to start with API key errors

The MCP server no longer validates API keys. Authentication is enforced by the HTTP API. If requests fail with 401/402 errors, verify your HTTP API key and tier configuration.

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
4. **Batch Operations**: Group multiple refactorings into a single HTTP API `apply_refactoring` call

## Support and Debugging

For issues:

1. Check the [main documentation](./CLAUDE.md)
2. Review logs with debug enabled: `MCP_DEBUG=true bun run mcp`
3. Verify API connectivity: `curl -H "x-api-key: $PATTERN_API_KEY" http://localhost:3000/api/patterns?q=service`
4. Check MCP specification: https://spec.modelcontextprotocol.io/

## Testing the MCP Server

The MCP server can be tested against three environments: local, staging, and production.

### Testing Against Local Server

Test the MCP server stdio interface against your local development server:

```bash
# Prerequisites: Start local server
cd packages/mcp-server
bun run dev  # In one terminal

# Run local MCP tests (in another terminal)
bun run test:mcp:local

# Or use the script directly
./scripts/test-mcp-local.sh
```

**Environment Variables:**
- `PATTERN_API_KEY` or `LOCAL_API_KEY`: API key for local server (default: "test-api-key")
- `EFFECT_PATTERNS_API_URL`: Local server URL (default: "http://localhost:3000")
- `MCP_DEBUG`: Enable debug logging ("true" or "false")

### Testing Against Staging

Test the MCP server against the staging deployment:

```bash
# Set staging API key
export STAGING_API_KEY="your-staging-api-key"

# Run staging MCP tests
bun run test:mcp:staging

# Or use the script directly
STAGING_API_KEY=your-key ./scripts/test-mcp-staging.sh
```

**Environment Variables:**
- `STAGING_API_KEY`: Required. API key for staging environment
- `MCP_DEBUG`: Optional. Enable debug logging

### Testing Against Production

Test the MCP server against the production deployment:

```bash
# Set production API key
export PRODUCTION_API_KEY="your-production-api-key"

# Run production MCP tests
bun run test:mcp:production

# Or use the script directly
PRODUCTION_API_KEY=your-key ./scripts/test-mcp-production.sh
```

**Environment Variables:**
- `PRODUCTION_API_KEY`: Required. API key for production environment
- `MCP_DEBUG`: Optional. Enable debug logging

### Testing All Environments

Run tests against all three environments in sequence:

```bash
# Set API keys for staging and production
export STAGING_API_KEY="your-staging-key"
export PRODUCTION_API_KEY="your-production-key"

# Run all tests
bun run test:mcp:all

# Or use the script directly
STAGING_API_KEY=staging-key PRODUCTION_API_KEY=prod-key ./scripts/test-mcp-all.sh
```

**Note:** Local tests require a running local server. Staging and production tests require valid API keys.

### MCP Protocol Tests

The MCP protocol tests verify the stdio communication between the MCP client and server:

```bash
# Run all MCP protocol tests (requires local server)
bun run test:mcp

# Watch mode
bun run test:mcp:watch

# Run specific test file
bunx vitest run --config vitest.mcp.config.ts tests/mcp-protocol/local.test.ts
```

### Deployment Tests

Test the HTTP API endpoints directly (not via MCP stdio):

```bash
# Test staging deployment
bun run test:deployment:staging

# Test production deployment
bun run test:deployment:production

# Test both
bun run test:deployment
```

## Environment Configuration

The MCP server uses environment-specific configuration:

### Local Environment
- **API URL**: `http://localhost:3000` (or `EFFECT_PATTERNS_API_URL`)
- **API Key**: `PATTERN_API_KEY` or `LOCAL_API_KEY` (default: "test-api-key")
- **Use Case**: Development and local testing

### Staging Environment
- **API URL**: `https://effect-patterns-mcp-staging.vercel.app`
- **API Key**: `STAGING_API_KEY` (required)
- **Use Case**: Pre-production testing

### Production Environment
- **API URL**: `https://effect-patterns-mcp.vercel.app`
- **API Key**: `PRODUCTION_API_KEY` (required)
- **Use Case**: Production validation

### Switching Environments

Set the `MCP_ENV` environment variable to switch between environments:

```bash
# Use local environment
export MCP_ENV=local
bun run mcp

# Use staging environment
export MCP_ENV=staging
export STAGING_API_KEY=your-key
bun run mcp

# Use production environment
export MCP_ENV=production
export PRODUCTION_API_KEY=your-key
bun run mcp
```

## Next Steps

- [Read the main Claude integration guide](./CLAUDE.md)
- [Review the agents documentation](./AGENTS.md)
- [Explore pattern examples](./packages/toolkit/src/patterns/)
