# Testing Strategy

## No-Mock Policy

This repository follows a **no behavioral mock** testing strategy. Tests should use real dependencies with test configuration instead of `vi.mock()`, `vi.spyOn()`, or `vi.fn()`.

### Forbidden Patterns

The following are flagged by `bun run test:policy`:

- `vi.mock()` — module-level mocking
- `vi.spyOn()` — spy-based mocking
- `vi.fn()` — mock function creation
- `.toHaveBeenCalled()` / `.toHaveBeenCalledWith()` — call verification
- `.mockImplementation()` / `.mockReturnValue()` / `.mockResolvedValue()` / `.mockRejectedValue()` — mock behavior

### Preferred Alternatives

| Instead of | Use |
|---|---|
| `vi.spyOn(globalThis, "fetch")` | Real HTTP fixture server (`test/fixture-server.ts`) |
| `vi.mock("node:fs/promises")` | Real temp directories with `withTempDir()` |
| `vi.mock("node:child_process")` | Real scripts in temp directories |
| `vi.spyOn(console, "log")` | `captureConsole()` helper (replaces console methods, not spies) |
| `vi.fn()` for call tracking | Plain arrays or counters (`calls.push(...)`) |
| `Layer.succeed(Service, { method: vi.fn() })` | `Layer.succeed(Service, { method: () => Effect.void })` with tracking array |

### Structural Exceptions

Some tests legitimately need module-level mocking (e.g., isolating service layers from shell commands, mocking external databases). These are documented with:

```typescript
// Per-line exception (on line above violation):
// test-policy-ignore: <reason>
vi.mock("../helpers.js", () => ({ ... }));

// File-level exception (in first 10 lines):
// test-policy-ignore-file: <reason>
```

### Current Structural Exceptions

| File | Reason |
|---|---|
| `ep-admin/services/git/__tests__/git.test.ts` | Isolates service layer from shell commands |
| `ep-admin/services/git/__tests__/helpers.test.ts` | Mocks execSync to test git wrappers without real repo |
| `ep-admin/services/db/__tests__/service.test.ts` | Mocks toolkit to avoid requiring real database |
| `ep-admin/__tests__/generate-from-db.test.ts` | Mocks skill generator and DB repos for pipeline orchestration |
| `ep-admin/__tests__/integration/lock-unlock.integration.test.ts` | Uses vi.spyOn on Display static methods for structure validation |

### Shared Test Helpers

- `packages/ep-cli/src/test/helpers.ts` — `withTempDir()`, `captureConsole()`
- `packages/ep-cli/src/test/fixture-server.ts` — HTTP fixture server for fetch tests
- `packages/ep-admin/src/test/helpers.ts` — `withTempDir()`, `captureConsole()`

### Running the Policy Check

```bash
bun run test:policy
```

This scans all test files in `ep-cli`, `ep-admin`, and `toolkit` for forbidden mock patterns.
