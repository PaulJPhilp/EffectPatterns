# Implementation Plan: EffectTalk

**Date Created:** January 16, 2026
**Status:** Active Development
**Objective:** Transform EffectTalk from scaffold to a fully functional block-based application harness

---

## Executive Overview

EffectTalk is a next-generation CLI application harness that structures terminal interactions around **Blocks**—discrete, manageable units of work. This plan breaks the PRD and Architecture into concrete development phases, each with testable deliverables.

**Core Principles:**
- Type-safe Effect-based resource management
- Immutable, reactive state model
- Streaming I/O with real-time UI updates
- Session persistence for seamless recovery

---

## Phase 1: Core Domain & Type System (Foundation)

**Goal:** Define all domain types, schemas, and error boundaries.

### Deliverables

#### 1.1 Domain Types (`src/types/index.ts`)
Define TypeScript interfaces for all core entities:

- **Block Interface**
  - `id: string` (UUID)
  - `command: string` (executed command)
  - `status: BlockStatus` (idle | running | success | failure | interrupted)
  - `exitCode?: number`
  - `stdout: string` (accumulated output buffer)
  - `stderr: string` (accumulated error buffer)
  - `startTime: number` (epoch milliseconds)
  - `endTime?: number` (epoch milliseconds)
  - `metadata: Record<string, any>` (extensible tracking)

- **Session Interface**
  - `id: string` (session UUID)
  - `blocks: Block[]` (ordered history)
  - `activeBlockId: string | null` (currently executing block)
  - `workingDirectory: string` (cwd for spawned processes)
  - `environment: Record<string, string>` (process env vars)
  - `createdAt: number` (session start time)
  - `lastModified: number` (last activity timestamp)

- **EffectTalkConfig Interface**
  - `sessionStorePath: string` (SQLite or JSON directory)
  - `maxHistorySize: number` (blocks to retain)
  - `debounceMs: number` (UI update throttling)
  - `ptyCols: number` (terminal width)
  - `ptyRows: number` (terminal height)

- **Command Union Type**
  - `ExecuteCommand` - Run a shell command
  - `SlashCommand` - Built-in harness commands (/clear, /save, /theme)
  - `InterruptCommand` - Cancel active block

#### 1.2 Schema Definitions (with @effect/schema)
Create parseable, validated schemas:

```typescript
BlockSchema = Schema.Struct({
  id: Schema.String,
  command: Schema.String,
  status: Schema.Union(
    Schema.Literal("idle"),
    Schema.Literal("running"),
    Schema.Literal("success"),
    Schema.Literal("failure"),
    Schema.Literal("interrupted")
  ),
  exitCode: Schema.Optional(Schema.Number),
  stdout: Schema.String,
  stderr: Schema.String,
  startTime: Schema.Number,
  endTime: Schema.Optional(Schema.Number),
  metadata: Schema.Record(Schema.String, Schema.Unknown)
})

SessionSchema = Schema.Struct({
  id: Schema.String,
  blocks: Schema.Array(BlockSchema),
  activeBlockId: Schema.Nullable(Schema.String),
  workingDirectory: Schema.String,
  environment: Schema.Record(Schema.String, Schema.String),
  createdAt: Schema.Number,
  lastModified: Schema.Number
})
```

#### 1.3 Error Types (Effect.Data.TaggedError)
Define service-specific errors:

```typescript
export class ProcessError extends Data.TaggedError("ProcessError")<{
  reason: "spawn-failed" | "timeout" | "killed"
  pid?: number
  cause?: unknown
}> {}

export class PersistenceError extends Data.TaggedError("PersistenceError")<{
  operation: "read" | "write" | "delete"
  path: string
  cause?: unknown
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  field: string
  message: string
  value?: unknown
}> {}

export class SessionError extends Data.TaggedError("SessionError")<{
  sessionId: string
  message: string
}> {}
```

#### 1.4 Hooks & Utilities
- **Utilities:** `generateId()`, `formatTimestamp()`, `parseCommand()`, `escapeShellArg()`
- **Hooks:** `useBlocks()`, `useSessions()`, `useAsyncEffect()`

### Tasks
- [ ] Define Block, Session, Command types
- [ ] Create @effect/schema validators for all domain types
- [ ] Define TaggedError types for ProcessError, PersistenceError, ValidationError, SessionError
- [ ] Add utility functions for ID generation, timestamp formatting, command parsing
- [ ] Write unit tests for type validation

**Dependencies:** Effect, @effect/schema
**Estimated Effort:** 2-3 days
**Blockers:** None

---

## Phase 2: Effect Services (State & Persistence Layer)

**Goal:** Build the Effect-based service layer that manages state, processes, and persistence.

### Deliverables

#### 2.1 BlockService
**Location:** `src/services/BlockService.ts`

A service for managing the lifecycle of Block objects:

```typescript
export class BlockService extends Effect.Service<BlockService>()("BlockService", {
  effect: Effect.gen(function* () {
    const logger = yield* LoggerService
    
    return {
      createBlock: (command: string) => Effect.gen(function* () {
        const id = generateId()
        const block: Block = {
          id,
          command,
          status: "idle",
          stdout: "",
          stderr: "",
          startTime: Date.now(),
          metadata: {}
        }
        yield* logger.debug(`Created block: ${id}`)
        return block
      }),
      
      updateBlockOutput: (blockId: string, stdout: string, stderr: string) => 
        // Update active block's output buffers
        Effect.succeed(void 0),
      
      updateBlockStatus: (blockId: string, status: BlockStatus, exitCode?: number) =>
        // Mark block completion with status and exit code
        Effect.succeed(void 0),
      
      getBlock: (blockId: string) =>
        // Retrieve a block by ID
        Effect.succeed(null as Block | null),
      
      listBlocks: () =>
        // Get all blocks in session
        Effect.succeed([] as Block[]),
      
      clearBlocks: () =>
        // Clear all blocks (move to archive)
        Effect.succeed(void 0)
    }
  }),
  dependencies: [LoggerService.Default]
})
```

#### 2.2 PersistenceService
**Location:** `src/services/PersistenceService.ts`

Handle session save/load operations:

```typescript
export class PersistenceService extends Effect.Service<PersistenceService>()(
  "PersistenceService",
  {
    effect: Effect.gen(function* () {
      const config = yield* EffectTalkConfig
      const logger = yield* LoggerService
      
      return {
        saveSession: (session: Session) => Effect.gen(function* () {
          // Write session to SQLite or JSON
          // Handle disk I/O errors gracefully
          yield* logger.info(`Saved session: ${session.id}`)
        }),
        
        loadSession: (sessionId: string) => Effect.gen(function* () {
          // Read from storage, validate with SessionSchema
          // Return Effect.fail(PersistenceError) if not found
        }),
        
        listSessions: () => Effect.gen(function* () {
          // Return array of available session metadata
        }),
        
        deleteSession: (sessionId: string) => 
          // Archive or remove a session
          Effect.succeed(void 0),
        
        getLastSession: () =>
          // Retrieve the most recent session for auto-restore
          Effect.succeed(null as Session | null)
      }
    }),
    dependencies: [EffectTalkConfig.Default, LoggerService.Default]
  }
)
```

#### 2.3 ProcessService
**Location:** `src/services/ProcessService.ts`

Manage PTY instances and process I/O:

```typescript
export class ProcessService extends Effect.Service<ProcessService>()(
  "ProcessService",
  {
    effect: Effect.gen(function* () {
      return {
        spawn: (command: string, cwd: string, env: Record<string, string>) =>
          Effect.gen(function* () {
            // Use node-pty to spawn process
            // Return a handle with pid, stdin, stdout, stderr streams
            // Wrap in Effect.acquireRelease for cleanup
          }),
        
        sendInput: (pid: number, input: string) =>
          // Write to process stdin
          Effect.succeed(void 0),
        
        terminate: (pid: number, signal?: NodeJS.Signals) =>
          // Send SIGTERM or specified signal
          Effect.succeed(void 0),
        
        interrupt: (pid: number) =>
          // Send SIGINT (Ctrl+C)
          Effect.succeed(void 0),
        
        recordStream: (pid: number, stream: "stdout" | "stderr") =>
          // Attach a listener to a process stream
          // Return an Effect that emits data chunks
          Effect.succeed(void 0)
      }
    })
  }
)
```

#### 2.4 SessionStore (Effect.Ref-based State)
**Location:** `src/services/SessionStore.ts`

Centralized mutable state holder:

```typescript
export class SessionStore extends Effect.Service<SessionStore>()("SessionStore", {
  effect: Effect.gen(function* () {
    const initialSession: Session = {
      id: generateId(),
      blocks: [],
      activeBlockId: null,
      workingDirectory: process.cwd(),
      environment: process.env as Record<string, string>,
      createdAt: Date.now(),
      lastModified: Date.now()
    }
    
    const stateRef = yield* Effect.ref(initialSession)
    
    return {
      getSession: () => stateRef.get,
      
      updateSession: (fn: (session: Session) => Session) =>
        stateRef.update(fn),
      
      addBlock: (block: Block) =>
        stateRef.update(s => ({
          ...s,
          blocks: [...s.blocks, block],
          lastModified: Date.now()
        })),
      
      setActiveBlock: (blockId: string | null) =>
        stateRef.update(s => ({
          ...s,
          activeBlockId: blockId,
          lastModified: Date.now()
        })),
      
      subscribe: () =>
        // Return an Effect.Stream of session updates
        Effect.succeed(null as Stream<Session> | null)
    }
  })
})
```

### Tasks
- [ ] Implement BlockService with CRUD operations
- [ ] Implement PersistenceService with disk I/O
- [ ] Implement ProcessService with node-pty integration
- [ ] Create SessionStore as Effect.Ref wrapper
- [ ] Add Event Bus (Effect.Hub) for cross-service communication
- [ ] Implement proper error handling and recovery
- [ ] Write integration tests for service interactions

**Dependencies:** Effect, node-pty, sqlite3 (optional)
**Estimated Effort:** 4-5 days
**Blockers:** Phase 1 completion

---

## Phase 3: React Components & UI Layer

**Goal:** Build the Ink-based TUI with React components.

### Deliverables

#### 3.1 Core Components

##### BlockRenderer (`src/components/BlockRenderer.tsx`)
Render a single Block with appropriate formatting:

```typescript
interface BlockRendererProps {
  block: Block
  isActive: boolean
  onSelect?: (blockId: string) => void
}

// Features:
// - Show command and status indicator
// - Render stdout/stderr with ANSI color support
// - Display exit code if terminated
// - Show timestamps and metadata
```

##### CommandInput (`src/components/CommandInput.tsx`)
Multi-line command editor with history support:

```typescript
interface CommandInputProps {
  onSubmit: (command: string) => void
  onInterrupt?: () => void
  history?: string[]
}

// Features:
// - Shift+Enter for multi-line input
// - Ctrl+K to open history search
// - Auto-indent support
// - Syntax highlighting (optional)
```

##### BlockList (`src/components/BlockList.tsx`)
Scrollable list with virtualization:

```typescript
interface BlockListProps {
  blocks: Block[]
  activeBlockId?: string
  onBlockSelect?: (blockId: string) => void
}

// Features:
// - Virtual scrolling for 10k+ blocks
// - Auto-scroll to newest block
// - Collapse old blocks for performance
```

##### Layout (`src/components/Layout.tsx`)
Main layout structure with header, sidebar, main, footer:

```typescript
interface LayoutProps {
  header?: React.ReactNode
  sidebar?: React.ReactNode
  main: React.ReactNode
  footer?: React.ReactNode
  sidebarWidth?: "sm" | "md" | "lg"
}

// Features:
// - Flexible component composition
// - Responsive to terminal size
// - Support for resizable panels
```

##### Sidebar (`src/components/Sidebar.tsx`)
Context pane showing workspace state:

```typescript
interface SidebarProps {
  session: Session
  width?: "sm" | "md" | "lg"
}

// Features:
// - Show current working directory
// - Display environment variables
// - List background processes
// - Resource monitor (CPU/Memory)
```

#### 3.2 Utilities
- **`cn()`:** Merge classnames with Tailwind support
- **`highlightCode()`:** ANSI escape sequence parsing
- **`parseCommand()`:** Detect slash commands vs shell commands
- **`formatBytes()`:** Human-readable file sizes
- **`formatDuration()`:** Convert ms to readable duration

#### 3.3 Custom Hooks
- **`useBlocks()`:** Subscribe to block updates
- **`useSessions()`:** Manage session list
- **`useAsyncCommand()`:** Handle command execution with loading state

### Tasks
- [ ] Implement BlockRenderer with ANSI parsing
- [ ] Implement CommandInput with history and multi-line support
- [ ] Implement BlockList with virtual scrolling
- [ ] Implement Layout composition system
- [ ] Implement Sidebar with workspace context
- [ ] Create utility functions (cn, parsing, formatting)
- [ ] Create custom React hooks
- [ ] Write component tests with React Testing Library

**Dependencies:** Ink, React, chalk, xterm-addon-serialize (optional)
**Estimated Effort:** 5-6 days
**Blockers:** Phase 2 completion

---

## Phase 4: Effect Fiber Management & Process Execution

**Goal:** Wire up the Effect execution layer to handle real process spawning and streaming.

### Deliverables

#### 4.1 Command Execution Flow
```typescript
executeCommand: (command: string) => Effect.gen(function* () {
  // 1. Create Block in SessionStore
  const block = yield* BlockService.createBlock(command)
  yield* SessionStore.addBlock(block)
  yield* SessionStore.setActiveBlock(block.id)
  
  // 2. Spawn process via ProcessService
  const process = yield* ProcessService.spawn(command, cwd, env).pipe(
    Effect.acquireRelease(
      process => Effect.succeed(process),
      process => ProcessService.terminate(process.pid)
    )
  )
  
  // 3. Attach stream listeners
  yield* ProcessService.recordStream(process.pid, "stdout").pipe(
    Stream.tap(chunk => 
      BlockService.updateBlockOutput(block.id, chunk, "")
    )
  )
  
  // 4. Wait for process completion
  const exitCode = yield* WaitForProcess(process.pid)
  
  // 5. Update block with final status
  yield* BlockService.updateBlockStatus(
    block.id,
    exitCode === 0 ? "success" : "failure",
    exitCode
  )
  
  // 6. Persist session
  const session = yield* SessionStore.getSession()
  yield* PersistenceService.saveSession(session)
})
```

#### 4.2 Fiber Interruption Handling
Graceful cancellation on Ctrl+C:

```typescript
interruptCommand: (blockId: string) => Effect.gen(function* () {
  const block = yield* BlockService.getBlock(blockId)
  if (!block || block.status !== "running") return
  
  const processes = yield* ProcessService.listByBlock(blockId)
  yield* Effect.all(
    processes.map(p => ProcessService.interrupt(p.pid))
  )
  
  yield* BlockService.updateBlockStatus(blockId, "interrupted")
})
```

#### 4.3 Stream Handling
Real-time output aggregation:

```typescript
attachStreamListeners: (pid: number, blockId: string) =>
  Effect.gen(function* () {
    const stdoutStream = yield* ProcessService.getStream(pid, "stdout")
    const stderrStream = yield* ProcessService.getStream(pid, "stderr")
    
    yield* Stream.merge(stdoutStream, stderrStream).pipe(
      Stream.tap(({ type, data }) => {
        if (type === "stdout") {
          yield* BlockService.appendStdout(blockId, data)
        } else {
          yield* BlockService.appendStderr(blockId, data)
        }
      })
    )
  })
```

### Tasks
- [ ] Implement command execution orchestration
- [ ] Wire ProcessService to BlockService for output streaming
- [ ] Implement fiber interruption handling
- [ ] Add timeout support for long-running commands
- [ ] Implement retry logic for failed processes
- [ ] Add proper cleanup on process termination
- [ ] Write integration tests for process execution

**Dependencies:** Effect, node-pty, Effect.Stream
**Estimated Effort:** 3-4 days
**Blockers:** Phase 2 completion

---

## Phase 5: Session Persistence & Auto-Restore

**Goal:** Implement WAL-style persistence and automatic session recovery.

### Deliverables

#### 5.1 Persistence Strategy
- **Write-Ahead Logging (WAL):** Every state change is enqueued before committed
- **SQLite Storage:** Efficient storage with indexing
- **Auto-save:** Debounced writes on every session update

```typescript
persistenceLayer: () => Effect.gen(function* () {
  const stateChanges = yield* Effect.queue<Session>()
  
  // Writer Fiber
  yield* stateChanges.take.pipe(
    Stream.repeatEffect,
    Stream.tap(session => 
      PersistenceService.saveSession(session).pipe(
        Effect.retry(Schedule.exponential(100, 2))
      )
    )
  )
  
  // On any session update, enqueue for persistence
  yield* SessionStore.subscribe().pipe(
    Stream.tap(session => stateChanges.offer(session))
  )
})
```

#### 5.2 Auto-Restore on Startup
```typescript
bootApplication: () => Effect.gen(function* () {
  // Load last session from disk
  const lastSession = yield* PersistenceService.getLastSession()
  
  if (lastSession) {
    yield* SessionStore.restoreSession(lastSession)
    yield* Effect.log(`Restored session: ${lastSession.id}`)
  } else {
    yield* Effect.log("Starting new session")
  }
})
```

#### 5.3 Session Management Commands
- `/save <name>` - Snapshot current session
- `/load <name>` - Restore named snapshot
- `/clear` - Archive current blocks, start fresh
- `/sessions` - List available sessions

### Tasks
- [ ] Implement SQLite schema and migrations
- [ ] Create persistence queue and writer fiber
- [ ] Implement auto-restore logic
- [ ] Add session management commands
- [ ] Write data recovery tests
- [ ] Test persistence under high I/O load

**Dependencies:** sqlite3, Effect.Queue, Effect.Stream
**Estimated Effort:** 3-4 days
**Blockers:** Phase 2, Phase 4 completion

---

## Phase 6: App Assembly & Integration

**Goal:** Wire all services and components together into a working application.

### Deliverables

#### 6.1 Effect Layers Composition
```typescript
// src/services/index.ts
export const EffectTalkLayer = Layer.mergeAll([
  BlockService.Default,
  PersistenceService.Default,
  ProcessService.Default,
  SessionStore.Default,
  LoggerService.Default,
  EffectTalkConfig.Default
])
```

#### 6.2 App Root Component
```typescript
// src/app/App.tsx
export const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  
  return (
    <Layout
      header={<Header session={session} />}
      sidebar={<Sidebar session={session} />}
      main={
        <>
          <BlockList 
            blocks={blocks} 
            activeBlockId={activeBlockId}
          />
          <CommandInput onSubmit={handleCommand} />
        </>
      }
      footer={<Footer />}
    />
  )
}
```

#### 6.3 Runtime Initialization
```typescript
// src/index.tsx
const bootstrap = Effect.gen(function* () {
  yield* bootApplication()
  yield* startRenderLoop()
  yield* startEventLoop()
})

const program = bootstrap.pipe(
  Effect.provide(EffectTalkLayer),
  Effect.provide(NodeContext.layer)
)

NodeRuntime.runMain(program)
```

### Tasks
- [ ] Define main EffectTalkLayer composition
- [ ] Wire all services together
- [ ] Implement main App component
- [ ] Create entry point with proper initialization
- [ ] Handle application lifecycle (startup, shutdown)
- [ ] Implement error boundaries for UI
- [ ] Add graceful shutdown on process signals

**Dependencies:** All previous phases
**Estimated Effort:** 2-3 days
**Blockers:** Phases 1-5 completion

---

## Phase 7: Testing & Polish

**Goal:** Comprehensive test coverage and performance optimization.

### Deliverables

#### 7.1 Unit Tests
- **Domain types:** Validation tests for schemas
- **Services:** Mock-based tests for BlockService, ProcessService, PersistenceService
- **Components:** Snapshot and behavior tests with React Testing Library
- **Utilities:** Tests for parsing, formatting, validation

#### 7.2 Integration Tests
- **Command execution flow:** End-to-end process spawning
- **Persistence:** Session save/load/restore cycle
- **Concurrent blocks:** Multiple processes running in parallel
- **Interruption:** Graceful cancellation and cleanup

#### 7.3 Performance Tests
- **Rendering:** 10k blocks in BlockList without lag
- **I/O:** High-volume process output (10k lines/sec)
- **Memory:** Session persistence with large histories
- **Latency:** Keyboard input to process start < 50ms

#### 7.4 Polish
- **Error messages:** Clear, actionable error display
- **Performance:** Optimize rendering with virtualization
- **UX:** Keyboard shortcuts, command palette, history search
- **Documentation:** Code comments, API docs, usage guide

### Tasks
- [ ] Write unit tests for all services (70%+ coverage)
- [ ] Write integration tests for core flows
- [ ] Performance profiling and optimization
- [ ] E2E testing with real process execution
- [ ] Error handling edge cases
- [ ] Documentation and examples

**Dependencies:** Vitest, React Testing Library
**Estimated Effort:** 5-7 days
**Blockers:** Phases 1-6 completion

---

## Development Timeline

| Phase | Duration | Start | Blockers |
|-------|----------|-------|----------|
| 1: Domain & Types | 2-3 days | Week 1 | None |
| 2: Effect Services | 4-5 days | Week 1 | Phase 1 |
| 3: React Components | 5-6 days | Week 2 | Phase 2 |
| 4: Fiber & Process Exec | 3-4 days | Week 2 | Phase 2 |
| 5: Persistence | 3-4 days | Week 3 | Phases 2, 4 |
| 6: App Assembly | 2-3 days | Week 3 | Phases 1-5 |
| 7: Testing & Polish | 5-7 days | Week 4 | Phases 1-6 |

**Estimated Total:** 4-5 weeks
**Team Size:** 1-2 engineers

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| PTY process cleanup on interruption | Medium | High | Extensive testing of signal handling |
| Large history performance | Medium | Medium | Implement virtualization early (Phase 3) |
| SQLite locking under load | Low | High | Use WAL mode, connection pooling |
| React-Ink incompatibilities | Low | High | Prototype hooks integration early |
| Type safety gaps with dynamic data | Medium | Medium | Strict schema validation on boundaries |

---

## Success Criteria

✅ **Functional:**
- [ ] Execute commands and display output in blocks
- [ ] Save and restore sessions seamlessly
- [ ] Handle interruption (Ctrl+C) gracefully
- [ ] Support slash commands (/clear, /save, /load)
- [ ] Persist 100% of session state

✅ **Performance:**
- [ ] Render 10k blocks without perceptible lag
- [ ] Process input to execution < 50ms
- [ ] Memory usage < 200MB with typical workload

✅ **Quality:**
- [ ] 70%+ test coverage
- [ ] Zero critical bugs at release
- [ ] Comprehensive error boundaries

---

## Future Enhancements (Post-MVP)

1. **Rich Rendering:** Markdown, diff views, tables
2. **Interactive Output:** Clickable file paths, URL handlers
3. **Plugins:** User-defined block renderers
4. **Multi-pane:** Draggable, resizable internal panes
5. **Remote:** SSH session support
6. **Theming:** Customizable color schemes

---

## Appendix: Key Patterns Reference

### Effect Service Pattern
```typescript
export class MyService extends Effect.Service<MyService>()("MyService", {
  effect: Effect.gen(function* () {
    const dependency = yield* SomeDependency
    return {
      method: () => Effect.succeed("result")
    }
  }),
  dependencies: [SomeDependency.Default]
}) {}
```

### Error Handling
```typescript
import { Data, Effect } from "effect"

export class MyError extends Data.TaggedError("MyError")<{
  message: string
  cause?: unknown
}> {}

// Usage:
yield* Effect.fail(new MyError({ message: "Something went wrong" }))
```

### Stream Processing
```typescript
import { Stream } from "effect"

Stream.fromIterable([1, 2, 3]).pipe(
  Stream.tap(n => Effect.log(`Processing: ${n}`)),
  Stream.runCollect
)
```

---

**Document Version:** 1.0
**Last Updated:** January 16, 2026
