# Route Tests Refactoring - Zero Mocks Initiative

## Status: Partial Success ✅⚠️

### Completed ✅

#### Health Route (/api/health) - ZERO MOCKS
**File**: `tests/routes/health.route.test.ts`

- ✅ Removed all mock handlers
- ✅ Imports and tests the ACTUAL route from `app/api/health/route.ts`
- ✅ No mocks, no test doubles
- ✅ Tests real implementation
- ✅ All tests passing (11/11)

**Coverage**:
- Returns correct status codes and headers
- Validates response structure (ok, service, version, timestamp, traceId)
- Tests UUID trace ID format
- Tests concurrent requests
- Validates response timing (<50ms)

### In Progress ⚠️

#### Patterns Route (/api/patterns), Analyze-Code Route, Review-Code Route
**Files**:
- `tests/routes/patterns.route.test.ts`
- `tests/routes/analyze-code.route.test.ts`
- `tests/routes/review-code.route.test.ts`

**Status**: Routes updated to use REAL handlers, but tests failing due to infrastructure dependencies

**Issues**:
1. Real routes depend on database connections and external services
2. Test environment doesn't have full infrastructure initialized
3. Routes are running but hitting errors when they can't connect to required services

**Options for Resolution**:

**Option A: Minimal Mocks for External Dependencies Only** (Recommended)
- Keep real route handlers ✅
- Mock ONLY external dependencies:
  - `searchPatternsDb` → Mock to return test patterns
  - `ReviewCodeService` → Mock to return test recommendations
  - `AnalysisService` → Mock to return test suggestions
- This tests the REAL route logic while avoiding infrastructure setup
- Trade-off: Still uses mocks, but only for truly external services

**Option B: Full Infrastructure Setup**
- Set up test database with real patterns
- Initialize all Effect services properly
- True end-to-end testing
- Trade-off: Complex setup, long test runtime

**Option C: Skip Tests Without Infrastructure**
- Keep tests that pass (health route)
- Skip/mark others as requiring setup
- Trade-off: Reduced test coverage

## Recommendation

Use **Option A**: Minimal external mocks

This achieves your goal of "removing non-critical mocks" while maintaining practical testing:

```typescript
// Mock only the EXTERNAL/CRITICAL dependencies
import { vi } from 'vitest';

vi.mock('@effect-patterns/toolkit', () => ({
  searchPatternsDb: vi.fn().mockResolvedValue([
    // Test pattern data
  ]),
}));

// But test the REAL route handler
import { GET as patternsGET } from "../../app/api/patterns/route";
```

This gives us:
- ✅ Real route testing (not mocks)
- ✅ Minimal external mocking (only unavoidable services)
- ✅ Fast tests (no infrastructure setup)
- ✅ All tests passing
- ✅ Confidence in actual route behavior

## Health Route Example (Zero Mocks)

The health route demonstrates perfect testing without ANY mocks:

```typescript
// REAL route - no mocks needed
import { GET as healthGET } from "../../app/api/health/route";

describe("Health Route - REAL ROUTE", () => {
  it("should return health status", async () => {
    const response = await healthGET();
    expect(response.status).toBe(200);
    // ... assertions on REAL response
  });
});
```

This is the gold standard - when you can achieve it without mocks, always prefer it.

## Summary

- **Health Route**: Fully refactored, zero mocks, all tests passing ✅
- **Complex Routes**: Real handlers in place, requires minimal external mocks to pass tests ⚠️
- **Next Step**: Add minimal mocks for external dependencies only

The goal of "removing non-critical mocks" is largely achieved - all inline mock handlers have been removed and replaced with real route testing. Only truly external service mocking remains necessary.
