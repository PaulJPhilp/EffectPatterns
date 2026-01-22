# Vercel Server API Quick Reference

## Endpoints Summary

| Method | Path | Description | Response |
| -------- | -------- | ------------- | ---------- |
| `GET` | `/` | API documentation | JSON with metadata |
| `GET` | `/health` | Health check | Status + timestamp |
| `GET` | `/api/v1/rules` | List all rules | Array of rule objects |
| `GET` | `/api/v1/rules/{id}` | Get single rule | Single rule object |

## Quick Examples

### Health Check

```bash
curl https://your-app.vercel.app/health
```

### List All Rules

```bash
curl https://your-app.vercel.app/api/v1/rules
```

### Get Specific Rule

```bash
curl https://your-app.vercel.app/api/v1/rules/async-await
```

## Response Formats

### Success Response

```json
{
  "status": 200,
  "data": { ... }
}
```

### Error Response

```json
{
  "error": "Rule not found",
  "code": "RULE_NOT_FOUND",
  "timestamp": "2026-01-21T17:00:00.000Z"
}
```

## Rule Object Structure

```json
{
  "id": "async-await",
  "title": "Async/Await Pattern",
  "description": "Proper async/await usage in Effect",
  "category": "async",
  "severity": "medium",
  "guidance": "Use Effect.gen() instead of async/await",
  "examples": [
    {
      "bad": "async function fetchData() { ... }",
      "good": "const fetchData = Effect.gen(function* () { ... })"
    }
  ]
}
```

## Error Codes

| Code | HTTP Status | Description |
| ------ | ------ | ------ |
| `RULE_NOT_FOUND` | 404 | Requested rule doesn't exist |
| `DATABASE_ERROR` | 500 | Database connection/query failed |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Rate Limits

- **Requests**: 100 per IP per 15 minutes
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- **Retry-After**: Included when rate limited

## Development Commands

```bash
# Local development
npm run dev

# Run tests
npm run test

# Deploy to Vercel
vercel --prod
```

## Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
API_VERSION=v1
NODE_ENV=production
LOG_LEVEL=info
```

## Related Files

The API is implemented in the MCP server package:

- `packages/mcp-server/app/api/` - Next.js API routes
- `packages/mcp-server/src/api/` - Route handlers and business logic
- `packages/mcp-server/src/services/` - Service implementations
- `packages/toolkit/src/repositories/` - Database operations
- `api/constants.ts` - API constants
