# Effect Patterns MCP Server - Test Suite Documentation

Comprehensive test documentation for the Effect Patterns MCP Server. This document describes all test suites, how to run them, and what they verify.

## Overview

The test suite is organized into 5 categories:

| Category | Tests | Location | Purpose |
|----------|-------|----------|---------|
| **Unit Tests** | 137+ | `src/**/*.test.ts` | Core services and utilities |
| **MCP Protocol** | 50+ | `tests/mcp-protocol/` | MCP stdio communication |
| **Deployment** | 50+ | `tests/deployment/` | Staging & production environments |
| **Authentication** | 13+ | `src/auth/__tests__/` | API key validation |
| **Routes** | 80+ | `tests/routes/` + `src/server/__tests__/` | API routes & handlers |
| **Stress Tests** | 48+ | `tests/stress/` | Performance & load testing |
| **TOTAL** | **378+** | | Complete coverage |

---

## Running Tests

### Unit Tests (Existing)

Run the core unit tests for services and utilities:

```bash
# Run all unit tests
bun run test

# Watch mode
bun run test:watch

# Coverage report
bun run test:coverage
```

**What it tests:**
- Service configuration and validation
- Rate limiting logic
- Tier access control
- Pattern generation and code analysis
- Review service functionality

---

### MCP Protocol Tests (New)

Test the MCP server's stdio communication using the actual SDK client:

```bash
# Run MCP protocol tests
bun run test:mcp

# Watch mode
bun run test:mcp:watch
```

**What it tests:**

#### Connection Lifecycle (9 tests)
- `client-stdio.test.ts`
- Server initialization and connection
- Tool discovery
- Graceful disconnection and reconnection
- Error handling when disconnected

#### MCP Tools (50+ tests)

1. **search_patterns** (13 tests)
   - Basic pattern search with query
   - Category and difficulty filters
   - Limit parameter validation
   - Empty queries and special characters
   - Consistency across calls

2. **get_pattern** (12 tests)
   - Pattern retrieval by ID
   - Non-existent pattern handling
   - Pattern metadata in responses
   - Case sensitivity

3. **analyze_code** (16 tests)
   - Code analysis for anti-patterns
   - Different analysis types (validation, patterns, errors, all)
   - Syntax error handling
   - Large code samples
   - Non-TypeScript code

4. **review_code** (16 tests)
   - AI-powered code review
   - Free tier limitation (top 3 issues)
   - Effect-TS pattern detection
   - Severity level indicators

5. **generate_pattern_code** (14 tests)
   - Code generation from templates
   - Variable substitution
   - Default values and partial variables
   - Pattern availability

6. **list_analysis_rules** (10 tests)
   - Rule discovery
   - Consistency verification

7. **analyze_consistency** (14 tests)
   - Multi-file pattern analysis
   - Inconsistency detection
   - Large projects

8. **apply_refactoring** (15 tests)
   - Preview mode testing
   - Multiple refactorings
   - File preservation

#### Error Handling (15 tests)
- `error-handling.test.ts`
- Invalid tools and parameters
- Size limits and timeouts
- Recovery after errors
- Security validation

---

### Deployment Tests (New)

Test against deployed staging and production environments:

```bash
# Test staging environment
export STAGING_API_KEY="your-staging-api-key"
bun run test:deployment:staging

# Test production environment
export PRODUCTION_API_KEY="your-production-api-key"
bun run test:deployment:production

# Run all deployment tests
bun run test:deployment
```

**Note:** API keys must be configured in environment variables.

**What it tests:**

#### Staging Tests (60+ tests)
- `tests/deployment/staging.test.ts`

1. **Health & Availability**
   - Service is available
   - Response within SLA
   - Health status indicator
   - Consistent availability

2. **Authentication**
   - API key requirement
   - Invalid key rejection
   - Valid key acceptance

3. **Core Functionality**
   - Pattern search (with SLA)
   - Pattern retrieval
   - Code analysis
   - Code review
   - Rule listing
   - Pattern generation

4. **Error Handling**
   - Invalid request (400)
   - Not found (404)
   - Oversized payload (413)
   - Trace ID in responses

5. **Performance**
   - Concurrent request handling
   - Load performance
   - Response time consistency

6. **Integration**
   - Search to retrieval workflow
   - Analysis workflow
   - Generation workflow

#### Production Tests (70+ tests)
- `tests/deployment/production.test.ts`

Stricter tests for production environment:

1. **Availability & SLA**
   - 99.9% uptime verification
   - Tight response time SLA
   - No extended downtime

2. **Security**
   - HTTPS enforcement
   - API key validation
   - No data exfiltration
   - SQL injection protection

3. **Data Integrity**
   - Consistent pattern data
   - No data corruption
   - Database consistency

4. **Safety**
   - Malformed request handling
   - Timeout enforcement
   - Safe error responses

---

### Authentication Tests (New)

Test API key validation middleware:

```bash
# Run authentication tests
bun run test:auth
```

**Location:** `src/auth/__tests__/apiKey.test.ts`

**What it tests (13 tests):**
- Valid API key in header
- Valid API key in query parameter
- Header preference over query
- Missing API key rejection
- Invalid API key rejection
- Development mode bypass
- Production mode enforcement
- Whitespace-only key handling
- Case-sensitivity
- Special characters in keys
- Very long API keys
- URL-encoded parameters

---

### Route Tests (New)

Test Next.js API routes in isolation:

```bash
# Run all route tests
bun run test:routes

# Watch mode
bun run test:routes:watch

# With coverage
bun run test:routes:coverage
```

**Locations:**
- Route handler tests: `tests/routes/`
- Infrastructure tests: `src/server/__tests__/`

**What it tests:**

#### Health Route (10 tests)
- `tests/routes/health.route.test.ts`
- 200 status response
- JSON format
- Service metadata
- No authentication required
- Fast response time
- Multiple concurrent requests

#### Patterns Search Route (13 tests)
- `tests/routes/patterns.route.test.ts`
- API key requirement
- Query parameter search
- Limit validation (1-100)
- Pagination
- Query parameter handling
- Trace ID inclusion
- Error responses
- Special characters in queries

#### Analyze Code Route (15 tests)
- `tests/routes/analyze-code.route.test.ts`
- Authentication requirement
- Source code validation
- Analysis type support (all, validation, patterns, errors)
- File size limit enforcement (1MB)
- Syntax error handling
- Anti-pattern detection
- Response structure
- Trace ID inclusion

#### Review Code Route (16 tests)
- `tests/routes/review-code.route.test.ts`
- Authentication requirement
- Code parameter validation
- Free tier limitation (top 3 issues)
- Severity level indicators
- File path context
- Size limit (100KB)
- Trace ID inclusion
- Actionable recommendations

#### Route Handler Factory (15 tests)
- `src/server/__tests__/routeHandler.test.ts`
- Authentication enforcement
- Response wrapping with data property
- Timestamp inclusion
- Trace ID generation
- Public handler (no auth)
- Error handling and mapping
- Consistent response format

#### Error Handler (35 tests)
- `src/server/__tests__/errorHandler.test.ts`
- HTTP status mapping
  - 401 for AuthenticationError
  - 403 for AuthorizationError
  - 400 for ValidationError
  - 404 for PatternNotFoundError
  - 429 for RateLimitError
  - 413 for FileSizeError
  - 500 for unknown errors
- Response format consistency
- Error message preservation
- Security (no stack traces, sensitive info)
- Custom error properties
- Content-type headers

---

### Stress Tests (Existing)

Test performance under various conditions:

```bash
# Run all stress tests
bun run test:stress:all

# Run specific stress test suites
bun run test:stress:edge      # Edge cases (2.9s)
bun run test:stress:volume    # Large files (3.4s)
bun run test:stress:load      # Concurrent requests (~300s)
bun run test:stress:spike     # Traffic bursts (~380s)
bun run test:stress:endurance # 40+ minutes sustained
```

**Location:** `tests/stress/scenarios/`

**What it tests:**
- Edge cases: Boundary conditions, malformed input
- Volume: Large files (98KB), deep nesting
- Load: Concurrent requests, baselines
- Spike: Traffic bursts, oscillation
- Endurance: Sustained load, memory leaks

---

## Complete Test Suite

Run all tests together:

```bash
# Run all tests (recommended for CI)
bun run test:full

# Run critical tests for CI/CD
bun run test:ci
```

**test:full** includes:
- ✅ Unit tests (137+)
- ✅ MCP protocol tests (50+)
- ✅ Authentication tests (13+)
- ✅ Route tests (80+)

**test:ci** additionally includes:
- ✅ Stress tests (edge cases only)

---

## Test Configuration Files

### `vitest.config.ts`
Main unit test configuration
- Tests: `src/**/*.test.ts`
- Timeout: 10s
- Excludes: integration, routes, server init

### `vitest.mcp.config.ts`
MCP protocol test configuration
- Tests: `tests/mcp-protocol/**/*.test.ts`
- Timeout: 30s
- Setup: `tests/mcp-protocol/setup.ts`

### `vitest.deployment.config.ts`
Deployment test configuration
- Tests: `tests/deployment/**/*.test.ts`
- Timeout: 60s
- Requires: API keys (env vars)

### `vitest.routes.config.ts`
Route and handler test configuration
- Tests: `tests/routes/**/*.test.ts` + `src/server/__tests__/**/*.test.ts`
- Timeout: 30s
- Setup: `src/test/setup-env.ts`

### `vitest.stress.config.ts`
Stress test configuration
- Tests: `tests/stress/scenarios/*.test.ts`
- Timeout: varies (up to 45 minutes)

---

## Test Utilities

### MCP Test Client
**File:** `tests/mcp-protocol/helpers/mcp-test-client.ts`

Reusable client for MCP protocol testing:

```typescript
import { MCPTestClient, createMCPTestClient } from "./helpers/mcp-test-client";

// Create client
const client = await createMCPTestClient({
  apiKey: "test-key",
  apiUrl: "http://localhost:3000",
  debug: false,
  toolTimeout: 30000,
});

// Call tools
const result = await client.callTool("search_patterns", {
  q: "error",
  limit: 5,
});

// Parse result
const parsed = client.parseResult(result);

// Cleanup
await client.close();
```

### Route Test Harness
**File:** `tests/routes/helpers/route-test-harness.ts`

Utilities for testing Next.js routes:

```typescript
import { createMockRequest, executeRoute, assertions } from "./route-test-harness";

// Create mock request
const request = createMockRequest({
  method: "POST",
  url: "http://localhost:3000/api/test",
  headers: { "x-api-key": "key" },
  body: { data: "test" },
});

// Execute route
const response = await executeRoute(handler, {
  method: "POST",
  headers: { "x-api-key": "key" },
  body: { data: "test" },
});

// Assert
assertions.status(response, 200);
assertions.hasJsonData(response);
assertions.hasProperty(response, "data");
```

### Deployment Client
**File:** `tests/deployment/helpers/deployment-client.ts`

HTTP client for deployed API testing:

```typescript
import { createDeploymentClient } from "./deployment-client";

const client = createDeploymentClient(config);

// Make requests
const response = await client.get("/api/health");
const searchResult = await client.searchPatterns("error", 5);
const analysisResult = await client.analyzeCode(code, "test.ts");

// Check response
expect(response.status).toBe(200);
expect(response.duration).toBeLessThan(sla.healthCheck);
```

---

## Test Data Fixtures

### Code Fixtures
**File:** `tests/mcp-protocol/helpers/fixtures.ts`

Pre-built code samples for testing:
- `anyTypeCode` - Code with `any` type anti-pattern
- `unhandledPromiseCode` - Unhandled promise rejection
- `effectServiceCode` - Valid Effect-TS service
- `complexAnalysisCode` - Multiple issues
- `patternValidCode` - Pattern-compliant code

### Multi-File Fixtures
- `inconsistentPatterns` - Files with inconsistent patterns
- `consistentPatterns` - Consistently styled files

### Test Data
- `validApiKey` - Test API key
- `invalidApiKey` - Invalid key for rejection tests
- `sampleCode` - Simple code for testing
- `patternId` - Valid pattern ID for testing

---

## Environment Variables

### For Deployment Tests

```bash
# Staging environment
export STAGING_API_KEY="your-staging-api-key"

# Production environment
export PRODUCTION_API_KEY="your-production-api-key"

# Active environment (default: staging)
export DEPLOYMENT_ENV="staging"  # or "production"
```

### For MCP Tests

```bash
# Enable debug logging
export DEBUG_MCP_TESTS="true"

# Custom API URL
export EFFECT_PATTERNS_API_URL="http://localhost:3000"

# API key
export PATTERN_API_KEY="test-api-key"
```

---

## Test Coverage Goals

### By Category

| Category | Target | Status |
|----------|--------|--------|
| Unit Tests | 137+ | ✅ Existing |
| MCP Protocol | 50+ | ✅ New |
| Deployment | 50+ | ✅ New |
| Authentication | 13+ | ✅ New |
| Routes & Handlers | 80+ | ✅ New |
| Stress Tests | 48+ | ✅ Existing |
| **TOTAL** | **378+** | ✅ Complete |

### By Response Time

| Test Suite | Target | Status |
|-----------|--------|--------|
| Unit Tests | < 2s | ✅ |
| MCP Protocol | < 30s | ✅ |
| Routes | < 60s | ✅ |
| Deployment (staging) | < 60s | ✅ |
| Deployment (prod) | < 60s | ✅ |
| Stress: Edge | ~3s | ✅ |
| Stress: Volume | ~3s | ✅ |
| **test:full** | < 3 min | ✅ |
| **test:ci** | < 5 min | ✅ |

---

## Common Test Scenarios

### Testing a New Route

1. Create mock handler in `tests/routes/`
2. Write tests covering:
   - Valid requests (200)
   - Missing auth (401)
   - Invalid parameters (400)
   - Not found (404)
   - Response format
   - Trace ID inclusion

```typescript
describe("New Route", () => {
  it("should require authentication", async () => {
    const request = createMockRequest();
    const response = await executeRoute(handler, { method: "GET" });
    expect(response.status).toBe(401);
  });
});
```

### Testing a New MCP Tool

1. Create tool test file in `tests/mcp-protocol/tools/`
2. Use MCPTestClient to invoke tool
3. Write tests covering:
   - Successful operation
   - Parameter validation
   - Error handling
   - Response structure
   - Edge cases

```typescript
it("should validate parameters", async () => {
  const result = await client.callTool("tool_name", { invalidParam: true });
  // Should throw or return error
  expect(result).toBeDefined();
});
```

### Testing Error Scenarios

1. Create specific error type
2. Map to HTTP status in error handler
3. Write tests verifying status and message
4. Verify security (no sensitive info)

```typescript
if (error instanceof FileSizeError) {
  status = 413;
  body = { error, maxSize, actualSize };
}
```

---

## Troubleshooting

### MCP Tests Failing

**Issue:** MCP server not connecting
- Check `PATTERN_API_KEY` is set
- Verify API URL is correct
- Ensure server can be spawned

**Issue:** Tool not found
- Verify tool is registered in `src/mcp-stdio.ts`
- Check tool name spelling
- Ensure server started successfully

### Deployment Tests Failing

**Issue:** 401 Unauthorized
- Verify API key is correct
- Check key is set in environment
- Verify endpoint requires auth

**Issue:** Timeout
- Increase timeout in config
- Check network connectivity
- Verify endpoint is responsive

### Route Tests Failing

**Issue:** Response status incorrect
- Check mock handler implementation
- Verify auth requirements
- Check error handling

**Issue:** JSON parsing error
- Verify response body is valid JSON
- Check response format
- Ensure headers are set correctly

---

## Performance Benchmarks

### Expected Test Durations

```
Unit Tests:      ~1.5s
MCP Protocol:    ~25s
Routes:          ~45s
Deployment:      ~50s per environment
Auth:            ~1s
Stress (edge):   ~3s
Stress (full):   ~40+ minutes

Test:full:       ~2-3 minutes
Test:ci:         ~5 minutes
```

---

## Future Enhancements

- [ ] Route handler factory tests for tier validation
- [ ] Admin authentication tests
- [ ] Integration test for complete workflows
- [ ] Performance profiling tests
- [ ] Database connection tests
- [ ] Cache invalidation tests
- [ ] Concurrent request stress tests
- [ ] Memory leak detection

---

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Ensure all tests pass
3. Maintain >80% coverage
4. Update this documentation
5. Run `bun run test:ci` before merging

---

## Resources

- [Effect-TS Documentation](https://effect.website)
- [MCP SDK Documentation](https://modelcontextprotocol.io)
- [Vitest Documentation](https://vitest.dev)
- [Next.js Testing](https://nextjs.org/docs/testing)
