# HTTP Server Test Architecture Updates

This document summarizes the updates made to HTTP server tests to reflect the new pure transport architecture.

## Architecture Summary

```
MCP Server (pure transport)     HTTP API (all auth + business logic)
─────────────────────────────   ────────────────────────────────────
- No auth validation            - API key validation (401)
- Optional API key              - Tier validation (402 Payment Required)
- Passes requests through       - Business logic
- Returns errors as values      - Rate limiting
```

**Key Principle:** All authentication and authorization happens at the HTTP API level. MCP server is a pure transport layer.

## Test Files Updated

### 1. Route Handler Tests

**File:** `src/server/__tests__/routeHandler.test.ts`

**Changes:**
- Added architecture comment clarifying HTTP API handles all auth
- Added tier validation tests:
  - Test for 402 Payment Required on free tier for paid endpoints
  - Test for paid tier allowing paid endpoints
  - Test for auth check before tier check

**New Tests:**
- `should return 402 for paid tier endpoints on free tier`
- `should allow paid tier endpoints on paid tier`
- `should require auth before checking tier`

### 2. Error Handler Tests

**File:** `src/server/__tests__/errorHandler.test.ts`

**Changes:**
- Added architecture comment
- Added `TierAccessError` class to mock errors
- Added 402 Payment Required status mapping
- Added tier access error tests

**New Tests:**
- `should map TierAccessError to 402`
- `should handle paid tier endpoint on free tier`
- `should include tier information in response`

### 3. Route Test Files

**Files Updated:**
- `tests/routes/patterns.route.test.ts`
- `tests/routes/analyze-code.route.test.ts`
- `tests/routes/review-code.route.test.ts`
- `tests/routes/health.route.test.ts`
- `tests/routes/helpers/route-test-harness.ts`

**Changes:**
- Added architecture comments to all route test files
- Clarified that HTTP API handles all authentication
- Documented that MCP server is pure transport

### 4. Authentication Tests

**File:** `src/auth/__tests__/apiKey.test.ts`

**Changes:**
- Added architecture comment clarifying HTTP API handles auth
- Tests already correctly verify HTTP API authentication logic

### 5. Tier Service Tests

**File:** `src/services/tier/__tests__/tier.test.ts`

**Changes:**
- Added architecture comment
- Clarified that tier validation is used by HTTP API route handlers
- Tests already correctly verify tier service logic

### 6. Deployment Tests

**Files Updated:**
- `tests/deployment/staging.test.ts`
- `tests/deployment/production.test.ts`

**Changes:**
- Added architecture comments
- Clarified that HTTP API handles all auth and tier validation

## Test Coverage

### Authentication Tests
- ✅ HTTP API validates API key (401 for missing/invalid)
- ✅ HTTP API accepts valid API key
- ✅ Development mode allows requests without key

### Tier Validation Tests
- ✅ HTTP API returns 402 for paid endpoints on free tier
- ✅ HTTP API allows paid endpoints on paid tier
- ✅ Auth check happens before tier check

### Error Handling Tests
- ✅ TierAccessError maps to 402 Payment Required
- ✅ Error responses include tier information
- ✅ Upgrade messages included in tier errors

## What Tests Verify

1. **HTTP API is the source of truth for auth:**
   - All route tests verify API key validation at HTTP level
   - No tests assume MCP server validates auth

2. **Tier validation happens at HTTP API:**
   - Route handler tests verify tier checks
   - Error handler tests verify 402 responses
   - Tier service tests verify tier logic

3. **MCP server is pure transport:**
   - MCP protocol tests verify MCP doesn't validate auth
   - MCP tests verify errors are returned as values

## No Changes Needed

The following test files are already correct and don't need updates:
- Unit tests for individual services (they test business logic)
- Integration tests (they test HTTP API behavior)
- Stress tests (they test HTTP API performance)

## Testing the Architecture

To verify the architecture is correct:

```bash
# Test HTTP API auth (should pass)
bun run test:auth

# Test HTTP API routes (should pass)
bun run test:routes

# Test MCP protocol (should pass - MCP is pure transport)
bun run test:mcp

# Test tier validation (should pass)
bun run test
```

All tests should pass, confirming:
- HTTP API handles all authentication
- HTTP API handles all tier validation
- MCP server is pure transport
