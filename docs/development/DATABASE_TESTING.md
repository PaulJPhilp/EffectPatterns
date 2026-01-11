# Database Testing Guide

Complete guide for testing the PostgreSQL database migration and functionality.

## Quick Start

```bash
# 1. Start PostgreSQL
docker-compose up -d postgres

# 2. Push schema
bun run db:push

# 3. Migrate data
bun run db:migrate

# 4. Run tests
bun run test:db
```

## Test Database Setup

### Option 1: Use Docker Compose (Recommended)

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Verify it's running
docker ps | grep postgres

# Check connection
psql postgresql://postgres:postgres@localhost:5432/effect_patterns -c "SELECT version();"
```

### Option 2: Use Test Database URL

Set `DATABASE_URL` environment variable to point to a test database:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/effect_patterns_test"
```

## Running Tests

### Unit Tests (Repository Layer)

```bash
# Run repository tests
bun run --filter @effect-patterns/toolkit test

# Run with watch mode
bun run --filter @effect-patterns/toolkit test:watch

# Run with coverage
bun run --filter @effect-patterns/toolkit test:coverage
```

### Integration Tests

```bash
# Run integration tests (requires running database)
bun run test:db

# Run specific test file
bun test packages/toolkit/src/__tests__/repositories.test.ts
```

### Manual Testing

```bash
# Test migration
bun run db:migrate

# Verify migration
bun run db:verify

# Test CLI commands
bun run ep search retry
bun run ep list --difficulty beginner
bun run ep show concurrency-hello-world

# Test MCP server (requires running server)
cd services/mcp-server
bun run dev
# In another terminal:
curl http://localhost:3000/api/patterns?q=retry
```

## Test Database Utilities

The test utilities provide helpers for:
- Creating test database connections
- Seeding test data
- Cleaning up after tests
- Running migrations on test database

### Example Test

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { createDatabase } from "../db/client.js"
import { createEffectPatternRepository } from "../repositories/index.js"

describe("Effect Pattern Repository", () => {
  let db: ReturnType<typeof createDatabase>["db"]
  let close: () => Promise<void>

  beforeAll(async () => {
    const connection = createDatabase(process.env.TEST_DATABASE_URL)
    db = connection.db
    close = connection.close
  })

  afterAll(async () => {
    await close()
  })

  it("should search patterns", async () => {
    const repo = createEffectPatternRepository(db)
    const results = await repo.search({ query: "retry" })
    expect(results.length).toBeGreaterThan(0)
  })
})
```

## Test Data Seeding

For consistent testing, you can seed test data:

```bash
# Seed test database
bun run scripts/test-seed-db.ts
```

## Continuous Integration

For CI/CD, use a test database:

```yaml
# Example GitHub Actions
- name: Start PostgreSQL
  run: docker-compose up -d postgres

- name: Run migrations
  run: bun run db:push

- name: Run tests
  run: bun run test:db
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/effect_patterns_test
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs effect-patterns-db

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Migration Issues

```bash
# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d postgres
bun run db:push
bun run db:migrate
```

### Test Failures

1. Ensure database is running
2. Check `DATABASE_URL` environment variable
3. Verify migrations have run (`bun run db:push`)
4. Check test database has data (`bun run db:verify`)

