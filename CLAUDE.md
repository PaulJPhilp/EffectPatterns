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

### Documentation

For complete details about agents and integration, see:
- **[AGENTS.md](./AGENTS.md)** - Full agent documentation

### MCP Server Details

- **Production**: `https://effect-patterns-mcp.vercel.app`
- **Staging**: `https://effect-patterns-mcp-staging.vercel.app`
- **Source**: `app/mcp/mcp-server/`

### API Key

Get your API key from the project maintainers or check your environment configuration:
```bash
PATTERN_API_KEY_PRODUCTION=your_key_here
```

### Support

For issues or questions:
1. Check the [AGENTS.md](./AGENTS.md) documentation
2. Review the MCP server logs
3. Contact the project maintainers

---

*See [AGENTS.md](./AGENTS.md) for complete agent documentation.*
