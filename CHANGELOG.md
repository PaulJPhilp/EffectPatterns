# Changelog

## [0.14.0] - 2026-03-02

### ep-cli 0.4.0
- **Category-based install for all tools**: `install add` now writes one file per pattern category for Cursor, Windsurf, and Claude (up to 16 files each)
- Cursor and Windsurf output `.mdc` files with YAML frontmatter in `.cursor/rules/` and `.windsurf/rules/`
- VS Code writes a single `.github/copilot-instructions.md` (Copilot convention)
- Claude writes `.md` skill files to `.claude/skills/`
- Added 14 new integration tests covering file output for all tools
- Updated CLI documentation (README, QUICK_START, CHANGELOG)

### mcp-transport
- Added Effect.fn + OpenTelemetry instrumentation
- Added test harness, smoke tests, and launch-readiness fixes
- Refined MCP transport service boundaries

### CI & Dependencies
- Bumped `actions/upload-artifact` from 6 to 7
- Bumped `actions/download-artifact` from 7 to 8
- Updated dev dependencies

## [0.5.0] - 2026-02-27

### 📦 Version
- Version bump to 0.5.0

## [0.12.2] - 2026-02-11

### 🗄️ Database Population
- **All 5 tables populated**: `effect_patterns` (309), `application_patterns` (16), `pattern_relations` (455), `skills` (16), `skill_patterns` (309)
- **Fixed category extraction**: Sync script now uses top-level directory (16 categories) instead of subcategory dirs (was 38)
- **Linked application patterns**: All 309 `effect_patterns` now have `application_pattern_id` set
- **Populated pattern relations**: 455 relations from MDX `related:` frontmatter fields
- **Generated skills**: 16 skills (one per category) with `skill_patterns` join records

### 🧹 Removed Jobs Tables
- **Dropped `jobs` and `pattern_jobs`**: Removed unused Jobs-to-be-Done tables from schema, codebase, and database
- **Migration 0004**: `0004_next_ikaris.sql` drops both tables
- **Cleaned all references**: Removed job repository, service layer, CLI commands, tests, import/export, and migration routes

### 📝 Content & Documentation
- **77 schema patterns**: Added missing `rule:` frontmatter via `scripts/add-missing-rules.ts`
- **DATABASE_ARCHITECTURE.md**: New comprehensive database reference (5 tables, row counts, FK summary, writers, known issues)
- **CLAUDE.md**: Updated database tables list to reflect current schema
- **README.md**: Regenerated from patterns

### 🛠️ New Scripts
- **`scripts/seed-application-patterns.ts`**: Seeds 16 application pattern categories via UPSERT
- **`scripts/add-missing-rules.ts`**: Adds `rule:` frontmatter to schema patterns missing it
- **`scripts/sync-patterns-from-mdx.ts`**: Enhanced with `application_pattern_id` linking and `pattern_relations` population

### 📦 Package Versions
- `effect-patterns-hub` 0.12.2
- `@effect-patterns/toolkit` 0.4.2
- `@effect-patterns/ep-admin` 0.2.2

## [0.12.1] - 2026-02-10

### 🔧 QA Pipeline
- **QA Validator**: New `validator.ts` module validates frontmatter, structure, and TypeScript code blocks for all published `.mdx` patterns
- **`qa validate` command**: New subcommand runs validation with configurable concurrency and writes per-pattern `-qa.json` result files
- **`qa process` updated**: Now runs validation as Step 1 before status/report/repair

### 🐛 Content Fixes
- **15 pattern files fixed**: Corrected TypeScript code blocks across concurrency, schema, error-management, streams, scheduling, and tooling patterns
  - Fixed broken frontmatter in `concurrency-fork-basics`
  - Changed pseudocode blocks from `typescript` to `text` fencing where appropriate
  - Wrapped `yield*` calls in proper `Effect.gen` generators inside `catchAll`, `catchTag`, `orElse` callbacks
  - Scoped duplicate declarations in linting/type-error example blocks
  - Fixed `await` outside async and `yield*` outside generator contexts

### 📦 Dependencies
- **`@effect-patterns/ep-admin`** 0.2.1: Added `gray-matter` for frontmatter parsing
- **`@effect-patterns/toolkit`** 0.4.1: Added `releaseVersion` column to `effectPatterns` schema

### 🛠️ Improvements
- **`QAConfig` type**: Added `publishedPatternsDir` field, made all properties `readonly`
- **Tagged errors**: Added `QAValidationError` and `TypeCheckError` to QA error types
- **Pattern sync script**: New `scripts/sync-patterns-from-mdx.ts` utility

## [0.12.0] - 2026-02-10

### 🚀 First npm Publish
- **npm Packages**: Prepared all four public packages for first npm publish
  - `@effect-patterns/toolkit` 0.4.0
  - `@effect-patterns/ep-cli` 0.3.0
  - `@effect-patterns/ep-shared-services` 1.0.1
  - `@effect-patterns/pipeline-state` 1.1.1
- **MCP Server**: `@effect-patterns/mcp-server` 0.7.7 patch release

### 📦 New Content
- **5 New Patterns**: core-concepts-chunk-vs-array, error-management-extract-cause, observability-compose-metrics, resource-management-guarantee-cleanup, resource-management-runtime-vs-provide

### 🔒 Security
- **MCP Streamable Auth**: Enforced strict API key validation in streamable transport (presence-only bypass removed) with constant-time comparison.
- **OAuth/PKCE Hardening**: Fixed PKCE verification flow and required verifier validation for OAuth code exchange.
- **OAuth Client Auth**: Enforced configured `client_id`/`client_secret` validation for token exchange and aligned discovery metadata with supported token auth mode.

### 🛡️ Admin Protection
- **DB Mutation Routes**: Locked down destructive migration/reset/import endpoints behind admin authentication.

### ✅ Release Readiness
- **Regression Coverage**: Added auth and admin-route regression tests for transport auth, PKCE/client auth, and DB mutation authorization.
- **EP CLI Publishability**: Enabled npm release path by removing package `private` flag from `@effect-patterns/ep-cli`.

### 🛠️ Improvements
- **Generator**: Rewrote README generator to read patterns from disk (.mdx files) instead of querying PostgreSQL, fixing README links to use file paths

### 🔧 Fixes
- **CI Workflow**: Fixed stale `services/mcp-server` path → `packages/mcp-server` in CI build step
- **Package Metadata**: Added repository, bugs, homepage, engines, publishConfig to all packages
- **Toolkit**: Excluded test artifacts from npm package via `!dist/__tests__`
- **Pipeline State**: Updated `@effect/schema` dependency from 0.68 → 0.75

## [0.10.0-patterns] - 2026-01-12

### 🚀 Features
- **Database Migration**: Complete migration to PostgreSQL with Drizzle ORM
- **CLI Improvements**: Enhanced ep-admin and ep-cli with new commands and better DX
- **Test Coverage**: Dramatically improved test coverage to 93%+ across all services
- **Service Architecture**: Comprehensive shared services architecture and refactoring

### 🐛 Fixes
- **Test Fixes**: Remove all mocks from tests and fix test failures
- **Type Safety**: Resolve TypeScript strict mode errors across multiple packages
- **Dependencies**: Fix @effect/cluster dependency issue and enforce ESM-only
- **Build Issues**: Resolve TypeScript errors with type assertions in display service

### 💥 Breaking Changes
- **Path Aliases**: Convert from TypeScript path aliases to npm workspace resolution
- **Database**: Database-first architecture with PostgreSQL as primary storage
- **CLI Migration**: Complete migration from script execution to native services

### 🔄 Refactoring
- **Service Patterns**: Migrate all CLI commands from script execution to native services
- **Error Handling**: Replace try/catch blocks with Effect patterns throughout codebase
- **Code Review**: Implement P1-P4 code review recommendations
- **Monorepo Structure**: Simplify monorepo structure - move MCP packages to packages/

### 📦 Dependencies
- **Effect Updates**: 
  - @effect/cli: 0.69.2 → 0.73.0
  - @effect/platform: 0.93.8 → 0.94.1
  - @effect/platform-node: 0.98.4 → 0.104.0
- **OpenTelemetry**: 
  - @opentelemetry/exporter-trace-otlp-proto: → 0.209.0
  - @opentelemetry/exporter-metrics-otlp-proto: → 0.209.0
  - @opentelemetry/exporter-metrics-otlp-http: → 0.209.0
- **Testing**: vitest: 2.1.9 → 4.0.17
- **Other**: msgpackr and various production dependencies updated

### 📚 Documentation
- **CLI Guides**: Add ep and ep-admin CLI user guides
- **Migration Docs**: Comprehensive migration summary and progress tracking
- **Architecture**: Update documentation for database-first architecture
- **Agent Docs**: Create AGENTS.md documentation for AI agents and automation

### 🧪 Testing
- **Coverage**: Increase toolkit test coverage to 42.3% with 221 tests
- **Integration**: Add comprehensive integration and behavioral tests
- **Quality**: Remove all mocks and use real service implementations
- **CI/CD**: Enhanced testing infrastructure and validation

---

## [0.9.0-patterns] - Previous Release

### Previous Changes
- Initial database-first migration
- MCP server implementation
- Pattern publishing pipeline
- CLI tooling development
