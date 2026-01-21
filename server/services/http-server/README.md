
# HTTP Server Service

A service for managing HTTP server lifecycle and response handling.

## Capabilities

### API Methods

#### `start(config: ServerConfig) -> Effect<void, never, never>`

Starts the HTTP server with the provided configuration.

#### `stop() -> Effect<void, never, never>`

Stops the HTTP server gracefully.

#### `createResponse(statusCode: number, headers?: Record<string, string>) -> HttpServerResponse`

Creates an HTTP response with the specified status code and headers.

**Returns:**

* `response: HttpServerResponse` - The HTTP response object

**Error Values:**

* `HttpServerError`: When server fails to start
* `HttpServerStopError`: When server fails to stop

## Usage Example

```typescript
import { HttpServerService } from "./services/http-server/service.js";

const program = Effect.gen(function* () {
  const httpServer = yield* HttpServerService;
  const config = { port: 3001, host: "localhost" };
  
  // Start server
  yield* httpServer.start(config);
  
  // Create response
  const response = httpServer.createResponse(200, {
    "Content-Type": "application/json",
  });
  
  // Add security headers
  const securedResponse = httpServer.addSecurityHeaders(response);
  
  // Stop server
  yield* httpServer.stop();
});
```

## Implementation Details

* Uses Node.js built-in HTTP server
* Graceful startup and shutdown handling
* Security headers automatically applied to all responses
* Thread-safe operations using Effect.scoped
* In production, replace with Redis or similar for distributed deployment

## Testing

The service includes comprehensive tests covering:

* Server startup and shutdown
* Response creation with different status codes
* Security header application
* Error handling for duplicate operations

Tests use real service implementations without mocks, following project standards.

## Configuration

The service uses the following configuration from constants:

* `SECURITY_HEADERS`: Security header definitions
* Server configuration passed to start method

## Dependencies

* Node.js HTTP server
* Effect.Service pattern for dependency injection
* @effect/platform for HTTP handling
* @effect/platform-node for Node.js integration
