# Claude Integration

This document provides information about Claude Code integration with the Effect Patterns project.

## MCP Server Integration

The Effect Patterns project provides a Model Context Protocol (MCP) server that serves patterns directly to Claude Code IDE.

### Quick Start

1. **Install the Claude Code Plugin**
   - Plugin URL: `https://effect-patterns-mcp.vercel.app`
   - Requires API key authentication

2. **Configure in Claude Code**
   - Add the MCP server to your Claude Code configuration
   - Use your API key for authentication

### Features

- **Real-time Pattern Search**: Search 700+ Effect-TS patterns
- **Context-Aware Suggestions**: Get pattern recommendations based on your code
- **Direct Integration**: Patterns appear directly in Claude Code
- **Pattern Generation**: Generate Effect-TS code patterns with AI assistance

### Documentation

For complete details about agents and integration, see:
- **[AGENTS.md](./AGENTS.md)** - Full agent documentation

### MCP Server Details

- **Production**: `https://effect-patterns-mcp.vercel.app`
- **Staging**: `https://effect-patterns-mcp-staging.vercel.app`
- **Source**: `packages/mcp-server/`

### API Key

Get your API key from the project maintainers or check your environment configuration:
```bash
PATTERN_API_KEY_PRODUCTION=your_key_here
```

### Development Setup

The project uses npm workspaces for package resolution. No TypeScript path aliases are used - packages resolve via `workspace:*` dependencies.

```bash
# Install dependencies
bun install

# Build workspace packages
bun run --filter @effect-patterns/toolkit build
bun run --filter @effect-patterns/pipeline-state build
bun run --filter @effect-patterns/ep-shared-services build

# Run MCP server locally
cd packages/mcp-server
bun run dev

# Test MCP connection
bun run smoke-test
```

### Support

For issues or questions:
1. Check the [AGENTS.md](./AGENTS.md) documentation
2. Review the MCP server logs
3. Contact the project maintainers

## Debugging Guidelines

- **Debug Scripts**: Always create and run debug scripts from the **project root** directory.
- **Dependency Resolution**: Running from the root ensures `node_modules` are accessible and relative import paths resolve correctly.
- **Rule Verification**: Use scripts like `scripts/debug-blocking.ts` to verify anti-pattern detection rules against specific code snippets.

---

*See [AGENTS.md](./AGENTS.md) for complete agent documentation.*
