# Database Migration Testing Guide

## Overview

This guide covers testing the PostgreSQL database migration for the Effect Patterns Hub.

## Prerequisites

1. **Docker** - For running PostgreSQL locally
2. **Bun** - Package manager and runtime
3. **Environment Variables** - Optional `DATABASE_URL` (defaults to local postgres)

## Step 1: Start PostgreSQL

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Verify it's running
docker ps | grep postgres
```

## Step 2: Push Database Schema

```bash
# Push schema to database (creates tables)
bun run db:push
```

This will create all tables:
- `application_patterns`
- `effect_patterns`
- `jobs`
- `pattern_jobs`
- `pattern_relations`

## Step 3: Migrate Data

```bash
# Migrate existing data from JSON/MDX/MD files
bun run db:migrate
```

This script will:
1. Load Application Patterns from `data/application-patterns.json`
2. Load Effect Patterns from `data/patterns-index.json` and `content/published/patterns/*.mdx`
3. Load Jobs from `docs/*_JOBS_TO_BE_DONE.md`
4. Create relationships between patterns, jobs, and application patterns
5. Insert everything into PostgreSQL

Expected output:
```
🚀 Starting PostgreSQL migration...
📦 Migrating Application Patterns...
   ✅ Migrated 16 application patterns
📝 Migrating Effect Patterns...
   ✅ Migrated 304 effect patterns
🔗 Migrating Pattern Relations...
   ✅ Migrated X pattern relations
📋 Migrating Jobs...
   ✅ Migrated X jobs
🔗 Migrating Job-Pattern Links...
   ✅ Migrated X job-pattern links

✨ Migration complete!
```

## Step 4: Verify Migration

```bash
# Verify migration results
bun run db:verify
```

This will show:
- Record counts for each table
- Sample data from each table
- Patterns by skill level
- Job coverage statistics

## Step 5: Test Database Access

### Using Drizzle Studio

```bash
# Open Drizzle Studio (web UI for database)
bun run db:studio
```

Navigate to `http://localhost:4983` to browse the database.

### Using Repository Functions

```typescript
import { createDatabase } from "@effect-patterns/toolkit"
import { createEffectPatternRepository } from "@effect-patterns/toolkit"

const { db, close } = createDatabase()
const repo = createEffectPatternRepository(db)

// Search patterns
const patterns = await repo.search({ query: "retry", skillLevel: "intermediate" })
console.log(`Found ${patterns.length} patterns`)

// Get pattern by slug
const pattern = await repo.findBySlug("concurrency-hello-world")
console.log(pattern?.title)

await close()
```

### Using Effect Services

```typescript
import { Effect } from "effect"
import { DatabaseLayer, searchEffectPatterns } from "@effect-patterns/toolkit"

const program = Effect.gen(function* () {
  const patterns = yield* searchEffectPatterns({ query: "error" })
  return patterns
})

const result = await program.pipe(
  Effect.provide(DatabaseLayer),
  Effect.runPromise
)

console.log(`Found ${result.length} patterns`)
```

## Step 6: Test Database Functionality

```bash
# Run comprehensive database tests
bun run test:db

# Run repository integration tests
bun run test:db:repositories

# Run toolkit tests
bun run --filter @effect-patterns/toolkit test
```

The test suite verifies:
- Database connection
- Schema tables exist
- Repository CRUD operations
- Search functionality
- Data integrity (foreign keys, unique constraints)
- Coverage statistics
- Pattern relationships

## Step 7: Test MCP Server

```bash
# Start MCP server
cd services/mcp-server
bun run dev

# In another terminal, test the API
curl http://localhost:3000/api/patterns?q=retry
```

The MCP server should now use the database instead of loading from JSON files.

## Step 8: Test CLI Commands

```bash
# Test search command
bun run ep search retry

# Test list command
bun run ep list --difficulty beginner

# Test show command
bun run ep show concurrency-hello-world
```

All CLI commands should now query the database.

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL
# Should be: postgresql://postgres:postgres@localhost:5432/effect_patterns

# Test connection manually
psql postgresql://postgres:postgres@localhost:5432/effect_patterns -c "SELECT COUNT(*) FROM application_patterns;"
```

### Migration Errors

If migration fails:

1. **Check logs** - The migration script outputs detailed error messages
2. **Verify source files exist**:
   - `data/application-patterns.json`
   - `data/patterns-index.json` (optional)
   - `content/published/patterns/*.mdx`
   - `docs/*_JOBS_TO_BE_DONE.md`
3. **Reset database** (if needed):
   ```bash
   docker-compose down -v
   docker-compose up -d postgres
   bun run db:push
   bun run db:migrate
   ```

### Type Errors

If you see TypeScript errors:

```bash
# Rebuild toolkit
cd packages/toolkit
bun run build

# Type check
bun run typecheck
```

## Expected Results

After successful migration:

- **Application Patterns**: ~16 records
- **Effect Patterns**: ~304 records
- **Jobs**: ~274 records
- **Pattern Relations**: Varies (based on `related` fields in MDX)
- **Job-Pattern Links**: Varies (based on `fulfilledBy` in jobs)

## Next Steps

After verifying the migration:

1. Update any remaining code that uses file-based loading
2. Update documentation to reflect database as primary source
3. Consider adding database migrations for future schema changes
4. Set up production database connection string

## Production Deployment

For production:

1. Set `DATABASE_URL` environment variable
2. Run migrations on production database:
   ```bash
   DATABASE_URL=postgresql://... bun run db:push
   DATABASE_URL=postgresql://... bun run db:migrate
   ```
3. Verify production migration:
   ```bash
   DATABASE_URL=postgresql://... bun run db:verify
   ```

