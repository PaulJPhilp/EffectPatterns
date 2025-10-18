# Smoke Test Suite

Comprehensive smoke tests for the Effect Patterns MCP Server deployment verification.

## Overview

The smoke test suite verifies that all API endpoints are functioning correctly in a deployed environment. It includes 21+ tests covering:

- Health checks and system status
- Authentication and authorization
- Pattern search and retrieval
- Snippet generation
- Trace wiring examples
- Error handling
- Performance benchmarks

## Test Implementations

We provide two implementations:

### 1. **TypeScript Version** (`smoke-test.ts`)
- Uses Node.js native `fetch` API
- Type-safe with full TypeScript support
- Colorized console output
- Detailed assertion messages

**Usage:**
```bash
bun run smoke-test <BASE_URL> <API_KEY>

# Examples:
bun run smoke-test https://staging.example.com staging-key-123
bun run smoke-test http://localhost:3000 test-api-key

# Or via npm script:
cd services/mcp-server
bun run smoke-test https://your-deployment.vercel.app your-api-key
```

### 2. **Bash Version** (`smoke-test.sh`)
- Uses `curl` and `jq` for HTTP requests
- No dependencies beyond standard Unix tools
- Portable across all Unix-like systems
- Ideal for CI/CD pipelines

**Usage:**
```bash
./smoke-test.sh <BASE_URL> <API_KEY>

# Examples:
./smoke-test.sh https://staging.example.com staging-key-123
./smoke-test.sh http://localhost:3000 test-api-key

# Or via npm script:
bun run smoke-test:bash https://your-deployment.vercel.app your-api-key
```

## Prerequisites

### TypeScript Version
- Bun or Node.js 18+
- No additional dependencies (uses native fetch)

### Bash Version
- `curl` - HTTP client
- `jq` - JSON parser
- Standard Unix tools (`bash`, `grep`, `sed`)

Install on macOS:
```bash
brew install jq
```

Install on Ubuntu/Debian:
```bash
sudo apt-get install jq curl
```

## Test Coverage

### Authentication Tests
- ✅ Endpoints that require authentication return 401 without API key
- ✅ Endpoints reject invalid API keys
- ✅ Endpoints accept valid API key in header (`x-api-key`)
- ✅ Endpoints accept valid API key in query parameter (`?key=`)
- ✅ Health check endpoint does not require authentication

### Pattern Search Tests
- ✅ GET `/api/patterns` returns all patterns
- ✅ Search by query: `/api/patterns?q=retry`
- ✅ Filter by category: `/api/patterns?category=error-handling`
- ✅ Filter by difficulty: `/api/patterns?difficulty=intermediate`
- ✅ Limit results: `/api/patterns?limit=5`
- ✅ Returns pattern summaries (not full patterns)

### Pattern Retrieval Tests
- ✅ GET `/api/patterns/:id` returns full pattern with examples
- ✅ Returns 404 for non-existent pattern
- ✅ Includes trace ID in response

### Snippet Generation Tests
- ✅ POST `/api/generate` generates code snippet
- ✅ Supports custom name parameter
- ✅ Supports custom input parameter
- ✅ Supports module type (ESM/CJS)
- ✅ Validates request body (returns 400 for invalid requests)
- ✅ Returns 404 for non-existent pattern

### Trace Wiring Tests
- ✅ GET `/api/trace-wiring` returns tracing examples
- ✅ Includes Effect.js examples
- ✅ Includes Python examples
- ✅ Contains OpenTelemetry integration code

### System Tests
- ✅ Health check returns service metadata
- ✅ Trace IDs in response body
- ✅ Trace IDs in response headers (`x-trace-id`)
- ✅ Trace ID consistency (body matches header)
- ✅ Response time < 3 seconds (TypeScript) / < 2 seconds (Bash)

### Error Handling Tests
- ✅ 401 for missing/invalid authentication
- ✅ 404 for non-existent resources
- ✅ 400 for invalid request bodies
- ✅ Error responses include error message

## Running in CI/CD

### GitHub Actions

The smoke tests run automatically on staging deployments via the `deploy-staging.yml` workflow:

```yaml
- name: Run smoke tests
  run: |
    cd services/mcp-server
    bun run smoke-test.ts \
      "${{ steps.vercel-deploy.outputs.preview-url }}" \
      "${{ secrets.STAGING_API_KEY }}"
```

### Manual CI Integration

For other CI systems:

```bash
# Install dependencies
bun install --frozen-lockfile

# Run smoke tests
cd services/mcp-server
bun run smoke-test https://your-staging-url.vercel.app $STAGING_API_KEY

# Exit code: 0 = all tests passed, 1 = some tests failed
```

## Local Testing

### Against Local Dev Server

```bash
# Terminal 1: Start dev server
cd services/mcp-server
PATTERN_API_KEY=test-api-key OTLP_ENDPOINT=http://localhost:4318/v1/traces bun run dev

# Terminal 2: Run smoke tests
bun run smoke-test http://localhost:3000 test-api-key
```

### Against Staging

```bash
# Get staging URL from Vercel
vercel ls

# Run tests
bun run smoke-test https://effect-patterns-mcp-server-xyz.vercel.app $STAGING_API_KEY
```

### Against Production

```bash
bun run smoke-test https://effect-patterns-mcp-server.vercel.app $PRODUCTION_API_KEY
```

## Interpreting Results

### Success Output

```
========================================
Effect Patterns MCP Server - Smoke Tests
========================================

ℹ Base URL: https://staging.example.com
ℹ API Key: staging-ke...

TEST: Health check endpoint (no auth required)
✓ Passed

...

========================================
Test Summary
========================================
Total Tests: 21
Passed: 21
Failed: 0

🎉 All smoke tests passed!
```

### Failure Output

```
TEST: Patterns endpoint accepts valid API key (header)
✗ Failed: Expected 200, got 500
ℹ Response: {"error":"Internal server error"}

...

========================================
Test Summary
========================================
Total Tests: 21
Passed: 19
Failed: 2

❌ Some tests failed
```

## Troubleshooting

### Tests Failing Locally But Passing in CI

**Possible Causes:**
- Environment variables not set locally
- Using different API key
- Local cache or stale dependencies

**Solution:**
```bash
# Set environment variables
export PATTERN_API_KEY=test-api-key
export OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Clear Next.js cache
rm -rf services/mcp-server/.next

# Rebuild and restart
bun run build
bun run dev
```

### Timeout Errors

**Possible Causes:**
- Slow network connection
- Cold start (first request to serverless function)
- Server not responding

**Solution:**
- Increase timeout threshold in smoke tests
- Run tests again (cold start only affects first request)
- Check server logs: `vercel logs --follow`

### Authentication Errors

**Possible Causes:**
- Wrong API key
- API key not set in Vercel environment variables
- API key environment variable name mismatch

**Solution:**
```bash
# Verify Vercel env vars
vercel env ls

# Re-set API key
vercel env add PATTERN_API_KEY staging
```

### OTLP Trace Errors

**Possible Causes:**
- Invalid OTLP endpoint
- Invalid OTLP headers JSON
- Network blocked to collector

**Solution:**
```bash
# Test OTLP endpoint manually
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-honeycomb-team: your-api-key" \
  -d '{"resourceSpans":[]}' \
  https://api.honeycomb.io/v1/traces

# Should return 200 OK
```

## Adding New Tests

### TypeScript

```typescript
await runTest("Description of test", async () => {
  const response = await fetch(`${baseUrl}/api/endpoint`, {
    headers: { "x-api-key": API_KEY },
  });

  assertEquals(response.status, 200);

  const data = await response.json();
  assertNotNull(data.someField);
  assert(data.someCondition, "Condition should be true");
});
```

### Bash

```bash
run_test \
    "Description of test" \
    "curl -s -w '\n%{http_code}' -H 'x-api-key: $API_KEY' '$BASE_URL/api/endpoint'" \
    "200" \
    "jq -e '.someField != null'"
```

## Best Practices

1. **Test Real Behavior**: Don't mock external services in smoke tests
2. **Keep Tests Independent**: Each test should be self-contained
3. **Test Error Cases**: Verify both success and failure paths
4. **Check Performance**: Include response time assertions
5. **Verify Observability**: Check trace IDs, logs, metrics
6. **Use Realistic Data**: Test with production-like API keys and endpoints
7. **Run on Every Deploy**: Automate smoke tests in CI/CD

## Related Documentation

- [DEPLOYMENT](../../docs/guides/DEPLOYMENT.md) - Full deployment guide
- [README.md](../../README.md) - Project overview
- [Integration Tests](./tests/integration/README.md) - Full integration test suite
