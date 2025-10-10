# Integration Tests

Comprehensive end-to-end tests for the MCP server API endpoints.

## Running Integration Tests

### Prerequisites

1. **Set environment variables**:
```bash
export PATTERN_API_KEY="test-api-key"
export OTLP_ENDPOINT="http://localhost:4318/v1/traces"
```

2. **Start the development server**:
```bash
# From services/mcp-server
bun run dev
```

3. **Run integration tests** (in a separate terminal):
```bash
# From services/mcp-server
bun run test:integration

# Or with environment variables
PATTERN_API_KEY=test-api-key bun run test:integration
```

## What's Tested

### API Endpoints
- ✅ GET `/api/health` - Health check (no auth required)
- ✅ GET `/api/patterns` - Search patterns with filters
- ✅ GET `/api/patterns/:id` - Get pattern by ID
- ✅ POST `/api/generate` - Generate code snippets
- ✅ GET `/api/trace-wiring` - Get trace integration examples

### Authentication
- ✅ API key validation (header and query parameter)
- ✅ 401 responses for missing/invalid keys
- ✅ Authenticated vs unauthenticated endpoints

### Tracing
- ✅ Trace ID in response body
- ✅ Trace ID in `x-trace-id` header
- ✅ Trace ID consistency (body matches header)
- ✅ OTLP trace export to collector
- ✅ Service name in trace metadata
- ✅ Span creation for requests

### Business Logic
- ✅ Pattern search with fuzzy matching
- ✅ Category and difficulty filtering
- ✅ Result limiting
- ✅ Snippet generation with customization
- ✅ Module type support (ESM/CJS)
- ✅ Error handling (404, 400, 401)

## Test Structure

```
tests/
├── mock-otlp-server.ts        # Mock OTLP collector
├── integration/
│   ├── README.md               # This file
│   └── api.test.ts             # API endpoint tests
```

## Mock OTLP Collector

The tests include a lightweight HTTP server that mimics an OTLP collector:
- Receives trace exports on `POST /v1/traces`
- Stores traces in memory for verification
- Provides helpers to query collected traces

## Coverage

- **60+ integration tests** covering all API endpoints
- Authentication and authorization
- Trace ID propagation and OTLP export
- Request/response validation
- Error scenarios

## Notes

- Tests require a running Next.js dev server
- Mock OTLP collector runs on port 4318
- Tests use `fetch()` for HTTP requests
- Traces may take ~1 second to export (async)
