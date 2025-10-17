# AGENTS.md - Effect Patterns Hub

## Project Overview

The Effect Patterns Hub is a community-driven knowledge base for Effect-TS patterns, providing a comprehensive collection of best practices, examples, and tooling for building robust applications with Effect-TS. The project includes a CLI tool (`ep`) for managing patterns, an MCP server, and multiple applications.

**Key Features:**
- 150+ curated Effect-TS patterns across all skill levels
- CLI tool for pattern management and AI rule injection
- MCP server with OpenTelemetry integration
- Next.js chat application
- Comprehensive testing and validation pipeline
- Support for 10+ AI development tools

**Tech Stack:**
- **Core:** Effect-TS 3.18+, TypeScript 5.8+, Bun
- **Testing:** Vitest, comprehensive test suites
- **Linting:** Biome (ultracite configuration), custom Effect-TS rules
- **Infrastructure:** Next.js 15, OpenTelemetry, MCP protocol
- **Package Management:** Bun (primary), npm/pnpm support planned

## Commands

### Core Development

```bash
# Testing & Quality Assurance
bun test                              # Run all tests
bun test scripts/__tests__/*.test.ts  # Run specific test file
bun run typecheck                     # TypeScript type checking
bun run lint                          # Lint with Biome (ultracite)
bun run lint:effect                   # Custom Effect-TS linting rules
bun run lint:all                      # All linting combined

# Pattern Pipeline
bun run pipeline                      # Full validation → test → publish → rules
bun run validate                      # Validate pattern structure
bun run ingest                        # Ingest new patterns from content/new/
bun run publish                       # Publish patterns to content/published/
bun run generate                      # Generate README and documentation
bun run rules                         # Generate AI coding rules

# Data Processing
bun run ingest:discord                # Export and anonymize Discord data
bun run analyze                       # Run LangGraph thematic analysis
```

### CLI Tool (`ep`)

```bash
# Installation & Setup
ep --help                             # Show CLI help
ep --version                          # Show version
ep install list                       # List supported AI tools
ep install add --tool cursor          # Install rules for Cursor IDE
ep install add --tool agents --skill-level beginner  # Filtered installation

# Pattern Management
ep pattern new                        # Interactive pattern creation wizard
ep admin validate                     # Validate all patterns
ep admin test                         # Test TypeScript examples
ep admin pipeline                     # Full pipeline: test → publish → validate → generate → rules
ep admin release preview              # Preview next release
ep admin release create               # Create and tag release

# Quality Assurance
ep qa:process                         # Run QA process
ep qa:report                          # Generate QA report
ep qa:status                          # Check QA status
ep qa:repair                          # Auto-repair issues
```

### Application Servers

```bash
# Development Servers
bun run server:dev                    # Start pattern server (port 3001)
bun run mcp:dev                       # Start MCP server in dev mode
cd app && npm run dev                 # Start ChatGPT app (port 3000)

# Production Builds
bun run mcp:build                     # Build MCP server
bun run chat:build                    # Build chat application
bun run app:build:openapi             # Build OpenAPI spec

# Testing
bun run test:server                   # Test server components
bun run test:cli                      # Test CLI functionality
bun run test:app                      # Test application
bun run test:all                      # Run all test suites
```

### Package Management

```bash
# Toolkit Package
bun run toolkit:build                 # Build toolkit package
bun run toolkit:test                  # Test toolkit package

# Dependencies
bun install                           # Install all dependencies
bun link                              # Link CLI globally
bun unlink                            # Remove global CLI link
```

## Architecture

### Monorepo Structure

```
effect-patterns/
├── packages/
│   ├── toolkit/                      # Core Effect Patterns Toolkit
│   └── effect-discord/              # Discord export service
├── services/
│   └── mcp-server/                  # MCP server with OpenTelemetry
├── app/                             # Next.js ChatGPT application
├── content/
│   ├── published/                   # 150+ published MDX patterns
│   ├── src/                         # TypeScript pattern examples
│   └── new/                         # New pattern staging area
├── scripts/                         # CLI, pipelines, analysis tools
├── agents/
│   └── analyzer/                    # LangGraph-powered data analysis
└── docs/                           # Documentation and guides
```

### Key Components

**CLI Tool (`ep`)**: TypeScript-based command-line interface for pattern management, validation, and AI tool integration.

**Pattern Pipeline**: Five-stage process for ingesting, validating, testing, publishing, and generating AI rules from patterns.

**MCP Server**: Model Context Protocol server providing AI tools with access to pattern data and generation capabilities.

**Chat Application**: Next.js-based interface for interactive pattern exploration and AI-assisted development.

**Analysis Engine**: LangGraph-powered system for processing Discord data and generating thematic insights.

### Data Flow

1. **Ingest**: New patterns created in `content/new/` → validated and moved to staging
2. **Test**: TypeScript examples executed to verify correctness
3. **Publish**: MDX files converted to published format with inline code examples
4. **Validate**: Published patterns checked for completeness and consistency
5. **Generate**: Documentation and AI rules generated from pattern metadata
6. **Distribute**: Rules injected into supported AI development tools

## Code Style

### Effect-First Patterns

**Core Principles:**
- **Effect.gen** for complex multi-step operations
- **.pipe()** for simple data transformations
- **Tagged errors** for domain-specific error handling
- **Layer-based DI** for dependency injection
- **Strict TypeScript** with no `any` types
- **Service pattern** for reusable components

**Effect Creation:**
```typescript
// Good: Use Effect.gen for multi-step operations
const program = Effect.gen(function* () {
  const user = yield* UserService.getCurrentUser();
  const preferences = yield* SettingsService.getPreferences(user.id);
  return yield* NotificationService.sendWelcome(user, preferences);
});

// Good: Use .pipe for simple transformations
const result = data.pipe(
  Effect.map(transform),
  Effect.flatMap(validate),
  Effect.catchTag("ValidationError", handleValidationError)
);
```

**Error Handling:**
```typescript
// Tagged errors for domain-specific failures
class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly table: string;
  readonly operation: string;
  readonly cause: unknown;
}> {}

// Specific error recovery
const program = Effect.gen(function* () {
  return yield* Effect.tryPromise({
    try: () => fetchUser(id),
    catch: (error) => new DatabaseError({ table: "users", operation: "fetch", cause: error })
  });
}).pipe(
  Effect.catchTag("DatabaseError", (error) =>
    Effect.logError("Database operation failed", error)
  )
);
```

**Service Pattern:**
```typescript
// Define service interface
class UserService extends Effect.Service<UserService>()("UserService", {
  succeed: {
    getCurrentUser: Effect.Effect<User>,
    createUser: (data: CreateUserInput) => Effect.Effect<User>,
  },
  effect: Effect.Effect<{
    readonly getPreferences: (userId: string) => Effect.Effect<UserPreferences>
  }>
}) {}

// Implement service
const UserServiceLive = Layer.effect(UserService, Effect.gen(function* () {
  // Implementation here
}));

// Use service
const program = Effect.gen(function* () {
  const service = yield* UserService;
  const user = yield* service.getCurrentUser();
  return user;
}).pipe(
  Effect.provide(UserServiceLive)
);
```

### Import Conventions

```typescript
// Direct imports from effect
import { Effect, Layer, Data } from "effect";

// Group related imports
import type { User, CreateUserInput } from "./user-types";
import { validateUser, transformUser } from "./user-utils";
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `user-service.ts`, `database-error.ts`)
- **Functions**: `camelCase` (e.g., `getCurrentUser`, `validateInput`)
- **Types/Classes**: `PascalCase` (e.g., `UserService`, `DatabaseError`)
- **Pattern IDs**: `kebab-case` (e.g., `error-recovery-pattern`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `DEFAULT_TIMEOUT`)

### Formatting Standards

**Biome Configuration:**
- 2-space indentation
- 80 character line width
- Single quotes for JavaScript/TypeScript
- Semicolons required
- LF line endings

**Additional Rules:**
- No explicit `any` types (enforced)
- Prefer `const` over `let` (enforced)
- No useless fragments (enforced)
- Accessibility rules relaxed for CLI tools

## Development Workflow

### Pattern Creation

1. **Create Pattern Files:**
   ```bash
   ep pattern new  # Interactive wizard
   # OR manual creation:
   # content/new/src/my-pattern.ts
   # content/new/my-pattern.mdx
   ```

2. **Run Ingest Pipeline:**
   ```bash
   bun run ingest  # Validates and moves to staging
   ```

3. **Develop and Test:**
   ```bash
   bun run test    # Test TypeScript examples
   bun run lint    # Check code style
   ```

4. **Publish Pattern:**
   ```bash
   bun run pipeline  # Full validation and publishing
   ```

### Release Process

1. **Validate All Changes:**
   ```bash
   bun run lint:all
   bun run test:all
   ep admin validate
   ```

2. **Preview Release:**
   ```bash
   ep admin release preview
   ```

3. **Create Release:**
   ```bash
   ep admin release create  # Creates tag and updates changelog
   ```

### Quality Assurance

```bash
# Run comprehensive QA
bun run qa:process    # Full QA pipeline
bun run qa:report     # Generate detailed report
bun run qa:status     # Check current status
bun run qa:repair     # Auto-fix issues where possible
```

## Testing

### Test Structure

**CLI Tests** (`scripts/__tests__/ep-cli.test.ts`):
- Command parsing and validation
- Error handling for invalid inputs
- Integration with Pattern Server
- File operations and rule generation

**Install Tests** (`scripts/ep-rules-add.test.ts`):
- Tool validation and support
- Server integration testing
- File creation and managed blocks
- Error scenarios and recovery

**Server Tests** (`server/`):
- API endpoint testing
- MCP protocol compliance
- OpenTelemetry integration

### Running Tests

```bash
# Core test suites
bun run test:all              # All tests with coverage
bun run test:cli              # CLI functionality tests
bun run test:server           # Server component tests
bun run test:app              # Application tests

# Development workflow
bun run test:scripts:watch    # Watch mode for script tests
bun run test:scripts:ui       # UI mode for debugging

# Specialized testing
bun run test:behavioral       # Behavioral tests
bun run test:integration      # Integration tests
bun run test:e2e              # End-to-end tests
```

### Test Patterns

**Service Testing:**
```typescript
const TestUserService = Layer.succeed(UserService, {
  getCurrentUser: Effect.succeed(testUser),
  createUser: () => Effect.succeed(createdUser)
});

const result = yield* program.pipe(
  Effect.provide(TestUserService)
);
```

**Error Testing:**
```typescript
it("should handle database errors", () => {
  const program = Effect.gen(function* () {
    return yield* UserService.getCurrentUser();
  }).pipe(
    Effect.provide(Layer.succeed(UserService, {
      getCurrentUser: Effect.fail(new DatabaseError({ ... }))
    }))
  );

  expect(() => Effect.runSync(program)).toThrow();
});
```

**Integration Testing:**
```typescript
describe.sequential("CLI integration", () => {
  beforeAll(async () => await startServer());
  afterAll(() => stopServer());

  it("should install rules successfully", async () => {
    const result = await runCommand(["install", "add", "--tool", "cursor"]);
    expect(result.exitCode).toBe(0);
  });
});
```

## Common Patterns

### Error Recovery

```typescript
// Retry with exponential backoff
const resilientOperation = Effect.gen(function* () {
  return yield* Effect.retry(
    databaseQuery(),
    Schedule.exponential(1000).pipe(
      Schedule.compose(Schedule.recurs(3))
    )
  );
});

// Circuit breaker pattern
const circuitBreaker = Effect.gen(function* () {
  return yield* Effect.timeout(
    riskyOperation(),
    Duration.seconds(5)
  ).pipe(
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new CircuitBreakerError())
    )
  );
});
```

### Resource Management

```typescript
// Proper cleanup with Scope
const withDatabaseConnection = Effect.gen(function* () {
  return yield* Effect.acquireRelease(
    connectToDatabase(),
    (connection) => disconnectFromDatabase(connection)
  ).pipe(
    Effect.flatMap((connection) =>
      performDatabaseOperation(connection)
    )
  );
});

// Scoped operations
const scopedProgram = Effect.gen(function* () {
  return yield* Effect.scoped(
    withDatabaseConnection()
  );
});
```

### Concurrent Operations

```typescript
// Parallel processing with bounded concurrency
const processBatch = (items: readonly Item[]) =>
  Effect.forEach(
    items,
    (item) => processItem(item),
    { concurrency: 10 }
  );

// Race conditions with timeout
const raceWithTimeout = Effect.gen(function* () {
  return yield* Effect.race(
    slowOperation(),
    Effect.sleep(Duration.seconds(30)).pipe(
      Effect.as("timeout")
    )
  );
});
```

### Service Composition

```typescript
// Layer composition
const ApplicationLayer = Layer.mergeAll(
  UserServiceLive,
  DatabaseServiceLive,
  CacheServiceLive,
  LoggerServiceLive
);

// Provide multiple layers
const program = Effect.gen(function* () {
  // Application logic here
}).pipe(
  Effect.provide(ApplicationLayer)
);
```

## Environment Setup

### Prerequisites

- **Bun** v1.0+ (primary runtime)
- **Git** for version control
- **Node.js** 18+ (for npm/pnpm compatibility)

### Installation

```bash
# Clone repository
git clone https://github.com/patrady/effect-patterns.git
cd effect-patterns

# Install dependencies
bun install

# Link CLI globally
bun link

# Verify installation
ep --help
```

### AI Tool Integration

**Supported Tools:**
- Cursor IDE
- Windsurf IDE
- Gemini AI
- Claude AI
- VS Code
- Kilo IDE
- Kira IDE
- Trae IDE
- Goose AI
- AGENTS.md (this file)

**Installation:**
```bash
# Install all rules for Cursor
ep install add --tool cursor

# Install filtered rules
ep install add --tool cursor --skill-level beginner --use-case error-management

# Start pattern server (required for rule installation)
bun run server:dev
```

### Development Environment

```bash
# Type checking
bun run typecheck

# Linting
bun run lint:all

# Full quality check
bun run qa:all

# Start development servers
bun run server:dev    # Pattern server
bun run mcp:dev       # MCP server
```

## Contributing

### Pattern Contributions

1. **Create Pattern:**
   ```bash
   ep pattern new
   ```

2. **Follow Structure:**
   - TypeScript example in `content/new/src/`
   - MDX documentation in `content/new/`
   - Required sections: Good Example, Anti-Pattern, Explanation/Rationale

3. **Run Pipeline:**
   ```bash
   bun run ingest     # Stage new pattern
   bun run pipeline   # Validate and publish
   ```

4. **Submit PR:**
   - Ensure all tests pass
   - Include generated files
   - Follow conventional commits

### Code Contributions

1. **Development Setup:**
   ```bash
   bun install
   bun run typecheck
   bun run test:all
   ```

2. **Code Standards:**
   - Effect-first patterns
   - Tagged error handling
   - Comprehensive tests
   - Biome formatting

3. **Testing:**
   - Add unit tests for new functionality
   - Update integration tests
   - Ensure CLI tests pass

### Documentation

- Update relevant guides in `docs/guides/`
- Keep AGENTS.md current with new commands
- Update SETUP.md for installation changes
- Document breaking changes in CHANGELOG.md

## Troubleshooting

### Common Issues

**CLI Command Not Found:**
```bash
# Re-link CLI
bun link

# Check PATH
which ep
```

**Pattern Server Connection Failed:**
```bash
# Start server in background
bun run server:dev

# Or specify custom URL
ep install add --tool cursor --server-url http://localhost:3002
```

**Validation Failures:**
```bash
# Run with verbose output
ep admin validate --verbose

# Check individual files
bun run content/src/pattern-name.ts
```

**Test Failures:**
```bash
# Run specific test
bun run test:cli

# Check server status
curl http://localhost:3001/health

# Clean test artifacts
rm -rf .cursor .windsurf .vscode
```

**Permission Errors:**
```bash
# Fix script permissions
chmod +x scripts/ep.ts

# Clean and reinstall
rm -rf node_modules
bun install
```

### Debugging

**Verbose Output:**
```bash
# CLI commands
ep admin validate --verbose
ep admin test -v

# Pipeline debugging
bun run test --reporter=verbose
```

**Server Logs:**
```bash
# Development mode with detailed logging
DEBUG=* bun run server:dev
```

**Test Debugging:**
```bash
# Run single test
vitest run scripts/__tests__/ep-cli.test.ts -t "should validate patterns"

# UI mode
vitest --ui scripts/__tests__/ep-cli.test.ts
```

## Roadmap & Future Plans

### High Priority

- **Package Manager Support:** npm/pnpm compatibility
- **Effect-TS Linter:** Re-enable custom linting rules
- **Interactive Rule Selection:** Checkbox UI for rule installation

### Medium Priority

- **Additional AI Tools:** Codeium, Tabnine, GitHub Copilot support
- **Rule Update Notifications:** Check for and update installed rules
- **Enhanced Rule Management:** Remove, status, diff, backup commands

### Low Priority

- **Pattern Templates:** Scaffolding for common pattern types
- **Advanced Validation:** AI-powered pattern quality checks
- **Documentation Generator:** API reference and learning paths
- **Analytics:** Pattern usage tracking and popularity metrics

### Research Projects

- **Web UI:** Browser-based pattern exploration
- **VS Code Extension:** Native IDE integration
- **Pattern Marketplace:** Community contribution platform
- **AI-Powered Suggestions:** Context-aware pattern recommendations

## See Also

- **[SETUP.md](./SETUP.md)** - Complete setup and installation guide
- **[TESTING.md](./TESTING.md)** - Comprehensive testing documentation
- **[ROADMAP.md](./ROADMAP.md)** - Future development plans
- **[CLAUDE.md](./CLAUDE.md)** - Claude-specific AI guidance
- **[docs/guides/CONTRIBUTING.md](./docs/guides/CONTRIBUTING.md)** - Contribution guidelines
- **[docs/patterns-guide.md](./docs/guides/patterns-guide.md)** - Pattern development guide
- **[CHANGELOG.md](./docs/CHANGELOG.md)** - Version history and changes
