# Effect Patterns API

Backend HTTP API for serving Effect-TS patterns and rules from the PostgreSQL database.

## Overview

This is a Vercel serverless function that provides REST endpoints for accessing Effect patterns and AI coding rules. All data is sourced from the PostgreSQL database, ensuring a single source of truth.

## Endpoints

### Health Check

```http
GET /health
```

Returns server status.

**Response:**

```json
{
  "status": "ok"
}
```

### List All Rules

```http
GET /api/v1/rules
```

Returns all patterns that have associated rules.

**Response:**

```json
[
  {
    "id": "pattern-slug",
    "title": "Pattern Title",
    "description": "Pattern description",
    "skillLevel": "intermediate",
    "useCase": ["error-handling", "testing"],
    "content": "Pattern content markdown"
  }
]
```

### Get Single Rule

```http
GET /api/v1/rules/{id}
```

Returns a specific pattern rule by ID (slug).

**Response:**

```json
{
  "id": "pattern-slug",
  "title": "Pattern Title",
  "description": "Pattern description",
  "skillLevel": "intermediate",
  "useCase": ["error-handling"],
  "content": "Pattern content markdown"
}
```

**Error (404):**

```json
{
  "error": "Rule not found"
}
```

## Development

### Local Testing

```bash
# Run API locally
bun run api:dev
```

```bash
# Test endpoint
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/rules
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@host:5432/effect_patterns
```

## Architecture

```text
API Request
    ↓
Effect Handler (with validation)
    ↓
Database Client
    ↓
Effect Pattern Repository
    ↓
PostgreSQL (effect_patterns table)
    ↓
Transformation to API format
    ↓
JSON Response
```

## Data Source

All rules and patterns are stored in the PostgreSQL database:

- **Table**: `effect_patterns`
- **Fields used**:
  - `slug` - Pattern identifier
  - `title` - Pattern name
  - `summary` - Pattern description
  - `skillLevel` - Difficulty level
  - `useCases` - Array of use cases
  - `content` - Full markdown content
  - `rule` - Rule metadata (JSONB)

## Error Handling

- **500**: Database connection error or internal server error
- **404**: Pattern/rule not found
- **400**: Invalid request parameters

## Deployment

Deployed to Vercel as a serverless function.

**Build Command:**

```bash
bun run toolkit:build
```

**Deployment:**

```bash
bun run deploy
```
