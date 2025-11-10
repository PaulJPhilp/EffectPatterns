# MCP Server Testing Guide

## Test Organization

The MCP server has two types of tests:

### 1. Unit Tests (Default)

**Location:** `src/*.test.ts`
**Command:** `bun test` or `bun run test:unit`
**Status:** ✅ All passing (33 tests)

Unit tests verify individual services and components in isolation:
- Configuration service
- Logger service
- Cache service
- Validation service
- Rate limiting service
- Metrics service
- Error types

These tests run quickly and don't require any external dependencies.

### 2. Integration Tests

**Location:** `tests/integration/*.test.ts`
**Command:** `bun run test:integration`
**Status:** ⏭️ Skipped by default (require running server)

Integration tests verify the full API endpoints end-to-end:
- Authentication flow
- Pattern search and retrieval
- Code generation
- Trace wiring examples
- OTLP trace export
- Error handling

**Requirements:**
- Running Next.js dev server (`bun run dev`) or production server
- Set `TEST_BASE_URL` env var (default: `http://localhost:3000`)
- Set `PATTERN_API_KEY` env var for authentication tests

## Running Tests

### Quick Test (Unit Tests Only)

```bash
bun test
```

This runs all unit tests and skips integration tests.

### All Tests (Including Integration)

**Option 1: Against Local Server**

```bash
# Terminal 1: Start the server
bun run dev

# Terminal 2: Run all tests
export PATTERN_API_KEY="your-api-key"
bun run test:integration
```

**Option 2: Against Production**

```bash
export TEST_BASE_URL="https://mcp-server-three-omega.vercel.app"
export PATTERN_API_KEY="your-production-api-key"
bun run test:integration
```

### Watch Mode (Unit Tests)

```bash
bun run test:watch
```

### Coverage

```bash
bun run test:coverage
```

## Test Configuration

### Unit Tests (`vitest.config.ts`)

```typescript
{
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/tests/integration/**',  // Skip integration tests
    ],
    testTimeout: 10_000,
  }
}
```

### Integration Tests (`vitest.integration.config.ts`)

```typescript
{
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30_000,  // Longer timeout for API calls
    hookTimeout: 30_000,
  }
}
```

## CI/CD Integration

For CI pipelines, you have two options:

### Option 1: Unit Tests Only (Recommended)

```yaml
- name: Run Tests
  run: bun test
```

This is fast and doesn't require deploying the app first.

### Option 2: Full Integration Tests

```yaml
- name: Build and Start Server
  run: |
    bun run build
    bun run start &
    sleep 5  # Wait for server to start

- name: Run Integration Tests
  env:
    TEST_BASE_URL: http://localhost:3000
    PATTERN_API_KEY: ${{ secrets.PATTERN_API_KEY }}
  run: bun run test:integration
```

This provides full coverage but takes longer and requires deployment.

## Test Structure

### Unit Test Example

```typescript
import { Effect } from 'effect';
import { describe, it, expect } from 'vitest';
import { MCPConfigService, MCPConfigServiceLive } from './services/config.js';

describe('MCPConfigService', () => {
  it('should provide configuration values', async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const config = yield* MCPConfigService;
        const apiKey = yield* config.getApiKey();
        return apiKey;
      }).pipe(Effect.provide(MCPConfigServiceLive))
    );

    expect(result).toBe('test-api-key');
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.PATTERN_API_KEY || 'test-api-key';

describe('API Integration', () => {
  it('should search patterns', async () => {
    const response = await fetch(`${BASE_URL}/api/patterns`, {
      headers: { 'x-api-key': API_KEY },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.patterns).toBeDefined();
  });
});
```

## Test Results Summary

| Test Suite | Tests | Status |
|------------|-------|--------|
| Unit Tests | 33 | ✅ All passing |
| Integration Tests | 39 | ⏭️ Skipped (require server) |
| **Total** | **72** | **33 passing, 39 skipped** |

## Troubleshooting

### "ENOENT reading node_modules/effect"

This means the workspace dependencies aren't properly linked. Fix:

```bash
cd /path/to/Effect-Patterns
bun install
```

### "Test timed out after 5000ms"

Integration tests are running but no server is available. Either:
1. Start a local server: `bun run dev`
2. Skip integration tests: Use `bun test` instead of `bun run test:integration`

### "401 Unauthorized"

Set the correct API key:

```bash
export PATTERN_API_KEY="your-api-key"
```

## Contributing

When adding new features:

1. **Always add unit tests** for services and utilities
2. **Add integration tests** for new API endpoints
3. **Run unit tests before committing**: `bun test`
4. **Verify integration tests locally** before pushing

## References

- [Vitest Documentation](https://vitest.dev/)
- [Effect Testing Guide](https://effect.website/docs/guides/testing)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing)

