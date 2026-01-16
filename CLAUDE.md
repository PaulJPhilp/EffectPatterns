# Claude Integration

This document provides information about Claude Code and Windsurf integration with the Effect Patterns project.

## MCP Server - Code Review Tool

The Effect Patterns project provides a Model Context Protocol (MCP) server with a **`review_code` tool** that analyzes your TypeScript code for architectural issues and best practices.

### Using the Code Review Tool

**In your editor chat** (Windsurf, Claude Code, etc.), you can invoke code review in two ways:

#### 1. Paste Code Directly
```
Review this TypeScript code for Effect anti-patterns:

export const MyService = Effect.gen(function* () {
  // ... your code ...
});
```

#### 2. Reference a File
```
Review this file for architectural issues: src/services/user.ts
```

The tool will:
- Analyze the code for Effect-TS anti-patterns
- Return top 3 high-impact recommendations (free tier)
- Show severity levels: 🔴 high, 🟡 medium, 🔵 low
- Provide detailed explanations for each finding

### Example Prompts

- "Analyze this service for error handling patterns"
- "What architectural improvements would you suggest for this code?"
- "Check this Effect composition for performance issues"
- "Review this file for best practices: src/handlers/api.ts"

### What Gets Analyzed

The code review tool checks for:
- **Error Handling**: Missing error boundaries, unhandled rejections
- **Anti-Patterns**: Common Effect-TS mistakes and inefficiencies
- **Architecture**: Composition patterns, dependency handling
- **Performance**: Potential bottlenecks and optimization opportunities
- **Best Practices**: Idiomatic Effect-TS code style

### Free Tier Limits

- Max 100KB per file
- Top 3 recommendations shown (sorted by severity)
- `.ts` and `.tsx` files only
- Results include upgrade messaging if more issues detected

### More Tools Available

The MCP server also provides:
- `search_patterns` - Search 700+ Effect-TS patterns
- `get_pattern` - Get full pattern details
- `analyze_code` - Deeper analysis (all findings)
- `list_analysis_rules` - See all detection rules
- `generate_pattern_code` - Generate code from templates

### Configuration

For local development setup, see:
- **[MCP_CONFIG.md](./MCP_CONFIG.md)** - Complete MCP server configuration guide
- **[AGENTS.md](./AGENTS.md)** - Full agent documentation

### MCP Server Locations

- **Source**: `packages/mcp-server/`
- **Local Development**: Port 3000 (with `bun run dev`)
- **Production**: `https://effect-patterns-mcp.vercel.app`
- **Staging**: `https://effect-patterns-mcp-staging.vercel.app`

### Stress Testing

The MCP server includes a comprehensive stress testing suite to validate performance under various load conditions:

```bash
# Run individual stress test suites
bun run test:stress:edge      # Edge cases (2.9s) - 19 tests
bun run test:stress:volume    # Volume tests (3.4s) - 14 tests
bun run test:stress:load      # Load tests (~300s) - 5 tests
bun run test:stress:spike     # Spike tests (~380s) - 6 tests
bun run test:stress:endurance # Endurance (40+ min) - 4 tests

# Run all stress tests
bun run test:stress:all
```

Test coverage includes:
- **Edge Cases**: Boundary conditions, malformed input, error handling
- **Volume**: Large files (98KB), complex code, deep nesting, consistency
- **Load**: Concurrent requests, baseline/normal/peak/saturation
- **Spike**: Traffic bursts, ramps, oscillation, flash crowds
- **Endurance**: 40+ minute sustained load, memory leak detection

See [STRESS_TESTING.md](./packages/mcp-server/tests/stress/STRESS_TESTING.md) for detailed testing guide.

### Comprehensive Test Suite

The MCP server includes comprehensive test coverage across 5 categories:

```bash
# Run all unit tests
bun run test

# Run MCP protocol tests (50+ tests via stdio)
bun run test:mcp

# Run deployment tests (staging & production)
export STAGING_API_KEY="your-key"
bun run test:deployment:staging

export PRODUCTION_API_KEY="your-key"
bun run test:deployment:production

# Run authentication tests
bun run test:auth

# Run route and handler tests
bun run test:routes

# Run all critical tests
bun run test:full

# Run all tests for CI/CD
bun run test:ci
```

**Test Coverage Summary:**
- **Unit Tests**: 137+ tests - Core services and utilities
- **MCP Protocol**: 50+ tests - Stdio communication using SDK client
- **Deployment**: 50+ tests - Staging and production environments
- **Authentication**: 13+ tests - API key validation middleware
- **Routes**: 80+ tests - API routes and handler factories
- **Stress Tests**: 48+ tests - Performance and load testing
- **TOTAL**: 378+ tests - Complete comprehensive coverage

See [tests/README.md](./packages/mcp-server/tests/README.md) for detailed test documentation.

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

# Run stress tests to validate performance
bun run test:stress:all
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
