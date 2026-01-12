# Production Database Setup

## Overview

The Effect Patterns Hub uses **PostgreSQL** hosted on **Vercel Postgres (Neon)** for production data storage. The database stores patterns, modules, skills, and related metadata.

## Database Provider

- **Provider**: Vercel Postgres (powered by Neon)
- **Region**: iad1 (Washington, D.C., USA - East)
- **Connection Pooling**: Enabled via Neon
- **SSL**: Required for all connections

## Environment Variables

The following environment variables are automatically configured in Vercel:

### Primary Connection URLs
- `DATABASE_URL` - Pooled connection (recommended for serverless)
- `POSTGRES_URL` - Pooled connection URL
- `POSTGRES_PRISMA_URL` - Prisma-compatible pooled URL
- `DATABASE_URL_UNPOOLED` - Direct connection (for migrations)
- `POSTGRES_URL_NON_POOLING` - Non-pooled connection URL
- `POSTGRES_URL_NO_SSL` - Non-SSL connection (dev only)

### Connection Details
- `POSTGRES_HOST` / `PGHOST` - Database host
- `POSTGRES_USER` / `PGUSER` - Database user
- `POSTGRES_PASSWORD` / `PGPASSWORD` - Database password
- `POSTGRES_DATABASE` / `PGDATABASE` - Database name
- `PGHOST_UNPOOLED` - Direct connection host
- `NEON_PROJECT_ID` - Neon project identifier

## Database Schema

The database uses **Drizzle ORM** for schema management and migrations.

### Schema Location
- Schema: `packages/toolkit/src/db/schema/index.ts`
- Migrations: `packages/toolkit/src/db/migrations/`
- Config: `drizzle.config.ts`

### Tables
1. **patterns** - Effect-TS pattern definitions
2. **modules** - Pattern organization modules
3. **skills** - Skill level definitions
4. **tags** - Pattern categorization tags
5. **application_patterns** - Pattern relationships

## Deployment Workflow

### 1. Schema Changes

When making schema changes:

```bash
# Generate migration
bun run db:generate

# Review migration in packages/toolkit/src/db/migrations/

# Push to production
bun run db:push
```

### 2. Running Migrations

For production deployments:

```bash
# Push schema directly (recommended for Vercel Postgres)
bun run db:push

# Or run migrations
bun run db:migrate
```

### 3. Verify Deployment

```bash
# Run health check
bun run health-check

# Run database tests
bun run test:db

# Quick database verification
bun run test:db:quick
```

## Database Client Configuration

The database client is configured in `packages/toolkit/src/db/client.ts`:

```typescript
const client = postgres(databaseUrl, {
  max: 1,              // Single connection for CLI
  idle_timeout: 20,    // Close idle connections after 20s
  connect_timeout: 10, // Connection timeout in seconds
})
```

For serverless environments, the connection pool is managed by Neon.

## Health Check

Run the health check to verify database connectivity:

```bash
bun run health-check
```

Expected output:
```
1. Database Health:
✓    Database connected
ℹ    Tables: 5
ℹ    Patterns: 2
```

## Database Operations

### CLI Commands

```bash
# Database operations
bun run db:generate      # Generate migration from schema changes
bun run db:push          # Push schema to database
bun run db:migrate       # Run migrations
bun run db:studio        # Open Drizzle Studio
bun run db:verify        # Verify migration status

# Testing
bun run test:db          # Run full database tests
bun run test:db:quick    # Quick database verification
bun run test:db:repositories  # Test repository layer
```

### Programmatic Access

```typescript
import { createDatabase } from "@effect-patterns/toolkit/db"

// Create database connection
const { db, close } = createDatabase()

// Use database
const patterns = await db.select().from(schema.patterns)

// Close connection
await close()
```

## Monitoring

### Health Checks
- Endpoint: `bun run health-check`
- Checks: Database connectivity, table count, pattern count
- Frequency: On-demand or via CI/CD

### Logs
- View Vercel logs for database operations
- Check Neon dashboard for connection metrics
- Monitor query performance in Drizzle Studio

## Backup & Recovery

### Automated Backups
- Vercel Postgres (Neon) provides automatic daily backups
- Point-in-time recovery available
- Retention: 7 days (default)

### Manual Backup

```bash
# Export data (requires DATABASE_URL)
pg_dump $DATABASE_URL > backup.sql

# Restore from backup
psql $DATABASE_URL < backup.sql
```

## Security

### Connection Security
- All connections require SSL
- Credentials stored in Vercel environment variables
- No credentials in code or version control

### Access Control
- Database user has limited permissions
- Read/write access to application tables only
- No superuser privileges

## Troubleshooting

### Connection Issues

```bash
# Test connection
bun run test:db:quick

# Check environment variables
vercel env ls

# Verify schema
bun run db:studio
```

### Migration Issues

```bash
# Reset migrations (development only)
rm -rf packages/toolkit/src/db/migrations/*
bun run db:generate

# Force push schema
bun run db:push
```

### Common Errors

1. **"database does not exist"**
   - Verify DATABASE_URL is correct
   - Check Vercel environment variables

2. **"SSL required"**
   - Use pooled connection URL
   - Ensure SSL is enabled in connection string

3. **"Connection timeout"**
   - Check network connectivity
   - Verify Vercel Postgres is running

## Production Checklist

- [x] PostgreSQL database provisioned on Vercel
- [x] Environment variables configured
- [x] Database schema pushed to production
- [x] Health check passing
- [x] Database tests passing
- [x] Migrations directory in version control
- [x] Backup strategy documented

## Resources

- [Vercel Postgres Documentation](https://vercel.com/docs/storage/vercel-postgres)
- [Neon Documentation](https://neon.tech/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Project Database Schema](../packages/toolkit/src/db/schema/index.ts)

---

**Last Updated**: January 12, 2026
**Database Version**: PostgreSQL 15 (Neon)
**Schema Version**: See latest migration in `packages/toolkit/src/db/migrations/`
