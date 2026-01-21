# Vercel Server API Documentation

## Overview

The Vercel Server API provides a RESTful interface for accessing Effect-TS pattern rules and AI coding guidance. It's built using Effect-TS for robust error handling, type safety, and resource management.

## Architecture

### Technology Stack

- **Runtime**: Vercel Serverless Functions
- **Framework**: Effect-TS for composability and error handling
- **Database**: PostgreSQL for persistent storage
- **Language**: TypeScript with strict typing

### Key Design Principles

- **Effect-First**: All business logic uses Effect-TS patterns
- **Type Safety**: End-to-end TypeScript validation with schemas
- **Resource Management**: Automatic cleanup via Effect.scoped
- **Error Handling**: Comprehensive error channels and HTTP status mapping

## API Endpoints

### Base URL

```html
https://your-vercel-app.vercel.app
```

### Routes

#### `GET /` - API Documentation

Returns API metadata and available endpoints.

**Response:**

```json
{
  "name": "Effect Patterns API",
  "version": "v1",
  "description": "AI coding rules for Effect-TS patterns",
  "repository": "https://github.com/PaulJPhilp/EffectPatterns",
  "endpoints": {
    "health": "/health",
    "rules": {
      "list": "/api/v1/rules",
      "get": "/api/v1/rules/{id}"
    }
  }
}
```

#### `GET /health` - Health Check

Checks API and database connectivity.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-01-21T17:00:00.000Z",
  "database": "connected",
  "version": "v1"
}
```

#### `GET /api/v1/rules` - List All Rules

Retrieves all available Effect-TS pattern rules.

**Response:**

```json
{
  "rules": [
    {
      "id": "async-await",
      "title": "Async/Await Pattern",
      "description": "Proper async/await usage in Effect",
      "category": "async",
      "severity": "medium",
      "guidance": "Use Effect.gen() instead of async/await...",
      "examples": [
        {
          "bad": "async function fetchData() { ... }",
          "good": "const fetchData = Effect.gen(function* () { ... })"
        }
      ]
    }
  ],
  "total": 88,
  "categories": ["async", "error-handling", "concurrency", "testing"]
}
```

#### `GET /api/v1/rules/{id}` - Get Single Rule

Retrieves a specific rule by its identifier.

**Path Parameters:**

- `id` - Rule identifier (e.g., "async-await", "throw-in-effect-code")

**Response:**

```json
{
  "id": "throw-in-effect-code",
  "title": "Avoid Throwing in Effect Code",
  "description": "Never throw exceptions in Effect code",
  "category": "error-handling",
  "severity": "high",
  "guidance": "Use Effect.fail() instead of throw statements",
  "examples": [
    {
      "bad": "Effect.sync(() => { throw new Error('bad') })",
      "good": "Effect.fail(new Error('bad'))"
    }
  ],
  "relatedRules": ["generic-error-type", "missing-error-channel"]
}
```

## Error Handling

### HTTP Status Codes

- `200 OK` - Successful request
- `404 Not Found` - Rule or endpoint not found
- `500 Internal Server Error` - Database or unexpected errors

### Error Response Format

```json
{
  "error": "Rule not found",
  "code": "RULE_NOT_FOUND",
  "timestamp": "2026-01-21T17:00:00.000Z"
}
```

### Error Types

- `RULE_NOT_FOUND` - Requested rule ID doesn't exist
- `DATABASE_ERROR` - Failed to connect/query database
- `VALIDATION_ERROR` - Invalid request parameters
- `INTERNAL_ERROR` - Unexpected server errors

## Implementation Details

### Effect-TS Integration

#### Service Composition

```typescript
const healthCheckHandler = Effect.gen(function* () {
    const result = yield* healthHandler;
    return { status: HTTP_STATUS_OK, data: result };
});
```

#### Resource Management

```typescript
Effect.runPromise(
    Effect.scoped(
        handlerEffect.pipe(
            Effect.flatMap(({ status, data }) =>
                Effect.sync(() => res.status(status).json(data))
            )
        )
    )
)
```

#### Error Channel Handling

```typescript
const listRulesHandler = Effect.gen(function* () {
    const result = yield* rulesHandler;
    if ("error" in result) {
        return { status: result.statusCode, data: { error: result.error } };
    }
    return { status: HTTP_STATUS_OK, data: result.data };
});
```

### Database Integration

#### Schema Validation

All database responses are validated using Effect-Schema:

```typescript
const RuleSchema = Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    description: Schema.String,
    category: Schema.String,
    severity: Schema.Literal("low", "medium", "high"),
    guidance: Schema.String,
    examples: Schema.Array(ExampleSchema)
});
```

#### Connection Management

Database connections are managed through Effect layers with automatic cleanup:

```typescript
const DatabaseLive = Layer.effect(
    Database,
    Effect.gen(function* () {
        const pool = yield* createConnectionPool();
        return { query: (sql) => executeQuery(pool, sql) };
    })
);
```

### Route Matching

#### Pattern-Based Routing

```typescript
const RouteMatchers = {
    root: (url?: string) => url === API_ROOT,
    health: (url?: string) => url === API_HEALTH,
    rules: (url?: string) => url === API_RULES_LIST,
    ruleById: (url?: string) => url?.match(RULE_PATH_REGEX),
} as const;
```

## Performance Characteristics

### Response Times

- **Health Check**: < 50ms (cached)
- **List Rules**: < 200ms (with database connection pooling)
- **Single Rule**: < 100ms (indexed lookup)

### Caching Strategy

- **Health Endpoint**: Response cached for 30 seconds
- **Rules Data**: Database-level caching with 5-minute TTL
- **Static Responses**: In-memory caching for API metadata

### Scalability

- **Serverless Functions**: Auto-scaling based on request volume
- **Database**: Connection pooling (max 10 connections)
- **Cold Starts**: Optimized for < 1s initialization

## Security Considerations

### Input Validation

- All inputs validated at boundaries using Effect-Schema
- SQL injection prevention via parameterized queries
- Rate limiting on all endpoints

### Error Information

- Sensitive details omitted from error responses
- Database errors mapped to generic error messages
- Stack traces only available in development

### CORS Configuration

```typescript
const corsConfig = {
    origins: ["https://effect-patterns.com"],
    methods: ["GET"],
    headers: ["Content-Type", "Authorization"]
};
```

## Monitoring and Observability

### Logging

Structured logging with correlation IDs:

```typescript
const logger = yield* Logger;
logger.info("Request processed", {
    method: req.method,
    url: req.url,
    duration: Date.now() - startTime,
    statusCode: res.statusCode
});
```

### Metrics

- Request count per endpoint
- Response time distributions
- Error rates by type
- Database connection pool metrics

### Health Checks

- Database connectivity verification
- Response time monitoring
- Error rate thresholds

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run tests
npm run test

# Type checking
npm run type-check
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/patterns

# API Configuration
API_VERSION=v1
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

### Testing Strategy

- **Unit Tests**: Individual handler functions
- **Integration Tests**: Full request/response cycles
- **Contract Tests**: Schema validation
- **Load Tests**: Performance under concurrent load

## Deployment

### Vercel Configuration

```json
{
  "functions": {
    "api/server.ts": {
      "maxDuration": 10,
      "memory": 512
    }
  },
  "env": {
    "DATABASE_URL": "@database_url"
  }
}
```

### Database Migrations

Database schema managed through migrations:

```bash
# Run migrations
npm run migrate:up

# Rollback migrations
npm run migrate:down

# Create new migration
npm run migrate:create
```

## Troubleshooting

### Common Issues

#### Cold Start Delays

- **Symptom**: First request takes > 2 seconds
- **Solution**: Enable Vercel Pro for warmer functions

#### Database Timeouts

- **Symptom**: 500 errors after high traffic
- **Solution**: Increase connection pool size or add read replicas

#### Memory Leaks

- **Symptom**: Functions timeout after prolonged use
- **Solution**: Ensure proper Effect.scoped usage for resource cleanup

### Debug Information

Enable debug mode for detailed logging:

```bash
DEBUG=effect:* npm run dev
```

## Related Documentation

- [Effect-TS Documentation](https://effect.website)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [PostgreSQL Integration Guide](./PRODUCTION_DATABASE.md)
- [Architecture Overview](../architecture/ARCHITECTURE.md)
- [Service Patterns](../architecture/SERVICE_PATTERNS.md)
