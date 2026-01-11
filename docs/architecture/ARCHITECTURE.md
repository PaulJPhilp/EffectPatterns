# Architecture & Monorepo Structure

Complete technical overview of the Effect Patterns Hub architecture.

**Table of Contents:**
- [Monorepo Structure](#monorepo-structure)
- [Key Technologies](#key-technologies)
- [Workspace Organization](#workspace-organization)
- [Package Overview](#package-overview)
- [Content Directories](#content-directories)

---

## Monorepo Structure

```
Effect-Patterns/
├── app/                    # AI Assistant Applications
│   ├── web/               # Web UI for pattern browsing
│   │   ├── app/           # Next.js 16 routes
│   │   └── components/    # React components
│   │
│   ├── patterns-chat-app/ # Supermemory-integrated chat interface
│   │   ├── app/           # Next.js app directory
│   │   ├── lib/           # Utilities and services
│   │   └── components/    # React components
│   │
│   ├── code-assistant/    # Code Assistant app (Phase 1 complete)
│   │   ├── app/           # Next.js 16 app directory
│   │   ├── components/    # UI components
│   │   ├── lib/           # Core logic
│   │   └── SETUP_CHECKLIST.md  # Setup instructions
│   │
│   └── sm-cli/            # Supermemory CLI integration (legacy)
│
├── packages/
│   ├── ep-cli/            # CLI entry point (@effect-patterns/ep-cli)
│   │   ├── src/
│   │   │   └── index.ts   # CLI command definitions
│   │   └── dist/          # Built CLI (ESM)
│   │
│   ├── ep-admin/          # Admin CLI tool (@effect-patterns/ep-admin)
│   │   ├── src/
│   │   │   └── index.ts   # Admin commands
│   │   └── dist/          # Built admin tool
│   │
│   ├── toolkit/           # Effect Patterns Toolkit
│   │   ├── src/
│   │   │   ├── patterns/  # Pattern data access layer
│   │   │   ├── search/    # Search and filtering
│   │   │   ├── generate/  # Code generation
│   │   │   ├── schemas/   # Effect schemas and validators
│   │   │   └── index.ts   # Public API
│   │   └── dist/          # Built toolkit (ESM + CJS)
│   │
│   │   ├── test/
│   │   │   └── integration.test.ts
│   │   ├── INTEGRATION_TESTS.md  # Test setup guide
│   │   └── dist/          # Built package
│   │
│   ├── cli/               # Shared CLI utilities
│   ├── design-system/     # UI components library
│   └── shared/            # Shared utilities
│
├── services/
│   └── mcp-server/        # MCP server implementation
│       ├── src/
│       │   ├── auth/      # API key authentication
│       │   ├── tracing/   # OpenTelemetry integration
│       │   ├── handlers/  # Request handlers
│       │   └── server/    # Server initialization
│       └── tests/         # Integration tests
│
├── content/
│   ├── published/         # Final published patterns (150+ MDX files)
│   │
│   └── new/               # Pattern development working directory
│       ├── raw/           # Raw MDX input (before processing)
│       ├── src/           # TypeScript examples (extracted during ingest)
│       ├── processed/     # MDX with component tags (output of ingest)
│       ├── published/     # Pipeline output (before final move)
│       ├── qa/            # QA validation results
│       └── ingest-reports/# Ingest process reports
│
│   ├── src/               # (Legacy location - not actively used)
│   └── raw/               # (Legacy location - not actively used)
│
├── scripts/
│   ├── ep.ts              # CLI entry point (legacy compatibility)
│   ├── ingest-discord.ts  # Discord channel data ingestion
│   ├── analyzer.ts        # Entry point for LangGraph analysis agent
│   │
│   ├── analyzer/          # LangGraph-powered thematic analysis
│   │   ├── graph.ts       # LangGraph workflow orchestration
│   │   ├── nodes.ts       # Analysis workflow nodes (chunk, analyze, aggregate)
│   │   ├── state.ts       # Workflow state management
│   │   ├── services/      # Effect services (LLM, file operations)
│   │   └── __tests__/     # Live integration tests
│   │
│   ├── publish/           # Publishing pipeline (22 scripts)
│   │   ├── pipeline.ts              # Main orchestrator (5-step workflow)
│   │   ├── test-improved.ts         # Enhanced TypeScript testing
│   │   ├── publish.ts               # MDX code embedding
│   │   ├── validate-improved.ts     # Enhanced validation (parallel)
│   │   ├── generate.ts              # README generation
│   │   ├── generate-claude-rules.ts # Claude-specific rules
│   │   ├── rules-improved.ts        # Enhanced rules (6 formats)
│   │   ├── move-to-published.ts     # Finalize pattern publication
│   │   └── ...                      # Other pipeline scripts
│   │
│   ├── ingest/            # Pattern ingestion
│   │   └── ingest-pipeline-improved.ts
│   │
│   └── qa/                # Quality assurance
│
├── content/published/rules/  # AI coding rules (generated)
│   └── generated/
│       ├── rules-for-claude.md      # Claude Code rules (377KB)
│       ├── rules-for-cursor.md      # Cursor rules
│       ├── rules-for-windsurf.md    # Windsurf rules
│       └── ...            # Other AI tool rules
│
└── docs/                  # Documentation
    ├── guides/            # User guides
    ├── implementation/    # Technical docs
    └── release/           # Release management
```

---

## Key Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Effect-TS** | v3.18+ | Functional TypeScript framework |
| **TypeScript** | 5.8+ | Type safety and tooling |
| **Bun** | v1.0+ | Fast JavaScript runtime (recommended) |
| **Node.js** | 18+ | Alternative JavaScript runtime |
| **Next.js** | 15.3+ | React framework for web apps |
| **React** | 19.0+ | UI library for web apps |
| **PostgreSQL** | 16+ | Primary database for patterns, jobs, and application patterns |
| **Drizzle ORM** | 0.45+ | Type-safe SQL query builder |
| **Vercel** | - | Serverless deployment platform |
| **Neon PostgreSQL** | - | Managed database (Code Assistant) |
| **OpenTelemetry** | - | Observability and tracing |
| **Biome** | - | Fast linter and formatter |
| **Vitest** | - | Testing framework |
| **LangGraph** | - | Agent orchestration (analysis engine) |

---

## Workspace Organization

The project uses **Bun workspaces** (configured in `package.json`):

### Root Workspace
Core patterns, CLI, toolkit, MCP server, and automation scripts:
- `packages/` - Shared libraries (toolkit, cli, design-system)
- `services/mcp-server/` - REST API server
- `scripts/` - Build and automation scripts
- `content/` - Pattern data and TypeScript examples

### App Workspaces
Separate Next.js projects with independent configurations:
- `app/code-assistant/` - Next.js 16 + React 19 coding agent
- `app/chat-assistant/` - Next.js 15 conversational interface
- `app/web/` - Next.js web UI for browsing patterns

**Dependency Management:**
- Each workspace has its own `package.json`
- Bun's workspace hoisting shares common dependencies
- Workspaces can depend on each other

---

## Package Overview

### Core Libraries

**@effect-patterns/toolkit** (`packages/toolkit/`)
- Pure Effect library for pattern operations
- **Database layer** - PostgreSQL with Drizzle ORM for pattern storage
- **Repository layer** - Type-safe CRUD operations for patterns, jobs, and application patterns
- **Service layer** - Effect.Service wrappers for dependency injection
- Search and filtering functionality (database-backed)
- Code generation and schema validation
- **Exports:** `searchEffectPatterns`, `findEffectPatternBySlug`, `DatabaseLayer`, repositories, validation schemas


**@effect-patterns/ep-cli** (`packages/ep-cli/`)
- Main CLI entry point for end users
- Commands: search, list, show, install (all database-backed)
- Built as standalone ESM executable
- **Installation:** Can be used globally or via `bun run`
- **Database:** Requires PostgreSQL connection (via DATABASE_URL env var)

**@effect-patterns/ep-admin** (`packages/ep-admin/`)
- Admin CLI for pipeline management
- Commands: pipeline-state management, pattern operations
- Dev-only tool for maintainers

**@effect-patterns/cli** (`packages/cli/`)
- Shared CLI utilities and helpers
- Reusable command patterns
- CLI infrastructure
- **TUI Integration:** Service abstraction layer for terminal UI features

**@effect-patterns/design-system** (`packages/design-system/`)
- React UI component library
- Shared styling and themes
- Used by web apps

**@effect-patterns/shared** (`packages/shared/`)
- Common utilities and types
- Shared constants
- Helper functions

### MCP Server

**services/mcp-server/**
- REST API for programmatic pattern access
- **Database-backed** - Uses PostgreSQL for all pattern queries
- Authentication via API keys
- OpenTelemetry integration for observability
- Endpoints: search, get, explain, generate
- **Database:** Requires PostgreSQL connection (via DATABASE_URL env var)

### CLI Entry Points

**`scripts/ep.ts`** (Legacy)
- Maintained for backwards compatibility
- Delegates to `@effect-patterns/ep-cli`

**`scripts/analyzer.ts`**
- Entry point for LangGraph analysis agent
- Orchestrates Discord data analysis

### TUI Integration

The CLI supports optional Terminal User Interface (TUI) features via **effect-cli-tui** library for enhanced command output. TUI is used by `ep-admin` while the main `ep` CLI remains console-based.

#### Service Abstraction Layer

**`packages/cli/src/services/display.ts`**
- Adaptive display functions that auto-detect TUI availability
- Falls back to console output when TUI services not available
- Allows code reuse between TUI and console-based CLIs
- Exported functions: `showSuccess()`, `showError()`, `showInfo()`, `showWarning()`, `showPanel()`, `showTable()`, `showHighlight()`, `showSeparator()`

**Example:**
```typescript
// Same code works with or without TUI
yield* showSuccess("Pattern published");  // Uses TUI if available, console otherwise
yield* showTable(patterns, { columns: [...] });  // Display table with TUI or console.table
```

#### Script Execution with Spinner

**`packages/cli/src/services/execution.ts`**
- Wraps child process execution with optional TUI spinner feedback
- Three execution modes:
  - `executeScriptWithTUI()` - Spinner + completion feedback
  - `executeScriptCapture()` - Capture stdout for processing
  - `executeScriptStream()` - Inherit stdio for real-time output
- Auto-detects InkService and gracefully degrades to console indicators

#### Runtime Configuration

**`packages/cli/src/index.ts`** exports two runtime layers:

1. **`runtimeLayer`** (default for `ep`)
   - Basic CLI services
   - No TUI support
   - Lightweight console output

2. **`runtimeLayerWithTUI`** (used by `ep-admin`)
   - Includes EffectCLITUILayer from effect-cli-tui
   - Enables DisplayService and InkService
   - Service wrappers auto-detect and use TUI features

**Entry Points:**
- `packages/ep-admin/src/index.ts` - Uses `runtimeLayerWithTUI` for TUI features
- `packages/ep-cli/src/index.ts` - Uses `runtimeLayer` for lightweight console output

#### Testing TUI Integration

Service wrappers are tested with comprehensive unit tests:
- **Test Location:** `packages/cli/__tests__/services/`
- **Coverage:** Both TUI-enabled and TUI-disabled paths
- **Test Framework:** Vitest with Effect.runPromise

Tests verify:
- Display functions work with and without DisplayService
- Execution service handles success/failure/timeout scenarios
- Error messages include script output for debugging
- Console fallback works when TUI unavailable

---

## Content Directories

### Published Patterns
**`content/published/`** (150+ MDX files)
- Final, approved patterns
- Read by: README generator, rules generator, web UI
- Format: MDX with YAML frontmatter

### Development Pipeline
**`content/new/`** - Working directory during development

- **`raw/`** - Raw MDX input before ingest
- **`src/`** - TypeScript examples extracted during ingest
- **`processed/`** - MDX with `<Example />` component tags
- **`published/`** - Pipeline output (not yet finalized)
- **`qa/`** - QA validation reports
- **`ingest-reports/`** - Ingest process logs

**Flow:**
```
content/new/raw/*.mdx
    ↓ (ingest)
content/new/src/*.ts
content/new/processed/*.mdx
    ↓ (pipeline)
content/new/published/*.mdx
    ↓ (move-to-published)
content/published/*.mdx
```

### Legacy Locations
- `content/src/` - Not actively used
- `content/raw/` - Not actively used

---

## Pipeline Integrity Protection

### The Schema Pattern Incident (December 17, 2025)

On December 17, 2025, 60 schema patterns were generated directly to `patterns/schema/` instead of flowing through the pipeline. This caused:

- **Output Structure Violations** - Files in forbidden directories
- **Pipeline Steps Skipped** - Validation was incomplete
- **Rules & Skills Not Regenerated** - AI tool support was outdated
- **Repository Integrity Compromised** - Architecture violated

**Atomic Prevention System** was implemented to make this impossible:

### Layer 1: Pre-commit Hook

**File:** `.git/hooks/pre-commit`

Blocks any commit attempts to forbidden directories:
- `patterns/` - Schema patterns generation output
- `rules/` - AI coding rules generation output
- `.claude/skills/` - Claude skill generation output
- `.gemini/skills/` - Gemini skill generation output
- `.openai/skills/` - OpenAI skill generation output

**Error Message:** Clear instructions to use the pipeline

### Layer 2: Pipeline Validation

**Script:** `scripts/publish/validate-pipeline-integrity.ts`

Runs at the start of `bun run pipeline` to detect unauthorized files.

Checks for existence of forbidden directories before proceeding with any generation steps. Fails immediately with detailed error message if violations found.

### Layer 3: Architecture Enforcement

**Key Rule:** All generated outputs MUST flow through the pipeline.

✅ **ALLOWED:**
```
content/new/ (source)
    ↓
bun run pipeline (validation + generation)
    ↓
content/published/ (final output)
```

❌ **FORBIDDEN:**
- Direct writes to `patterns/`
- Direct writes to `rules/`
- Direct writes to `.*/skills/`
- Bypassing validation steps
- Manual modifications to `content/published/` without pipeline

### Why This Matters

The publishing pipeline ensures:

1. **TypeScript Validation** - All examples type-check
2. **MDX Validation** - Frontmatter and sections verified
3. **Consistent Output** - All patterns follow structure
4. **Complete Generation** - README, rules, and skills all regenerate together
5. **Audit Trail** - Every pattern publication is tracked

When generation bypasses the pipeline:
- Validation steps are skipped
- Output structure becomes inconsistent
- Generated artifacts don't regenerate
- Repository integrity is compromised

### For Contributors

If you see the pre-commit hook error:

```
❌ ERROR: Generated files detected outside content/published/
```

**You are trying to bypass the pipeline.** This is not allowed.

**Correct workflow:**

1. Create/edit source in `content/new/`
2. Run: `bun run pipeline`
3. Run: `bun run scripts/publish/move-to-published.ts`
4. Commit output from `content/published/`

See `CONTRIBUTING.md` for detailed workflow instructions.

---

## Valid Use Case Categories

Patterns are organized by 13+ use case categories:

**Core Categories:**
- `core-concepts`
- `error-management` (aliases: `error-handling`)
- `concurrency` (aliases: `async`, `callback`)
- `resource-management`
- `dependency-injection` (aliases: `custom-layers`, `advanced-dependency-injection`)
- `testing`
- `observability` (aliases: `logging`, `instrumentation`, `metrics`, `monitoring`)
- `domain-modeling`
- `application-architecture`
- `building-apis` (aliases: `making-http-requests`)
- `network-requests`
- `file-handling`
- `database-connections`

**Additional Categories:**
See pattern frontmatter for comprehensive list of valid use cases.

---

## Important Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Root package, workspaces, npm scripts |
| `tsconfig.json` | TypeScript compiler options |
| `biome.json` | Biome linter/formatter configuration |
| `drizzle.config.ts` | Drizzle ORM configuration for database migrations |
| `docker-compose.yml` | PostgreSQL database service configuration |
| `vercel.json` | Vercel deployment settings |
| `.env` | Environment variables (gitignored) - includes `DATABASE_URL` |
| `vitest.config.ts` | Vitest test runner configuration |
| `.pipeline-state.json` | Pipeline state machine state (generated) |

---

## Database Architecture

The project uses PostgreSQL as the primary data store for all pattern metadata:

- **Schema**: Defined in `packages/toolkit/src/db/schema/index.ts`
- **Migrations**: Generated by Drizzle Kit in `packages/toolkit/src/db/migrations/`
- **Client**: Database connection factory in `packages/toolkit/src/db/client.ts`
- **Repositories**: CRUD operations in `packages/toolkit/src/repositories/`
- **Services**: Effect.Service wrappers in `packages/toolkit/src/services/database.ts`

### Database Scripts

```bash
bun run db:generate   # Generate new migrations
bun run db:push      # Push schema to database
bun run db:migrate   # Migrate data from files
bun run db:verify    # Verify migration results
bun run db:studio    # Open Drizzle Studio
```

See [MIGRATION_TESTING.md](./MIGRATION_TESTING.md) for detailed database setup and migration guide.

---

## See Also

- [Data Model](./DATA_MODEL.md) - Entity definitions and relationships
- [Database Migration Guide](./MIGRATION_TESTING.md) - Database setup and migration
- [Publishing Pipeline Details](./PUBLISHING_PIPELINE.md)
- [Pipeline State Machine](./PIPELINE_STATE.md)
- [Discord Service & Data Analysis](./DATA_ANALYSIS.md)
- [Dependencies](./DEPENDENCIES.md)
