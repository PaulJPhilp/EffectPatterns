# Database Service

Provides database testing and verification functionality for the Effect-Patterns project.

## Overview

The Database Service is a specialized testing and verification layer that ensures the database infrastructure is reliable before other services perform their operations. It provides comprehensive health checks, schema verification, and functionality testing for the PostgreSQL database that stores Effect-TS design patterns.

## Capabilities

### Database Connectivity Testing
- Quick connectivity checks
- Connection validation
- Basic functionality verification

### Schema Verification  
- Validates required tables exist
- Checks database schema completeness
- Identifies missing tables

### Comprehensive Testing
- Full test suite with performance metrics
- Repository functionality testing
- Search functionality validation
- Data integrity checks

## API

### `runQuickTest()`
Run a quick database connectivity and functionality test.

```typescript
import { Database } from "./services/db/index.js";

const result = yield* Database.runQuickTest();
// Returns: DBQuickTestResult
```

**Returns:**
- `connected` - Database connection status
- `tablesExist` - All required tables exist
- `tables` - Individual table status
- `stats` - Database statistics (record counts)
- `searchWorks` - Search functionality status
- `repositoriesWork` - Repository operations status

### `runFullTestSuite()`
Run the complete database test suite with detailed results.

```typescript
const summary = yield* Database.runFullTestSuite();
// Returns: DBTestSummary
```

**Test Coverage:**
1. Database Connection
2. Schema Tables Exist
3. Application Patterns Repository
4. Effect Patterns Repository  
5. Search Functionality
6. Jobs Repository
7. Count by Skill Level
8. Find by Slug

**Returns:**
- `total` - Total tests run
- `passed` - Tests that passed
- `failed` - Tests that failed
- `totalDuration` - Total execution time
- `results` - Detailed test results

### `verifySchema()`
Verify database schema exists and is correct.

```typescript
const schema = yield* Database.verifySchema();
// Returns: { valid: boolean; missingTables: string[] }
```

**Returns:**
- `valid` - Schema is complete
- `missingTables` - List of missing table names

## Usage Examples

### Basic Health Check
```typescript
import { Database } from "./services/db/index.js";

// Quick health check
const health = yield* Database.runQuickTest();
if (!health.connected) {
  console.error("Database is not connected");
  return;
}

console.log(`Database has ${health.stats.effectPatterns} patterns`);
```

### Schema Verification
```typescript
// Verify schema before running operations
const schema = yield* Database.verifySchema();
if (!schema.valid) {
  console.error(`Missing tables: ${schema.missingTables.join(", ")}`);
  throw new Error("Database schema is incomplete");
}
```

### Comprehensive Testing
```typescript
// Run full test suite with performance metrics
const testResults = yield* Database.runFullTestSuite();
console.log(`Tests: ${testResults.passed}/${testResults.total} passed`);
console.log(`Duration: ${testResults.totalDuration}ms`);

// Show failed tests
testResults.results
  .filter(r => !r.passed)
  .forEach(r => console.error(`${r.name}: ${r.error}`));
```

## Database Schema

The service expects the following tables:

### Core Tables
- `application_patterns` - Application-level pattern implementations
- `effect_patterns` - Core Effect-TS design patterns
- `jobs` - Background processing tasks
- `pattern_jobs` - Pattern-job relationships
- `pattern_relations` - Pattern relationships and dependencies

## Error Handling

The service uses tagged errors for precise error handling:

```typescript
import { DatabaseConnectionError, DatabaseSchemaError } from "./services/db/index.js";

try {
  yield* Database.runQuickTest();
} catch (error) {
  if (error instanceof DatabaseConnectionError) {
    console.error("Connection failed:", error.cause);
  } else if (error instanceof DatabaseSchemaError) {
    console.error("Schema error:", error.cause);
  }
}
```

### Error Types
- `DatabaseConnectionError` - Connection failures
- `DatabaseSchemaError` - Schema verification failures  
- `DatabaseQueryError` - Query execution failures
- `DatabaseTestError` - Test execution failures

## Dependencies

- `@effect-patterns/toolkit` - Database repositories and utilities
- `@effect/platform` - Platform services
- `effect` - Effect-TS framework

## Integration

### CLI Commands
The database service is used by several CLI commands:

```bash
# Quick database test
ep-admin db:test-quick

# Full test suite
ep-admin db:test

# Schema verification
ep-admin db:verify-migration

# System health check (includes database)
ep-admin ops:health-check
```

### Service Integration
Other services use the database service for health checks:

```typescript
// Publishing service checks database before operations
const dbHealth = yield* Database.runQuickTest();
if (!dbHealth.connected) {
  throw new Error("Database unavailable for publishing");
}
```

## Performance Considerations

- **Quick Test**: ~100-500ms - Basic connectivity and table checks
- **Full Suite**: ~2-10 seconds - Comprehensive testing with repositories
- **Schema Verification**: ~50-200ms - Table existence checks only

## Testing

The service includes comprehensive test coverage:

```bash
# Run all database tests
bun test src/services/db/__tests__

# Run specific test files
bun test src/services/db/__tests__/helpers.test.ts
bun test src/services/db/__tests__/service.test.ts
```

## Configuration

The service uses the standard database configuration from `@effect-patterns/toolkit`. No additional configuration is required.

## Best Practices

1. **Always verify schema** before running database operations
2. **Use quick tests** for frequent health checks
3. **Run full suite** before deployments or major changes
4. **Handle errors gracefully** using the tagged error types
5. **Monitor performance** metrics from test results

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Check database server is running
- Verify connection string and credentials
- Ensure network connectivity

**Schema Verification Failed**
- Run database migrations
- Check for missing tables
- Verify database permissions

**Test Failures**
- Check database permissions for read/write operations
- Verify repository implementations
- Check for data consistency issues

### Debug Mode

Enable verbose logging for detailed debugging:

```typescript
import { Effect } from "effect";

// Add logging to debug database operations
const result = yield* Database.runQuickTest().pipe(
  Effect.tap(() => Effect.log("Database test completed"))
);
```
