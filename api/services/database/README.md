# Database Service

A service for managing database operations for the Effect Patterns API.

## Capabilities

### API Methods

#### `loadRulesFromDatabase() -> Effect<DatabasePattern[], DatabaseError | RuleNotFoundError, never>`

Loads all rules from the database.

**Returns:**

- Array of `DatabasePattern` objects with pattern data

**Error Values:**

- `DatabaseError`: When database connection fails
- `RuleNotFoundError`: When no rules are found

#### `readRuleById(id: string) -> Effect<DatabasePattern, DatabaseError | RuleNotFoundError, never>`

Loads a single rule by ID from the database.

**Parameters:**

- `id: string` - The pattern slug/ID to retrieve

**Returns:**

- `DatabasePattern` object with pattern data

**Error Values:**

- `DatabaseError`: When database connection fails
- `RuleNotFoundError`: When pattern doesn't exist or has no rule

## Usage Example

```typescript
import { DatabaseService } from "./services/database/service.js";

const program = Effect.gen(function* () {
  const database = yield* DatabaseService;
  
  // Load all rules
  const allRules = yield* database.loadRulesFromDatabase();
  
  // Load specific rule
  const rule = yield* database.readRuleById("pattern-id");
});
```

## Implementation Details

- Uses PostgreSQL database with connection pooling
- Leverages `@effect-patterns/toolkit` for database operations
- Proper resource management with `Effect.acquireRelease`
- Error handling with tagged errors
- Type-safe data transformations

## Testing

The service includes comprehensive tests covering:

- Loading all rules from database
- Reading individual rules by ID
- Error handling for missing rules
- Database connection error scenarios

Tests use real service implementations without mocks, following project standards.

## Dependencies

- PostgreSQL database
- `@effect-patterns/toolkit` for database operations
- Effect.Service pattern for dependency injection
- Proper error handling and resource management
