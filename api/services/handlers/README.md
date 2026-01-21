# Handlers Service

A service for handling API route requests and responses for the Effect Patterns API.

## Capabilities

### API Methods

#### `healthHandler() -> Effect<HealthCheckResponse, never, never>`

Health check handler that always succeeds with status "ok".

**Returns:**

- `HealthCheckResponse` object with status

**Error Values:**

- Never throws errors (always succeeds)

#### `rulesHandler() -> Effect<ApiResponse, never, never>`

Handler for GET /api/v1/rules endpoint.

**Returns:**

- `ApiResponse` with array of rule objects and status 200
- `ApiResponse` with error and status 500 if database fails

**Error Values:**

- Never throws errors (always succeeds)

#### `singleRuleHandler(id: string) -> Effect<ApiResponse, never, never>`

Handler for GET /api/v1/rules/{id} endpoint.

**Parameters:**

- `id: string` - The pattern slug to retrieve

**Returns:**

- `ApiResponse` with rule object and status 200
- `ApiResponse` with error and status 404 if rule not found
- `ApiResponse` with error and status 500 if database fails

**Error Values:**

- Never throws errors (always succeeds)

## Usage Example

```typescript
import { HandlersService } from "./services/handlers/service.js";

const program = Effect.gen(function* () {
  const handlers = yield* HandlersService;
  
  // Health check
  const health = yield* handlers.healthHandler();
  
  // Get all rules
  const rules = yield* handlers.rulesHandler();
  
  // Get specific rule
  const rule = yield* handlers.singleRuleHandler("pattern-id");
});
```

## Implementation Details

- Uses DatabaseService for data operations
- Proper error handling with tagged errors
- Response validation using Effect Schema
- Consistent API response format
- HTTP status code mapping

## Error Handling

The service handles errors internally and returns appropriate HTTP responses:

- **Database Errors**: Returns 500 status with error message
- **Rule Not Found**: Returns 404 status with error message
- **Validation Errors**: Returns 500 status with error message

## Testing

The service includes comprehensive tests covering:

- Health check responses
- Rules listing with validation
- Single rule retrieval
- Error handling scenarios

Tests use real service implementations without mocks, following project standards.

## Dependencies

- DatabaseService for data operations
- Effect Schema for validation
- API constants for status codes and messages
- Proper error handling and response formatting
