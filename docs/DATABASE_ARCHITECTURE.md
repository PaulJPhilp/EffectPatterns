# Database Architecture

**Source of truth**: `packages/toolkit/src/db/schema/index.ts` (Drizzle ORM)

This document is the canonical reference for the Effect Patterns database. All applications, scripts, and services that read from or write to this database MUST conform to the schema defined here. If the Drizzle schema file and this document disagree, the Drizzle schema file wins.

---

## Overview

- **Engine**: PostgreSQL 15 (Neon)
- **ORM**: Drizzle ORM with `postgres-js` driver
- **Database name**: `effect_patterns`
- **Schema**: `public` (default)
- **Tables**: 5

```
application_patterns  (categories)
    ├── effect_patterns   (the patterns themselves)
    │       ├── pattern_relations  (self-join → related patterns)
    │       └── skill_patterns     (join → skills)
    └── skills            (agent skills generated from patterns)
```

---

## Production Infrastructure

### Provider

- **Provider**: Vercel Postgres (powered by Neon)
- **Region**: iad1 (Washington, D.C., USA - East)
- **Connection pooling**: Neon pooler (PgBouncer-compatible)
- **SSL**: Required for all connections

### Environment variables

Vercel automatically provisions these. Only `DATABASE_URL` is used by the application code.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled connection URL (used by app) |
| `DATABASE_URL_OVERRIDE` | Takes precedence over `DATABASE_URL` if set |
| `DATABASE_URL_UNPOOLED` | Direct connection (for migrations and Drizzle Studio) |

The toolkit client resolves the URL in this order: `DATABASE_URL_OVERRIDE` > `DATABASE_URL` > `postgresql://postgres:postgres@localhost:5432/effect_patterns`.

### Deployment

The MCP server is deployed on Vercel. Database schema changes follow this workflow:

```bash
# 1. Edit schema in packages/toolkit/src/db/schema/index.ts
# 2. Generate migration
bun run db:generate
# 3. Review migration in packages/toolkit/src/db/migrations/
# 4. Push to production
bun run db:push
# 5. Verify
bun run ep:admin db test-quick
```

### Backup and recovery

- Neon provides automatic daily backups with point-in-time recovery (7-day retention)
- Manual backup: `pg_dump $DATABASE_URL > backup.sql`
- Manual restore: `psql $DATABASE_URL < backup.sql`

### Health checks

```bash
bun run ep:admin db test-quick   # Connectivity + table checks + search
bun run ep:admin db test         # Full test suite including transactions
bun run ep:admin db verify-migration  # Schema verification
```

---

## Connection

```
Default local:  postgresql://postgres:postgres@localhost:5432/effect_patterns
Production:     Vercel Postgres (Neon), pooled connection via DATABASE_URL
Override:       DATABASE_URL_OVERRIDE takes precedence over DATABASE_URL
```

### Pool configuration

The client in `packages/toolkit/src/db/client.ts` auto-detects the environment and configures pooling accordingly.

| Environment | Detection | `max` | `idle_timeout` | `connect_timeout` | `max_lifetime` | `prepare` |
|---|---|---|---|---|---|---|
| CLI | `process.argv` contains `cli`/`load-patterns`/`migrate`, or `CLI_MODE` env | 1 | 20s | 10s | — | false |
| Serverless (Vercel) | `VERCEL` or `AWS_LAMBDA_FUNCTION_NAME` env | 10 | 10s | 10s | 300s | false |
| Server | Fallback | 20 | 20s | 10s | — | false |

`prepare: false` is required for Neon pooler / PgBouncer compatibility.

Pool size and idle timeout can be overridden with `DB_POOL_MAX` and `DB_POOL_IDLE_TIMEOUT` environment variables.

### Configuration files

| File | Purpose |
|---|---|
| `drizzle.config.ts` | Drizzle Kit config (schema path, migration output, dialect, DB URL) |
| `packages/toolkit/src/db/client.ts` | Connection factory with environment-aware pool sizing |
| `packages/toolkit/src/db/schema/index.ts` | **Authoritative schema definition** |

---

## Tables

### `effect_patterns`

The primary table. Each row is one pattern lesson.

| Column | PostgreSQL type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `slug` | `varchar(255)` | NO | — | Unique identifier, e.g. `getting-started-hello-world` |
| `title` | `varchar(500)` | NO | — | Human-readable title |
| `summary` | `text` | NO | — | Short description |
| `skill_level` | `varchar(50)` | NO | — | `beginner`, `intermediate`, or `advanced` |
| `category` | `varchar(100)` | YES | — | Top-level category (matches `application_patterns.slug`) |
| `difficulty` | `varchar(50)` | YES | — | Difficulty rating (often mirrors skill_level) |
| `tags` | `jsonb` | YES | `'[]'::jsonb` | Array of string tags |
| `examples` | `jsonb` | YES | `'[]'::jsonb` | Array of `{ language, code, description }` |
| `use_cases` | `jsonb` | YES | `'[]'::jsonb` | Array of string use cases |
| `rule` | `jsonb` | YES | — | `{ description }` — linting/analysis rule |
| `content` | `text` | YES | — | Full raw `.mdx` file content |
| `author` | `varchar(255)` | YES | — | Pattern author |
| `lesson_order` | `integer` | YES | — | Ordering within a category |
| `release_version` | `varchar(20)` | YES | — | Version that introduced this pattern |
| `application_pattern_id` | `uuid` | YES | — | FK → `application_patterns.id` (ON DELETE SET NULL) |
| `validated` | `boolean` | NO | `false` | Whether the pattern has passed validation |
| `validated_at` | `timestamp` | YES | — | When validation last passed |
| `created_at` | `timestamp` | NO | `now()` | Row creation time |
| `updated_at` | `timestamp` | NO | `now()` | Last update time |

**Constraints**: `slug` UNIQUE

**Indexes**:
- `effect_patterns_slug_idx` — UNIQUE btree on `slug`
- `effect_patterns_skill_level_idx` — btree on `skill_level`
- `effect_patterns_category_idx` — btree on `category`
- `effect_patterns_application_pattern_idx` — btree on `application_pattern_id`
- `effect_patterns_validated_idx` — btree on `validated`
- `effect_patterns_tags_idx` — GIN on `tags` (array search)

#### JSONB column schemas

**`examples`** — `CodeExample[]`:
```typescript
interface CodeExample {
  language: string      // "typescript", "javascript", etc.
  code: string          // Full code block content
  description?: string  // e.g. "Example"
}
```

**`rule`** — `PatternRule`:
```typescript
interface PatternRule {
  description: string
}
```

**`tags`** and **`use_cases`** — `string[]`

#### How "new" is determined

A pattern is considered "new in a release" when `release_version` is set. The sync script sets this on INSERT only (not on UPDATE). There is no `new` boolean column.

Example: `release_version = '0.12.1'` means the pattern was first added in v0.12.1.

---

### `application_patterns`

High-level categories that group patterns into learning paths. There are 16 categories corresponding to the top-level directories in `content/published/patterns/`.

| Column | PostgreSQL type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `slug` | `varchar(255)` | NO | — | Unique identifier |
| `name` | `varchar(255)` | NO | — | Display name |
| `description` | `text` | NO | — | Category description |
| `learning_order` | `integer` | NO | — | Suggested learning sequence |
| `effect_module` | `varchar(100)` | YES | — | Related Effect module |
| `sub_patterns` | `jsonb` | YES | `'[]'::jsonb` | Array of sub-pattern slugs |
| `validated` | `boolean` | NO | `false` | Validation flag |
| `validated_at` | `timestamp` | YES | — | Last validated time |
| `created_at` | `timestamp` | NO | `now()` | Row creation time |
| `updated_at` | `timestamp` | NO | `now()` | Last update time |

**Constraints**: `slug` UNIQUE

**Indexes**: UNIQUE btree on `slug`, btree on `learning_order`, btree on `validated`

---

### `skills`

Agent skills (SKILL.md format) generated from patterns.

| Column | PostgreSQL type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `slug` | `varchar(255)` | NO | — | Unique identifier |
| `name` | `varchar(255)` | NO | — | Skill name |
| `description` | `text` | NO | — | Skill description |
| `category` | `varchar(100)` | YES | — | Skill category |
| `content` | `text` | YES | — | Full SKILL.md content |
| `version` | `integer` | NO | `1` | Skill version number |
| `pattern_count` | `integer` | NO | `0` | Number of patterns in this skill |
| `application_pattern_id` | `uuid` | YES | — | FK → `application_patterns.id` (ON DELETE SET NULL) |
| `validated` | `boolean` | NO | `false` | Validation flag |
| `validated_at` | `timestamp` | YES | — | Last validated time |
| `created_at` | `timestamp` | NO | `now()` | Row creation time |
| `updated_at` | `timestamp` | NO | `now()` | Last update time |

**Constraints**: `slug` UNIQUE

**Indexes**: UNIQUE btree on `slug`, btree on `category`, btree on `application_pattern_id`, btree on `validated`

---

### Join tables

#### `pattern_relations`

Self-referential many-to-many: related patterns.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `pattern_id` | `uuid` | NO | — |
| `related_pattern_id` | `uuid` | NO | — |

**Primary key**: `(pattern_id, related_pattern_id)`
**Foreign keys**: Both → `effect_patterns.id` (CASCADE)
**Indexes**: btree on `pattern_id`, btree on `related_pattern_id`

#### `skill_patterns`

Many-to-many: which patterns compose a skill.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `skill_id` | `uuid` | NO | — |
| `pattern_id` | `uuid` | NO | — |

**Primary key**: `(skill_id, pattern_id)`
**Foreign keys**: `skill_id` → `skills.id` (CASCADE), `pattern_id` → `effect_patterns.id` (CASCADE)
**Indexes**: btree on `skill_id`, btree on `pattern_id`

---

## Foreign key summary

All delete rules cascade except the two that point at `application_patterns`, which use SET NULL (so deleting a category doesn't delete its patterns or skills).

```
effect_patterns.application_pattern_id  → application_patterns.id  (SET NULL)
skills.application_pattern_id           → application_patterns.id  (SET NULL)
pattern_relations.pattern_id            → effect_patterns.id       (CASCADE)
pattern_relations.related_pattern_id    → effect_patterns.id       (CASCADE)
skill_patterns.skill_id                 → skills.id                (CASCADE)
skill_patterns.pattern_id              → effect_patterns.id       (CASCADE)
```

---

## Migrations

Schema changes are managed by Drizzle Kit. Migrations live in `packages/toolkit/src/db/migrations/`.

| Migration | File | What it does |
|---|---|---|
| 0000 | `0000_cute_gertrude_yorkes.sql` | Initial schema: `application_patterns`, `effect_patterns`, `jobs`, `pattern_jobs`, `pattern_relations` + all indexes and FKs |
| 0001 | `0001_faulty_kitty_pryde.sql` | Add `validated` and `validated_at` columns to `application_patterns`, `effect_patterns`, `jobs` |
| 0002 | `0002_strange_dagger.sql` | Add GIN index on `effect_patterns.tags` |
| 0003 | `0003_little_clea.sql` | Add `skills` and `skill_patterns` tables |
| 0004 | `0004_next_ikaris.sql` | Drop `jobs` and `pattern_jobs` tables |

**Note**: The `release_version` column on `effect_patterns` was added via `bun run db:push` (direct schema push) and does not have a corresponding migration file.

### Commands

```bash
bun run db:generate    # Generate migration from schema diff
bun run db:push        # Push schema directly to database (no migration file)
bun run db:migrate     # Run pending migration files
bun run db:studio      # Open Drizzle Studio GUI
```

---

## Writers

Every script and service that inserts, updates, or deletes rows in `effect_patterns`.

| Writer | Location | Operations | Sets `release_version`? |
|---|---|---|---|
| **Sync script** | `scripts/sync-patterns-from-mdx.ts` | INSERT new, UPDATE existing, link `application_pattern_id`, populate `pattern_relations` | Yes (INSERT only) |
| **Seed script** | `scripts/seed-application-patterns.ts` | UPSERT `application_patterns` (16 categories) | N/A |
| **Load script** | `scripts/load-patterns.ts` | DELETE all, INSERT from JSON | No |
| **Repository** | `packages/toolkit/src/repositories/effect-pattern.ts` | INSERT, UPDATE, DELETE, UPSERT, LOCK, UNLOCK | No |
| **Rebuild examples** | `packages/mcp-server/scripts/rebuild-examples-from-mdx.ts` | UPDATE `examples` column only | No |
| **Import data** | `packages/mcp-server/import-data.ts` | DELETE all, INSERT from JSON export | No |
| **Bulk import API** | `packages/mcp-server/app/api/bulk-import/route.ts` | INSERT (ON CONFLICT skip) | No |
| **Skills generator** | `bun run ep:admin pattern skills generate-from-db` | INSERT/UPDATE `skills` and `skill_patterns` | N/A |
| **Test helpers** | `packages/toolkit/src/__tests__/db-helpers.ts` | DELETE all, INSERT seed data | No |

### Schema management routes (STALE — see Known Issues)

These MCP server routes contain hardcoded `CREATE TABLE` statements:

| Route | Location |
|---|---|
| `migrate` | `packages/mcp-server/app/api/migrate/route.ts` |
| `migrate-final` | `packages/mcp-server/app/api/migrate-final/route.ts` |
| `reset-db` | `packages/mcp-server/app/api/reset-db/route.ts` |
| `simple-reset` | `packages/mcp-server/app/api/simple-reset/route.ts` |
| `final-reset` | `packages/mcp-server/app/api/final-reset/route.ts` |

---

## Known Issues

### 1. Stale hardcoded schemas in MCP server

Five route files in `packages/mcp-server/app/api/` contain hardcoded `CREATE TABLE` statements for `effect_patterns` that are out of sync with the Drizzle schema:

- All 5 are missing the `release_version` column
- 4 of 5 are missing `DEFAULT gen_random_uuid()` on `id`
- All 5 are missing the GIN index on `tags`
- Some still reference `jobs` and `pattern_jobs` tables that no longer exist

**If any of these routes execute, they will recreate tables with a wrong schema.**

These routes should either be removed or rewritten to use Drizzle migrations instead of hardcoded DDL.

### 2. Missing migration for `release_version`

The `release_version` column exists in the Drizzle schema and in the live database, but was applied via `db:push` without generating a migration file. Run `bun run db:generate` to create the migration.

### 3. `import-data.ts` and `bulk-import/route.ts` column lists

These files enumerate columns explicitly in raw SQL INSERT statements. They don't include `release_version`. If used to restore data, `release_version` values will be lost.

---

## Current State

As of v0.12.3 (2026-02-11):

| Table | Row count | Notes |
|---|---|---|
| `effect_patterns` | 304 | All linked to `application_patterns`, all have `rule` and `summary` |
| `application_patterns` | 16 | 16 top-level categories |
| `pattern_relations` | 445 | Populated from MDX `related:` frontmatter |
| `skills` | 16 | One per application pattern category |
| `skill_patterns` | 309 | All patterns assigned to a skill |

All 5 tables are actively populated. The `jobs` and `pattern_jobs` tables were removed in migration 0004.

### v0.12.3 changes

- Deleted 5 duplicate patterns (`data-chunk`, `data-duration`, `observability-custom-metrics`, `observability-tracing-spans`, `leverage-structured-logging`) — row count dropped from 309 to 304
- All 77 schema patterns now have `summary` populated from frontmatter (previously extracted from body at sync time)
- 4 core-concepts patterns renamed to disambiguate duplicate titles
- `pattern_relations` rebuilt with updated `related:` slugs (445 rows, down from 455 due to removed patterns)
