# EffectTalk Implementation Action Plan

**Date:** January 17, 2026
**Status:** Ready for execution
**Total Duration:** 3-4 weeks
**Total Effort:** 120-140 developer hours

---

## Executive Summary

This action plan prioritizes work to achieve production readiness for EffectTalk. It's organized into four phases spanning 3-4 weeks, with clear milestones, dependencies, and success criteria.

**Critical Path:** ProcessService → PersistenceService → Tests → Validation → Release

---

## PHASE 1: Foundation (Week 1) - 40-50 hours

### Goals
- ✅ Fix critical architectural bugs
- ✅ Implement core ProcessService functionality
- ✅ Restore state synchronization
- ✅ Get basic testing infrastructure working
- ✅ Application is functionally viable

### Deliverables
- [ ] ProcessService with real node-pty spawning
- [ ] Working PersistenceService with session I/O
- [ ] Unified Effect.Ref-based state management
- [ ] Basic test fixtures and helpers
- [ ] Error boundaries in React

---

## Phase 1.1: Fix PersistenceService (4-6 hours)

### 🔴 Critical Issue
**File:** `src/services/PersistenceService.ts` (lines 16-101)
**Problem:** Nested duplicate class definition, all methods are stubs

### Implementation Steps

**Step 1: Remove Nested Class (0.5h)**
```typescript
// DELETE lines 16-101 (the entire inner generator with nested class)
// KEEP the outer class shell at lines 11-114

// Current (WRONG):
export class PersistenceService extends Effect.Service<PersistenceService>(
  "PersistenceService",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      import { Effect } from "effect";  // ❌ DELETE THIS BLOCK
      // ... nested class definition ... ❌ DELETE
      return { stub methods };  // ❌ DELETE
    }),
  },
) { }

// Correct structure:
export class PersistenceService extends Effect.Service<PersistenceService>()(
  "PersistenceService",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const logger = yield* LoggerService;
      const config = yield* ConfigService;

      return {
        saveSession: (session: Session) => { ... },
        loadSession: (sessionId: string) => { ... },
        // ... other methods
      };
    }),
    dependencies: [LoggerService.Default, ConfigService.Default],
  },
) { }
```

**Step 2: Import at Top (0.5h)**
```typescript
import { Effect, Ref } from "effect";
import type { Session } from "../types";
import { PersistenceError } from "../types";
import { LoggerService } from "./LoggerService";
import { ConfigService } from "./SessionStore";
```

**Step 3: Implement Methods (3-4h)**

**saveSession:**
```typescript
saveSession: (session: Session) =>
  Effect.gen(function* () {
    const config = yield* ConfigService;
    const storePath = config.get("sessionStorePath");

    // Expand ~ to home directory
    const expandedPath = storePath.replace("~", process.env.HOME || "/");
    const sessionFile = `${expandedPath}/${session.id}.json`;

    yield* logger.info(`Saving session: ${session.id}`);

    // Validate session with schema
    const validSession = yield* Schema.parse(SessionSchema)(session);

    // Write to file
    try {
      const json = JSON.stringify(validSession, null, 2);
      yield* Effect.sync(() => {
        // Use node fs synchronously or async with Effect.fromPromise
        require('fs').writeFileSync(sessionFile, json);
      });
      yield* logger.debug(`Session saved to: ${sessionFile}`);
    } catch (cause) {
      yield* Effect.fail(
        new PersistenceError({
          operation: "write",
          path: sessionFile,
          cause,
        }),
      );
    }
  }),
```

**loadSession:**
```typescript
loadSession: (sessionId: string) =>
  Effect.gen(function* () {
    const config = yield* ConfigService;
    const storePath = config.get("sessionStorePath");
    const expandedPath = storePath.replace("~", process.env.HOME || "/");
    const sessionFile = `${expandedPath}/${sessionId}.json`;

    yield* logger.debug(`Loading session: ${sessionId}`);

    try {
      const json = require('fs').readFileSync(sessionFile, 'utf-8');
      const parsed = JSON.parse(json);
      const session = yield* Schema.parse(SessionSchema)(parsed);
      return session;
    } catch (cause) {
      yield* Effect.fail(
        new PersistenceError({
          operation: "read",
          path: sessionFile,
          cause,
        }),
      );
    }
  }),
```

**Other methods:** listSessions, deleteSession, getLastSession, exportSession, importSession

### Testing
```typescript
// Create: src/services/__tests__/PersistenceService.test.ts
describe("PersistenceService", () => {
  test("saveSession writes to file", async () => {
    const session = createMockSession();
    const result = await runEffect(persistenceService.saveSession(session));
    expect(fs.existsSync(sessionPath)).toBe(true);
  });

  test("loadSession reads from file", async () => {
    // Create file first
    const session = createMockSession();
    await runEffect(persistenceService.saveSession(session));

    // Load it
    const loaded = await runEffect(
      persistenceService.loadSession(session.id)
    );
    expect(loaded).toEqual(session);
  });
});
```

### Checklist
- [ ] Remove nested class definition
- [ ] Move imports to top
- [ ] Implement all 7 methods
- [ ] Add error handling with PersistenceError
- [ ] Add test cases
- [ ] Verify with manual test

---

## Phase 1.2: Implement ProcessService with node-pty (12-16 hours)

### 🔴 Critical Issue
**File:** `src/services/ProcessService.ts`
**Problem:** Mock implementation with hardcoded output

### Setup (1h)
```bash
npm install node-pty @types/node-pty
```

### Implementation Steps

**Step 1: Update ProcessHandle Interface (0.5h)**
```typescript
import * as pty from 'node-pty';

export interface ProcessHandle {
  readonly pid: number;
  readonly command: string;
  readonly cwd: string;
  readonly pty: pty.IPty;  // Add PTY reference
}

interface ProcessState {
  pid: number;
  command: string;
  cwd: string;
  pty: pty.IPty;
  isRunning: boolean;
}
```

**Step 2: Implement spawn Method (3-4h)**
```typescript
spawn: (command: string, cwd: string, env: Record<string, string>) =>
  Effect.acquireRelease(
    // Acquisition
    Effect.gen(function* () {
      yield* logger.info(`Spawning process: ${command} in ${cwd}`);

      try {
        const spawnEnv = { ...process.env, ...env };
        const newPty = pty.spawn(command, [], {
          name: 'xterm-256color',
          cols: 80,
          rows: 24,
          cwd,
          env: spawnEnv as Record<string, string>,
        });

        const handle: ProcessHandle = {
          pid: newPty.pid,
          command,
          cwd,
          pty: newPty,
        };

        processes.set(newPty.pid, {
          pid: newPty.pid,
          command,
          cwd,
          pty: newPty,
          isRunning: true,
        });

        yield* logger.debug(`Process spawned with PID ${newPty.pid}`);
        return handle;
      } catch (cause) {
        yield* Effect.fail(
          new ProcessError({
            reason: "spawn-failed",
            cause,
          }),
        );
      }
    }),
    // Release (cleanup)
    (handle) =>
      Effect.sync(() => {
        const process = processes.get(handle.pid);
        if (process && process.pty) {
          try {
            process.pty.kill('SIGTERM');
          } catch (e) {
            // Already dead
          }
        }
        processes.delete(handle.pid);
        yield* logger.debug(`Cleaned up process ${handle.pid}`);
      }),
  ),
```

**Step 3: Implement Stream Creation (4-5h)**
```typescript
recordStream: (pid: number, streamType: "stdout" | "stderr") =>
  Effect.gen(function* () {
    const process = processes.get(pid);
    if (!process) {
      yield* logger.warn(`Process ${pid} not found for stream`);
      return Stream.empty<string>();
    }

    yield* logger.debug(`Attaching ${streamType} stream to process ${pid}`);

    // For PTY, both stdout and stderr come from pty.onData
    // In a real shell, we'd distinguish between them
    // For now, use pty output for both

    return Stream.fromAsyncIterable(
      (async function* () {
        for await (const data of process.pty) {
          yield data.toString();
        }
      })(),
    );
  }),
```

**Step 4: Signal Handling (3-4h)**
```typescript
interrupt: (pid: number) =>
  Effect.gen(function* () {
    const process = processes.get(pid);
    if (!process) {
      yield* logger.warn(`Process ${pid} not found for interrupt`);
      return;
    }

    yield* logger.info(`Interrupting process ${pid}`);
    try {
      process.pty.kill('SIGINT');
      // Wait for process to exit
      yield* Effect.sleep(100);
      if (process.pty.pid > 0) {
        process.pty.kill('SIGTERM');
      }
    } catch (cause) {
      yield* logger.error(`Failed to interrupt ${pid}`, cause);
    }
  }),

terminate: (pid: number, signal: NodeJS.Signals = "SIGTERM") =>
  Effect.gen(function* () {
    const process = processes.get(pid);
    if (!process) {
      yield* logger.warn(`Process ${pid} not found for termination`);
      return;
    }

    yield* logger.info(`Terminating process ${pid} with ${signal}`);
    try {
      process.pty.kill(signal);
      process.isRunning = false;
    } catch (cause) {
      yield* logger.error(`Failed to terminate ${pid}`, cause);
    }
  }),
```

**Step 5: Add Exit Code Handling (2-3h)**
```typescript
// Store exit codes
const exitCodes = new Map<number, number>();

spawn: (command, cwd, env) =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      // ... existing spawn code ...

      // Handle exit event
      newPty.onExit(({ exitCode }) => {
        exitCodes.set(newPty.pid, exitCode);
        yield* logger.info(
          `Process ${newPty.pid} exited with code ${exitCode}`
        );
      });

      return handle;
    }),
    // ... release code ...
  ),

getExitCode: (pid: number) =>
  Effect.sync(() => exitCodes.get(pid) ?? -1),
```

### Testing
```typescript
// Create: src/services/__tests__/ProcessService.test.ts
describe("ProcessService", () => {
  test("spawn creates process with PID", async () => {
    const handle = await runEffect(
      processService.spawn("echo hello", "/tmp", {})
    );
    expect(handle.pid).toBeGreaterThan(0);
  });

  test("recordStream produces output", async () => {
    const handle = await runEffect(
      processService.spawn("echo hello", "/tmp", {})
    );
    const stream = await runEffect(
      processService.recordStream(handle.pid, "stdout")
    );
    const output = await Stream.runCollect(stream);
    expect(output).toContain("hello");
  });

  test("interrupt sends SIGINT", async () => {
    const handle = await runEffect(
      processService.spawn("sleep 100", "/tmp", {})
    );
    await runEffect(processService.interrupt(handle.pid));
    // Process should be dead within 200ms
  });
});
```

### Checklist
- [ ] Install node-pty dependencies
- [ ] Update ProcessHandle interface
- [ ] Implement spawn with acquireRelease
- [ ] Implement recordStream with async iteration
- [ ] Implement interrupt and terminate
- [ ] Add exit code tracking
- [ ] Write tests for all methods
- [ ] Test with real commands

---

## Phase 1.3: Fix React-Effect State Sync (8-10 hours)

### Issue
**Location:** Separate React state vs. Effect state
**Problem:** Changes don't synchronize, leading to stale data

### Solution: Unified Effect-based State

**Step 1: Create EffectProvider Context (3h)**

```typescript
// src/services/EffectProvider.tsx
import React, { useEffect, useRef, useState } from "react";
import { Effect } from "effect";
import type { Session } from "../types";
import { SessionStore } from "./SessionStore";
import { CommandExecutor } from "./CommandExecutor";
import { EffectTalkLayer } from "./index";
import { createEffectRunner } from "./ReactIntegrationService";

type EffectContextType = {
  session: Session | null;
  blocks: Block[];
  isLoading: boolean;
  error: string | null;
  executeCommand: (cmd: string, cwd?: string, env?: Record<string, string>) => Promise<void>;
  addBlock: (block: Block) => Promise<void>;
  updateBlock: (blockId: string, updates: Partial<Block>) => Promise<void>;
  clearBlocks: () => Promise<void>;
  setActiveBlock: (blockId: string | null) => Promise<void>;
};

export const EffectContext = React.createContext<EffectContextType | null>(null);

export function EffectProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runnerRef = useRef(createEffectRunner());

  // Initialize session on mount
  useEffect(() => {
    const init = async () => {
      try {
        const result = await runnerRef.current.runEffect(
          Effect.gen(function* () {
            const store = yield* SessionStore;
            const session = yield* store.getSession();
            return session;
          }).pipe(Effect.provide(EffectTalkLayer))
        );
        setSession(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    init();

    return () => {
      runnerRef.current.dispose();
    };
  }, []);

  const executeCommand = async (
    cmd: string,
    cwd?: string,
    env?: Record<string, string>
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      await runnerRef.current.runEffect(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          yield* executor.executeCommand(cmd, cwd, env);
          // Refresh session
          const store = yield* SessionStore;
          const updatedSession = yield* store.getSession();
          return updatedSession;
        }).pipe(Effect.provide(EffectTalkLayer))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: EffectContextType = {
    session,
    blocks: session?.blocks ?? [],
    isLoading,
    error,
    executeCommand,
    // ... other methods
  };

  return (
    <EffectContext.Provider value={contextValue}>
      {children}
    </EffectContext.Provider>
  );
}

export function useEffectTalk() {
  const context = React.useContext(EffectContext);
  if (!context) {
    throw new Error("useEffectTalk must be used within EffectProvider");
  }
  return context;
}
```

**Step 2: Remove Duplicate Hooks (2h)**
```typescript
// Delete: useBlocks, useSessions (they're now in EffectProvider)
// Keep: useAsyncCommand but update to use context
```

**Step 3: Update App.tsx (2h)**
```typescript
// src/app/App.tsx
import { EffectProvider, useEffectTalk } from "../services/EffectProvider";

function AppContent() {
  const { session, blocks, executeCommand, setActiveBlock } = useEffectTalk();

  const handleCommandSubmit = async (command: string) => {
    if (!session) return;
    const block = { ...addBlock(command) };
    updateBlock(block.id, { status: "running" });
    setActiveBlock(block.id);

    await executeCommand(
      command,
      session.workingDirectory,
      session.environment,
    );
  };

  return (
    <Layout
      header={<Header blocks={blocks} session={session} />}
      sidebar={<Sidebar session={session} />}
      main={
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <BlockList blocks={blocks} />
          <CommandInput onSubmit={handleCommandSubmit} />
        </div>
      }
      footer={<Footer />}
    />
  );
}

export function App() {
  return (
    <EffectProvider>
      <AppContent />
    </EffectProvider>
  );
}
```

**Step 3: Add Error Boundary (1h)**
```typescript
// src/components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  // ... implementation from earlier document ...
}

// Use in App.tsx
export function App() {
  return (
    <ErrorBoundary>
      <EffectProvider>
        <AppContent />
      </EffectProvider>
    </ErrorBoundary>
  );
}
```

### Testing
```typescript
// src/__tests__/integration.test.ts
describe("State Synchronization", () => {
  test("session changes reflect in React", async () => {
    const { getByText } = render(
      <EffectProvider>
        <TestComponent />
      </EffectProvider>
    );
    // Dispatch Effect action
    // Verify React state updated
  });
});
```

### Checklist
- [ ] Create EffectProvider context
- [ ] Create useEffectTalk custom hook
- [ ] Remove old useBlocks/useSessions
- [ ] Update App.tsx
- [ ] Add ErrorBoundary component
- [ ] Remove duplicate state management
- [ ] Test state synchronization

---

## Phase 1.4: Test Infrastructure Setup (4-5 hours)

### Setup
```bash
npm run test -- --init
```

### Create Test Fixtures (2h)
```typescript
// src/__tests__/fixtures.ts
export function createMockBlock(
  overrides: Partial<Block> = {}
): Block {
  return {
    id: generateId(),
    command: "echo test",
    status: "idle",
    stdout: "",
    stderr: "",
    startTime: Date.now(),
    ...overrides,
  };
}

export function createMockSession(
  overrides: Partial<Session> = {}
): Session {
  return {
    id: generateId(),
    blocks: [],
    activeBlockId: null,
    workingDirectory: "/tmp",
    environment: {},
    createdAt: Date.now(),
    lastModified: Date.now(),
    ...overrides,
  };
}

export async function runEffect<A>(
  effect: Effect<A>
): Promise<A> {
  return Effect.runPromise(effect.pipe(Effect.provide(EffectTalkLayer)));
}
```

### Create Test Helpers (2h)
```typescript
// src/__tests__/helpers.ts
export function expectBlockRunning(block: Block) {
  expect(block.status).toBe("running");
  expect(block.startTime).toBeGreaterThan(0);
}

export function expectBlockCompleted(block: Block) {
  expect(["success", "failure", "interrupted"]).toContain(block.status);
  expect(block.endTime).toBeDefined();
}
```

### Checklist
- [ ] Configure vitest with coverage
- [ ] Create test fixtures
- [ ] Create test helpers
- [ ] Verify test runner works
- [ ] Run first test

---

## Phase 1 Summary

**Expected Outcome:**
- ✅ ProcessService spawns real processes
- ✅ PersistenceService saves/loads sessions
- ✅ React state synced with Effect state
- ✅ Basic test infrastructure working
- ✅ Application is functionally viable

**Success Criteria:**
```typescript
// These should all pass by end of Week 1:
test("Can spawn and execute 'echo hello'", async () => {
  const handle = await runEffect(processService.spawn("echo hello", "/tmp", {}));
  const stream = await runEffect(processService.recordStream(handle.pid, "stdout"));
  const output = await Stream.runCollect(stream);
  expect(output.join("")).toContain("hello");
});

test("Can save and load session", async () => {
  const session = createMockSession();
  await runEffect(persistenceService.saveSession(session));
  const loaded = await runEffect(persistenceService.loadSession(session.id));
  expect(loaded).toEqual(session);
});

test("React state reflects Effect changes", async () => {
  // ...
});
```

**Blockers Removed:**
- ✅ ProcessService mock
- ✅ PersistenceService broken
- ✅ State divergence
- ✅ Can run tests

**Next Phase:** Core testing

---

## PHASE 2: Core Testing (Week 2) - 40-50 hours

### Goals
- ✅ Achieve 50%+ test coverage
- ✅ Test all critical paths
- ✅ Add error recovery (retry, catchTag)
- ✅ Add error boundaries
- ✅ Application handles errors gracefully

### Deliverables
- [ ] 40-50 unit tests
- [ ] 15-20 integration tests
- [ ] 50%+ code coverage
- [ ] Error recovery implemented
- [ ] React error boundaries working

### Tasks

**2.1: SessionStore Unit Tests (8h)**
- [ ] getSession
- [ ] updateSession
- [ ] addBlock
- [ ] setActiveBlock
- [ ] clearBlocks
- [ ] resetSession
- [ ] restoreSession
- [ ] Error cases

**2.2: CommandExecutor Integration Tests (10h)**
- [ ] executeCommand workflow
- [ ] Block creation
- [ ] Stream processing
- [ ] State updates
- [ ] Error handling
- [ ] Interrupt handling

**2.3: ProcessService Tests (8h)**
- [ ] spawn success
- [ ] spawn with env
- [ ] Record streams
- [ ] Interrupt
- [ ] Terminate
- [ ] Error handling

**2.4: Error Recovery Implementation (8h)**
- [ ] Add Effect.retry with Schedule
- [ ] Add Effect.catchTag handlers
- [ ] Add timeouts to commands
- [ ] Add error boundary in React
- [ ] Test error paths

**2.5: Hook Tests (6h)**
- [ ] useEffectTalk context access
- [ ] useAsyncCommand execution
- [ ] Error state management

### Checklist
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Coverage report shows 50%+
- [ ] Error cases handled
- [ ] Error boundaries work

---

## PHASE 3: Complete Testing & Polish (Week 3) - 30-40 hours

### Goals
- ✅ Achieve 85%+ test coverage
- ✅ No critical issues
- ✅ Resource cleanup working
- ✅ Structured logging
- ✅ Production-ready code

### Tasks

**3.1: Additional Unit Tests (10h)**
- [ ] LoggerService
- [ ] ConfigService
- [ ] BlockService
- [ ] PersistenceService edge cases
- [ ] Utility functions

**3.2: Component Tests (10h)**
- [ ] Layout rendering
- [ ] BlockList virtualization
- [ ] CommandInput interaction
- [ ] Sidebar display
- [ ] BlockRenderer styling

**3.3: Edge Case Tests (8h)**
- [ ] Very large blocks
- [ ] Many blocks (1000+)
- [ ] Long sessions
- [ ] Network failures (simulated)
- [ ] State recovery

**3.4: Resource Management (4h)**
- [ ] Implement cleanup in ProcessService
- [ ] Test memory leaks
- [ ] Cleanup in React effects
- [ ] Stream cancellation

**3.5: Logging & Documentation (4-6h)**
- [ ] Structured logging setup
- [ ] API documentation (JSDoc)
- [ ] README.md
- [ ] CONTRIBUTING.md
- [ ] Deployment guide

### Checklist
- [ ] Coverage 85%+
- [ ] All edge cases handled
- [ ] No memory leaks
- [ ] Logging configured
- [ ] Documentation complete

---

## PHASE 4: Final Validation & Release (Week 4) - 10-20 hours

### Goals
- ✅ Performance validated
- ✅ Security review passed
- ✅ Production-ready
- ✅ Ready to announce

### Tasks

**4.1: Performance Profiling (4-6h)**
- [ ] Profile startup time
- [ ] Profile command execution
- [ ] Profile rendering with 1000+ blocks
- [ ] Memory usage baseline
- [ ] Identify bottlenecks

**4.2: Security Review (2-3h)**
- [ ] Shell injection prevention
- [ ] File path traversal checks
- [ ] Environment variable sanitization
- [ ] Session file permissions
- [ ] Config validation

**4.3: Final QA (2-3h)**
- [ ] Manual testing of workflows
- [ ] Testing on different OS (macOS, Linux)
- [ ] Testing with different shells
- [ ] Testing large command outputs

**4.4: Release Preparation (2-3h)**
- [ ] Update CHANGELOG
- [ ] Create release notes
- [ ] Tag v0.1.0
- [ ] Update package.json version
- [ ] Verify builds

### Checklist
- [ ] Performance acceptable
- [ ] Security review passed
- [ ] Final QA signed off
- [ ] Release notes ready
- [ ] Ready for v0.1.0 announcement

---

## Timeline & Milestones

### Week 1 (Foundation)
```
Mon: Fix PersistenceService
Tue: Implement ProcessService (spawn)
Wed: Implement ProcessService (streams)
Thu: Fix state sync, add error boundaries
Fri: Setup test infrastructure

Milestone: Application is functionally viable
```

### Week 2 (Testing & Error Handling)
```
Mon: SessionStore tests
Tue: CommandExecutor tests
Wed: ProcessService tests
Thu: Error recovery implementation
Fri: Hook tests

Milestone: 50% coverage, error handling works
```

### Week 3 (Polish & Completion)
```
Mon: Additional unit tests
Tue: Component tests
Wed: Edge case tests
Thu: Resource management, logging
Fri: Documentation

Milestone: 85% coverage, production-ready code
```

### Week 4 (Validation & Release)
```
Mon: Performance profiling
Tue: Security review
Wed: Final QA
Thu: Release preparation
Fri: v0.1.0 Ready

Milestone: Production release
```

---

## Resource Requirements

### Team Composition (Recommended)
- **1-2 Senior Backend/Effect Developers** (ProcessService, services, testing)
- **1 Frontend/React Developer** (Components, hooks, integration)
- **0.5 QA Engineer** (Testing, validation)
- **0.5 DevOps/Infra** (Build, release, docs)

### Tools Needed
- [ ] GitHub Actions for CI/CD
- [ ] Code coverage reporting (codecov.io)
- [ ] Performance monitoring
- [ ] Error tracking (Sentry, etc.)

---

## Risk Mitigation

### Risk #1: ProcessService Issues
**Likelihood:** Medium
**Impact:** Critical (blocks everything)
**Mitigation:** Start early, test with real commands from day 1

### Risk #2: Performance Bottleneck
**Likelihood:** Medium
**Impact:** High (bad user experience)
**Mitigation:** Profile early (Phase 4), optimize before release

### Risk #3: Test Coverage Gaps
**Likelihood:** Medium
**Impact:** High (regressions)
**Mitigation:** Aggressive coverage target (85%), automated checks

### Risk #4: Scope Creep
**Likelihood:** High
**Impact:** Timeline slip
**Mitigation:** Clear scope, NO new features during this phase

---

## Success Metrics

### Code Quality
- ✅ 85%+ test coverage
- ✅ Zero TypeScript errors
- ✅ Zero linting violations
- ✅ No memory leaks

### Functionality
- ✅ ProcessService runs real commands
- ✅ PersistenceService saves/loads sessions
- ✅ State sync working perfectly
- ✅ Errors handled gracefully

### Performance
- ✅ Command startup <100ms
- ✅ UI responsive 60fps
- ✅ Memory stable <500MB
- ✅ 1000+ blocks renderable

### User Experience
- ✅ No crashes
- ✅ Error messages helpful
- ✅ Session persisted reliably
- ✅ Documentation complete

---

## Post-Release Roadmap

### v0.1.1 (Minor Fix Release)
- Bug fixes
- Minor performance improvements
- Documentation updates

### v0.2.0 (Feature Release - Week 6+)
- Concurrent command execution (Effect.Hub)
- Omnibar search (P1 feature)
- Markdown rendering (P4 feature)
- User feedback incorporation

### v0.3.0 (Enhancement Release)
- Virtualization for 10k+ blocks
- Git integration
- Theme customization
- Plugin system foundation

### v1.0.0 (Stable Release)
- Full feature parity with PRD
- Remote harness support
- Plugin ecosystem
- Enterprise features

---

## Conclusion

This is an achievable plan with clear milestones. The critical path is:

1. **Fix Blockers** (PersistenceService, ProcessService) - 3 days
2. **Sync State** (React-Effect) - 2 days
3. **Test Thoroughly** (85%+ coverage) - 2 weeks
4. **Validate & Release** (QA, security, performance) - 3-4 days

**Total: 3-4 weeks**

Execute this plan with discipline, no scope creep, and EffectTalk will be production-ready.
