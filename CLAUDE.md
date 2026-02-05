# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Overview

**Effect Patterns** is a community-driven knowledge base of 700+ practical patterns for building robust applications with Effect-TS. The repository contains:

1. **Pattern Content** (`content/published/patterns/`) - Markdown-based pattern library with examples and explanations
2. **MCP Server** (`packages/mcp-server/`) - REST API + MCP protocol for pattern search, code analysis, and generation
3. **Admin CLI** (`packages/ep-admin/`) - Internal tooling for pattern publishing, QA, and migrations
4. **End-user CLI** (`packages/ep-cli/`) - Public CLI for developers to search and generate code
5. **Toolkit** (`packages/toolkit/`) - Type-safe Effect library for pattern operations

---

## High-Level Architecture

### Workspace Structure (npm workspaces)

The repository uses **npm workspaces** for package management. All cross-package imports use `workspace:*` dependencies, **not** TypeScript path aliases.

```
Effect Patterns Hub
├── packages/
│   ├── mcp-server/          ← REST API + MCP protocol server (Node.js + Next.js)
│   ├── toolkit/             ← Core pattern library & database layer
│   ├── ep-admin/            ← Admin CLI (pattern publishing, migrations)
│   ├── ep-cli/              ← End-user CLI
│   ├── analysis-core/       ← Code analysis rules & detectors
│   ├── ep-shared-services/  ← Shared utilities across packages
│   └── pipeline-state/      ← Publishing pipeline state machine
├── content/published/       ← Pattern markdown files (700+ patterns)
├── scripts/                 ← Utility scripts for publishing, testing
└── package.json             ← Root workspace definition
```

---

## MCP Server Architecture

### Core Components

**HTTP Endpoints** (`packages/mcp-server/app/api/`)
- 27 REST endpoints for pattern operations
- Authentication: API key validation + tier-based access control
- Error handling: Centralized via `errorHandler.ts`

**Services** (`packages/mcp-server/src/services/`)
- **Resilience Layer**: Cache, circuit-breaker, rate-limiter with KV fallback
- **Code Analysis**: Review-code, analyze-code, pattern-diff-generator, confidence-calculator
- **Infrastructure**: Config, logger, metrics, validation, tier-management
- All services use Effect.Service pattern for dependency injection and composition

**Database** (`packages/toolkit/src/db/`)
- PostgreSQL with Drizzle ORM
- Tables: `effect_patterns`, `application_patterns`, `pattern_jobs`, `pattern_relations`
- Connection pooling with serverless-aware configuration (Vercel KV fallback)

**MCP Protocol** (`packages/mcp-server/src/mcp-stdio.ts`)
- Handles Model Context Protocol via stdio transport
- Tools: `search_patterns`, `get_pattern`, `list_analysis_rules`
- HTTP client pooling with in-flight deduplication and LRU cache

### Dependency Flow

```
Next.js Routes (app/api/)
  ↓
Route Handler Factory (applies auth, errors, logging)
  ↓
Effect Services (composition via Effect.Service)
  ├─ Circuit Breaker (protects external calls)
  ├─ Rate Limiter (per-client quotas)
  ├─ Cache (in-memory + TTL)
  ├─ Code Analysis Services (Claude API calls)
  └─ Database Layer (Toolkit package)
  ↓
PostgreSQL (via Drizzle ORM with connection pooling)
```

---

## MCP Server - Features & Tools

### Available Tools

**Free (MCP protocol):**
- `search_patterns` - Search 700+ patterns by query, category, difficulty
- `get_pattern` - Get full pattern details and code examples by ID
- `list_analysis_rules` - Browse analysis rule catalog (metadata only)

**Paid (HTTP API only):**
- Code review (`review_code`)
- Code analysis (`analyze_code`)
- Consistency analysis (`analyze_consistency`)
- Pattern generation (`generate_pattern`)
- Refactoring (`apply_refactoring`)
- See [MCP_CONFIG.md](./MCP_CONFIG.md) for HTTP API details

### MCP Server Locations

- **Source**: `packages/mcp-server/`
- **Local Development**: `http://localhost:3000` (run: `bun run mcp:dev`)
- **Staging**: `https://effect-patterns-mcp-staging.vercel.app`
- **Production**: `https://effect-patterns-mcp.vercel.app`

---

## Development Commands

### Building & Installation

```bash
# Install all workspace dependencies
bun install

# Build all packages
bun run build

# Build specific package
bun run --filter @effect-patterns/toolkit build

# Type-check entire codebase
bun run typecheck

# Lint and format code
bun run lint                # Check code quality
bun run lint:fix            # Auto-fix linting issues
bun run lint:effect         # Lint Effect patterns for anti-patterns
bun run lint:all            # Run all linting
```

### MCP Server Development

```bash
# Start MCP server locally (port 3000)
bun run mcp:dev

# Build MCP server for production
bun run mcp:build

# Quick verification that server starts
bun run smoke-test
```

### Testing (870+ tests across 7 categories)

**Unit & Integration Tests:**
```bash
bun run test                          # Unit tests
bun run test:mcp                      # MCP protocol (50+ tests)
bun run test:routes                   # API routes (80+ tests)
bun run test:integration              # Integration tests
bun run test:full                     # All critical tests (~2-3 min)
```

**Deployment Testing:**
```bash
export STAGING_API_KEY="your-key"
bun run mcp:test:deployment           # OR for mcp-server package: bun run --filter @effect-patterns/mcp-server test:deployment:staging

export PRODUCTION_API_KEY="your-key"
bun run mcp:test:deployment           # Production variant
```

**Stress Testing (comprehensive load/performance validation):**
```bash
bun run test:stress:edge              # Edge cases (2.9s)
bun run test:stress:volume            # Volume tests (3.4s)
bun run test:stress:load              # Load tests (~300s)
bun run test:stress:spike             # Spike tests (~380s)
bun run test:stress:endurance         # Endurance (40+ min)
bun run test:stress:all               # Run all stress suites
```

See [packages/mcp-server/TESTING_GUIDE.md](./packages/mcp-server/TESTING_GUIDE.md) for detailed testing setup.

### Pattern Publishing Pipeline

```bash
# Full publishing workflow (validate + generate + ingest)
bun run pipeline

# Individual steps
bun run validate                      # Validate pattern schema
bun run generate                      # Generate from patterns
bun run ingest                        # Ingest into database
bun run rules                         # Generate analysis rules from patterns

# Admin operations
bun run ep:admin publish pipeline     # Full validation → generation → ingest
bun run ep:admin publish lint         # Lint patterns
bun run ep:admin publish validate     # Detailed schema validation
```

### Database Operations

```bash
# Database schema management (Drizzle ORM)
bun run db:generate                   # Generate migrations
bun run db:push                       # Push migrations to database
bun run db:migrate                    # Run pending migrations
bun run db:studio                     # Open Drizzle studio GUI

# Database testing
bun run test:db                       # Run database tests
bun run test:db:quick                 # Quick database validation
```

### Quality Assurance

```bash
# QA workflow for pattern content
bun run qa:process                    # Process QA tasks
bun run qa:report                     # Generate QA report
bun run qa:repair                     # Auto-repair issues
bun run qa:repair:dry                 # Preview repairs
bun run qa:all                        # Process + report
```

---

## Key Architecture Patterns

### Effect.Service Pattern

All services use Effect's Service pattern for composable, type-safe dependency injection:

```typescript
import { Effect, Context } from "effect";

export class MyService extends Context.Tag("MyService")<MyService, {
  method: () => Effect.Effect<string>
}>() {}

// Composition via Effect.gen
const effect = Effect.gen(function* () {
  const service = yield* MyService;
  const result = yield* service.method();
  return result;
});
```

### Error Handling as Values

Errors are values, not exceptions. Use tagged error types:

```typescript
import { Data } from "effect";

export class APIError extends Data.TaggedError("APIError")<{
  readonly status: number;
  readonly message: string;
}> {}

// Recovery via catchTag
Effect.catchTag("APIError", (err) => /* handle */);
```

### Layered Service Composition

Services are composed via `Effect.Layer`:

```typescript
const appLayer = Layer.mergeAll(
  ConfigService.layer,
  CacheService.layer,
  CircuitBreakerService.layer,
  RateLimiterService.layer,
  ReviewCodeService.layer,
);

// Provide to app
Effect.provide(appEffect, appLayer);
```

### Database with Drizzle ORM

Type-safe SQL queries with Drizzle:

```typescript
// From packages/toolkit/src/db/schema/index.ts
const patterns = await db
  .select()
  .from(effectPatterns)
  .where(eq(effectPatterns.skillLevel, "intermediate"));
```

---

## Important Files & Their Purposes

### MCP Server Core

| File | Purpose |
|------|---------|
| `packages/mcp-server/src/server/init.ts` | Effect layer composition, runtime setup |
| `packages/mcp-server/src/mcp-stdio.ts` | MCP protocol implementation via stdio |
| `packages/mcp-server/src/tools/tool-implementations.ts` | Tool registry and handlers |
| `packages/mcp-server/src/server/errorHandler.ts` | Converts Effect errors → HTTP responses |
| `packages/mcp-server/src/server/routeHandler.ts` | Factory for authenticated route handlers |

### Services

| File | Purpose |
|------|---------|
| `src/services/config/api.ts` | Centralized config, no async overhead |
| `src/services/cache/api.ts` | In-memory cache with TTL and LRU eviction |
| `src/services/circuit-breaker/api.ts` | Prevents cascading failures (3-state FSM) |
| `src/services/rate-limit/api.ts` | Dual-layer: Vercel KV + in-memory fallback |
| `src/services/review-code/api.ts` | Code analysis via Claude API |
| `src/services/logger/api.ts` | Structured logging with operation context |
| `src/services/metrics/api.ts` | Request/response timing and error tracking |

### Database

| File | Purpose |
|------|---------|
| `packages/toolkit/src/db/schema/index.ts` | Drizzle schema: patterns, jobs, relations |
| `packages/toolkit/src/db/client.ts` | Connection pooling, serverless-aware |
| `packages/toolkit/src/db/migrations/` | Incremental schema changes |

### Configuration

| File | Purpose |
|------|---------|
| `packages/mcp-server/src/services/config/api.ts` | All environment variables, defaults |
| `packages/toolkit/src/services/config.ts` | Toolkit-specific config |
| `packages/mcp-server/src/config/mcp-environments.ts` | MCP environment selection (local/staging/prod) |

### Error Handling

| File | Purpose |
|------|---------|
| `packages/mcp-server/src/errors.ts` | All error types (tagged unions) |
| `packages/mcp-server/src/server/errorHandler.ts` | Error → HTTP response mapping |

---

## Database Schema

### Core Tables (PostgreSQL)

**`effect_patterns`** - Main pattern records
- `id`, `slug` (unique), `title`, `skillLevel`, `category`, `difficulty`
- `examples`, `rules` (JSONB for flexibility)
- Indexed on: slug, skill_level

**`application_patterns`** - High-level classifications
- `id`, `slug` (unique), `name`, `description`
- `learningOrder`, `effectModule`, `subPatterns` (JSONB)
- Indexed on: slug, learning_order

**`pattern_jobs`** - Pattern → Jobs mapping
- Links patterns to "jobs-to-be-done" functional outcomes
- Supports coverage tracking: covered, partial, gap

**`pattern_relations`** - Related patterns
- Establishes connections between related patterns

### Skill Levels
- `🟢 Beginner` - Fundamentals, first patterns
- `🟡 Intermediate` - Common use cases
- `🟠 Advanced` - Complex compositions

---

## Service Configuration

### Resilience Configuration

Located in `packages/mcp-server/src/services/config/api.ts`:

```typescript
const config = {
  // Circuit breaker (prevents cascading failures)
  circuitBreaker: {
    database: { failureThreshold: 5, timeout: "30s" },
    kvCache: { failureThreshold: 3, timeout: "10s" },
  },
  // Rate limiting (per-client quotas)
  rateLimiter: {
    requestsPerMinute: 60,
    fallbackToMemory: true, // Uses in-memory if KV unavailable
  },
  // Caching (in-memory, TTL-based, LRU eviction)
  cache: {
    enabled: true,
    maxSize: 1000,
    ttl: "1h",
  },
};
```

### Environment Variables

Key vars for development/deployment:

```bash
# API & Authentication
PATTERN_API_KEY=your-key                        # MCP authentication
STAGING_API_KEY=key                             # For staging tests
PRODUCTION_API_KEY=key                          # For production tests

# Database (Toolkit)
DATABASE_URL=postgres://user:pass@host/db       # PostgreSQL connection

# Cache (Vercel KV, optional)
KV_REST_API_URL=https://your-kv.vercel.sh
KV_REST_API_TOKEN=token

# Observability (OpenTelemetry)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer token

# MCP Configuration
MCP_ENV=local|staging|production                # Affects available tools
MCP_DEBUG=true                                  # Enable verbose logging
```

See [packages/mcp-server/ENV_VARS.md](./packages/mcp-server/ENV_VARS.md) for complete reference.

---

## Common Development Tasks

### Running a Single Test File

```bash
# Unit test
bunx vitest run packages/mcp-server/src/services/cache/__tests__/cache.test.ts

# Route test (with database)
DATABASE_URL=postgres://... bunx vitest run packages/mcp-server/tests/routes/health.route.test.ts --config vitest.routes.config.ts

# MCP test
bunx vitest run packages/mcp-server/tests/mcp-protocol/tools/search-patterns.test.ts --config vitest.mcp.config.ts
```

### Debugging Services

```bash
# Add to service test or debug script
const service = yield* MyService;
yield* Effect.log(`Debug: ${JSON.stringify(value)}`);
```

### Schema Changes

```bash
# Add new table/column
# 1. Edit: packages/toolkit/src/db/schema/index.ts
# 2. Generate migration
bun run db:generate

# 3. Review and apply
bun run db:push
```

### Adding New Analysis Rules

```bash
# Edit: packages/analysis-core/src/rules/
# Then regenerate rule catalog
bun run rules
bun run rules:claude
```

---

## Workspace Package Resolution

**Important**: No TypeScript path aliases. Use `workspace:*` dependencies instead.

```json
{
  "dependencies": {
    "@effect-patterns/toolkit": "workspace:*",
    "@effect-patterns/mcp-server": "workspace:*"
  }
}
```

This ensures:
- Packages resolve via npm workspaces, not tsconfig paths
- Each package has independent `tsconfig.json`
- Proper module resolution across environment (Node, browser, serverless)

---

## Debugging Guidelines

- **Always run from project root** - Ensures proper `node_modules` resolution
- **Check env vars first** - Use `bun run ep:admin ops health-check` to diagnose issues
- **Review errors as values** - Use `Effect.catchTag` to handle specific error types
- **Profile with time** - `time bun run test:mcp` to identify bottlenecks
- **Verify in CI** - GitHub Actions config: `.github/workflows/`

See [AGENTS.md](./AGENTS.md) for complete agent/automation documentation.
