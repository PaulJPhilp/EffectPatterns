# MCP Server Testing Guide

This guide explains how to test the Effect Patterns MCP server against different environments.

## Overview

The MCP server can be tested in three ways:

1. **MCP Protocol Tests**: Test the stdio interface (how Claude Code IDE connects)
2. **Deployment Tests**: Test the HTTP API endpoints directly
3. **Manual Testing**: Use the MCP server interactively

## Quick Start

### Test Local Server

```bash
# 1. Start local API server
cd packages/mcp-server
bun run dev

# 2. In another terminal, run MCP tests
bun run test:mcp:local
```

### Test Staging

```bash
export STAGING_API_KEY="your-staging-key"
bun run test:mcp:staging
```

### Test Production

```bash
export PRODUCTION_API_KEY="your-production-key"
bun run test:mcp:production
```

### Test All Environments

```bash
export STAGING_API_KEY="staging-key"
export PRODUCTION_API_KEY="production-key"
bun run test:mcp:all
```

## Test Types

### 1. MCP Protocol Tests

These tests verify the stdio communication between the MCP client and server, simulating how Claude Code IDE connects.

**Test Files:**
- `tests/mcp-protocol/local.test.ts` - Local environment tests
- `tests/mcp-protocol/client-stdio.test.ts` - Connection lifecycle
- `tests/mcp-protocol/tools.test.ts` - Tool functionality
- `tests/mcp-protocol/error-handling.test.ts` - Error scenarios

**Run Tests:**
```bash
# All MCP protocol tests
bun run test:mcp

# Local environment only
bun run test:mcp:local

# Watch mode
bun run test:mcp:watch
```

**What They Test:**
- Server connection and initialization
- Tool discovery and registration
- Tool execution with various parameters
- Error handling and edge cases
- Connection lifecycle (connect, disconnect, reconnect)

### 2. Deployment Tests

These tests verify the HTTP API endpoints directly (not via MCP stdio).

**Test Files:**
- `tests/deployment/staging.test.ts` - Staging environment
- `tests/deployment/production.test.ts` - Production environment

**Run Tests:**
```bash
# Test staging
bun run test:deployment:staging

# Test production
bun run test:deployment:production

# Test both
bun run test:deployment
```

**What They Test:**
- API endpoint availability
- Authentication and authorization
- Response times and SLA compliance
- Error handling
- Data consistency
- Performance under load

### 3. Manual Testing

Test the MCP server interactively using the MCP client.

**Start MCP Server:**
```bash
cd packages/mcp-server

# Local environment
PATTERN_API_KEY=test-key bun run mcp

# Staging environment
STAGING_API_KEY=your-key MCP_ENV=staging bun run mcp

# Production environment
PRODUCTION_API_KEY=your-key MCP_ENV=production bun run mcp
```

**With Debug Logging:**
```bash
MCP_DEBUG=true PATTERN_API_KEY=test-key bun run mcp:debug
```

## Environment Configuration

### Local Environment

**Configuration:**
- API URL: `http://localhost:3000` (or `EFFECT_PATTERNS_API_URL`)
- API Key: `PATTERN_API_KEY` or `LOCAL_API_KEY` (default: "test-api-key")
- Environment Variable: `MCP_ENV=local`

**Prerequisites:**
- Local API server running on port 3000
- Start with: `bun run dev`

**Test:**
```bash
bun run test:mcp:local
```

### Staging Environment

**Configuration:**
- API URL: `https://effect-patterns-mcp-staging.vercel.app`
- API Key: `STAGING_API_KEY` (required)
- Environment Variable: `MCP_ENV=staging`

**Prerequisites:**
- Valid staging API key
- Staging deployment accessible

**Test:**
```bash
STAGING_API_KEY=your-key bun run test:mcp:staging
```

### Production Environment

**Configuration:**
- API URL: `https://effect-patterns-mcp.vercel.app`
- API Key: `PRODUCTION_API_KEY` (required)
- Environment Variable: `MCP_ENV=production`

**Prerequisites:**
- Valid production API key
- Production deployment accessible

**Test:**
```bash
PRODUCTION_API_KEY=your-key bun run test:mcp:production
```

## Test Scripts

### Individual Environment Scripts

- `scripts/test-mcp-local.sh` - Test local environment
- `scripts/test-mcp-staging.sh` - Test staging environment
- `scripts/test-mcp-production.sh` - Test production environment

### Combined Scripts

- `scripts/test-mcp-all.sh` - Test all environments sequentially

**Usage:**
```bash
# Make scripts executable (first time only)
chmod +x scripts/test-mcp-*.sh

# Run individual script
./scripts/test-mcp-local.sh

# Run with environment variables
STAGING_API_KEY=key ./scripts/test-mcp-staging.sh
```

## Troubleshooting

### Local Server Not Running

**Error:** `Local server not available at http://localhost:3000`

**Solution:**
```bash
cd packages/mcp-server
bun run dev
```

### Missing API Key

**Error:** `STAGING_API_KEY environment variable is required`

**Solution:**
```bash
export STAGING_API_KEY="your-key"
# or
STAGING_API_KEY=your-key bun run test:mcp:staging
```

### Connection Timeout

**Error:** `Failed to connect to staging after 10000ms`

**Possible Causes:**
1. Network connectivity issues
2. Server is down
3. Firewall blocking connection

**Solution:**
- Check server status: `curl https://effect-patterns-mcp-staging.vercel.app/api/health`
- Verify network connectivity
- Check firewall settings

### MCP Server Build Required

**Error:** `Cannot find module 'dist/mcp-stdio.js'`

**Solution:**
```bash
cd packages/mcp-server
bun run mcp:build
```

### Debugging Failed Tests

Enable debug logging:
```bash
MCP_DEBUG=true bun run test:mcp:local
```

Check test output for:
- Tool call parameters
- API request/response details
- Error messages with full context

## Best Practices

1. **Test Locally First**: Always test against local server before testing staging/production
2. **Use Environment Variables**: Never hardcode API keys in test files
3. **Check Prerequisites**: Verify server is running/accessible before running tests
4. **Enable Debug Logging**: Use `MCP_DEBUG=true` when troubleshooting
5. **Run Tests Sequentially**: Use `test:mcp:all` to test all environments in order
6. **Verify API Keys**: Ensure API keys are valid and have appropriate permissions

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Test MCP Server - Local
  run: |
    cd packages/mcp-server
    bun run dev &
    sleep 5
    bun run test:mcp:local

- name: Test MCP Server - Staging
  env:
    STAGING_API_KEY: ${{ secrets.STAGING_API_KEY }}
  run: |
    cd packages/mcp-server
    bun run test:mcp:staging

- name: Test MCP Server - Production
  env:
    PRODUCTION_API_KEY: ${{ secrets.PRODUCTION_API_KEY }}
  run: |
    cd packages/mcp-server
    bun run test:mcp:production
```

## Related Documentation

- [MCP_CONFIG.md](../MCP_CONFIG.md) - MCP server configuration guide
- [CLAUDE.md](../CLAUDE.md) - Claude Code IDE integration
- [AGENTS.md](../AGENTS.md) - Agent documentation
- [tests/README.md](tests/README.md) - Complete test suite documentation
