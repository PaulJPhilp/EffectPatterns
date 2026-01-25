# Example Tool Responses

This document shows **actual response objects** (valid JSON) for each tool and scenario.

**Important**: All `undefined` values are omitted (not included in JSON). All examples are valid JSON.

## 1. `search_patterns` - Normal Response (format="markdown" default)

**Request:**
```json
{
  "q": "error",
  "limit": 5
}
```

**Note**: `format` defaults to `"markdown"` if not specified.

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Effect Pattern Search Results for \"error\"\n\nFound **5** matching patterns. Detailed documentation for the top results follows. Use pattern IDs from the Index with 'get_pattern' for additional deep-dives.\n\n## Index\n\n<!-- kind:pattern-index:v1 -->\n| Pattern | Category | Difficulty | Tags |\n| :--- | :--- | :--- | :--- |\n| **Error Handling with Match** (`error-handling-match`) | error-handling | beginner | Effect.match, error-handling |\n| **Error Handling with catchTag** (`error-handling-catch-tag`) | error-handling | intermediate | Effect.catchTag, error-handling |\n| **Service Error Handling** (`service-error-handling`) | service | intermediate | Effect.Service, error-handling |\n| **Validation Errors** (`validation-errors`) | validation | beginner | Effect, validation |\n| **Error Recovery** (`error-recovery`) | error-handling | advanced | Effect.retry, error-handling |\n\n## Top 10 Patterns\n\n# Error Handling with Match\n\n<!-- kind:pattern-card:v1 -->\n**Category:** error-handling | **Difficulty:** beginner\n\n**Use when:** You need to handle multiple error types in a type-safe way.\n\n**API:** `Effect.match`\n\n**Example:**\n\n```typescript\nexport const handleError = Effect.match({\n  onFailure: (error) => Effect.succeed(`Error: ${error}`),\n  onSuccess: (value) => Effect.succeed(`Success: ${value}`)\n});\n```\n\n**Notes:**\n\n- Use Effect.match for exhaustive error handling\n- Provides type safety for error cases\n\n# Error Handling with catchTag\n\n<!-- kind:pattern-card:v1 -->\n**Category:** error-handling | **Difficulty:** intermediate\n\n**Use when:** You need to catch specific error types.\n\n**API:** `Effect.catchTag`\n\n**Example:**\n\n```typescript\nconst result = yield* operation.pipe(\n  Effect.catchTag(\"NetworkError\", (e) => Effect.succeed(\"fallback\"))\n);\n```\n\n# Service Error Handling\n\n<!-- kind:pattern-card:v1 -->\n**Category:** service | **Difficulty:** intermediate\n\n**Use when:** Handling errors in Effect services.\n\n**API:** `Effect.Service`\n\n**Example:**\n\n```typescript\nexport class MyService extends Effect.Service<MyService>()(\n  \"MyService\",\n  {\n    sync: () => ({\n      handleError: (error) => Effect.succeed(\"handled\")\n    })\n  }\n);\n```",
      "mimeType": "text/markdown"
    }
  ],
  "structuredContent": {
    "kind": "patternSearchResults:v1",
    "query": {
      "q": "error",
      "limit": 5,
      "format": "markdown"
    },
    "metadata": {
      "totalCount": 5,
      "categories": {
        "error-handling": 3,
        "validation": 1,
        "service": 1
      },
      "difficulties": {
        "beginner": 2,
        "intermediate": 2,
        "advanced": 1
      },
      "renderedCards": 10,
      "renderedCardIds": [
        "error-handling-match",
        "error-handling-catch-tag",
        "service-error-handling"
      ],
      "contractMarkers": {
        "index": 1,
        "cards": 3,
        "version": "v1"
      }
    },
    "patterns": [
      {
        "id": "error-handling-match",
        "title": "Error Handling with Match",
        "category": "error-handling",
        "difficulty": "beginner",
        "description": "Use Effect.match to handle errors in a type-safe way. This pattern provides exhaustive error handling with type safety.",
        "tags": ["Effect.match", "error-handling"]
      },
      {
        "id": "error-handling-catch-tag",
        "title": "Error Handling with catchTag",
        "category": "error-handling",
        "difficulty": "intermediate",
        "description": "Use Effect.catchTag for type-safe error handling of specific error types.",
        "tags": ["Effect.catchTag", "error-handling"]
      },
      {
        "id": "service-error-handling",
        "title": "Service Error Handling",
        "category": "service",
        "difficulty": "intermediate",
        "description": "Handle errors in Effect services using proper error types and service composition.",
        "tags": ["Effect.Service", "error-handling"]
      },
      {
        "id": "validation-errors",
        "title": "Validation Errors",
        "category": "validation",
        "difficulty": "beginner",
        "description": "Handle validation errors with Effect and Schema validation.",
        "tags": ["Effect", "validation"]
      },
      {
        "id": "error-recovery",
        "title": "Error Recovery",
        "category": "error-handling",
        "difficulty": "advanced",
        "description": "Implement error recovery patterns using Effect.retry and scheduling.",
        "tags": ["Effect.retry", "error-handling"]
      }
    ]
  }
}
```

**Note**: 
- `patterns[]` contains ALL 5 matching patterns. Only the first 10 are rendered as markdown cards (indicated by `renderedCardIds`).
- **No JSON content block** is included when `format="markdown"` (default). The `structuredContent` field is provided for internal use but may be dropped by MCP SDK.
- To get structured content programmatically, use `format="json"` or `format="both"`.

## 2. `search_patterns` - Format "both"

**Request:**
```json
{
  "q": "service",
  "format": "both"
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Effect Pattern Search Results for \"service\"\n\nFound **3** matching patterns. Detailed documentation for the top results follows. Use pattern IDs from the Index with 'get_pattern' for additional deep-dives.\n...",
      "mimeType": "text/markdown"
    },
    {
      "type": "text",
      "text": "{\n  \"kind\": \"patternSearchResults:v1\",\n  \"query\": {\n    \"q\": \"service\",\n    \"format\": \"both\"\n  },\n  \"metadata\": {\n    \"totalCount\": 3,\n    \"categories\": {\n      \"service\": 3\n    },\n    \"difficulties\": {\n      \"intermediate\": 3\n    },\n    \"renderedCards\": 3,\n    \"renderedCardIds\": [\"effect-service\", \"service-layer\", \"service-composition\"],\n    \"contractMarkers\": {\n      \"index\": 1,\n      \"cards\": 3,\n      \"version\": \"v1\"\n    }\n  },\n  \"patterns\": [\n    {\n      \"id\": \"effect-service\",\n      \"title\": \"Effect.Service Pattern\",\n      \"category\": \"service\",\n      \"difficulty\": \"intermediate\",\n      \"description\": \"Create reusable services using Effect.Service for dependency injection and testability.\",\n      \"tags\": [\"Effect.Service\", \"dependency-injection\"]\n    },\n    {\n      \"id\": \"service-layer\",\n      \"title\": \"Service Layer Pattern\",\n      \"category\": \"service\",\n      \"difficulty\": \"intermediate\",\n      \"description\": \"Compose services using Effect layers for modular architecture.\",\n      \"tags\": [\"Layer\", \"service\"]\n    },\n    {\n      \"id\": \"service-composition\",\n      \"title\": \"Service Composition\",\n      \"category\": \"service\",\n      \"difficulty\": \"intermediate\",\n      \"description\": \"Compose multiple services together using Effect's composition patterns.\",\n      \"tags\": [\"Effect\", \"composition\"]\n    }\n  ]\n}",
      "mimeType": "application/json"
    }
  ],
  "structuredContent": {
    "kind": "patternSearchResults:v1",
    "query": {
      "q": "service",
      "format": "both"
    },
    "metadata": {
      "totalCount": 3,
      "categories": {
        "service": 3
      },
      "difficulties": {
        "intermediate": 3
      },
      "renderedCards": 10,
      "renderedCardIds": ["effect-service", "service-layer", "service-composition"],
      "contractMarkers": {
        "index": 1,
        "cards": 3,
        "version": "v1"
      }
    },
    "patterns": [
      {
        "id": "effect-service",
        "title": "Effect.Service Pattern",
        "category": "service",
        "difficulty": "intermediate",
        "description": "Create reusable services using Effect.Service for dependency injection and testability.",
        "tags": ["Effect.Service", "dependency-injection"]
      },
      {
        "id": "service-layer",
        "title": "Service Layer Pattern",
        "category": "service",
        "difficulty": "intermediate",
        "description": "Compose services using Effect layers for modular architecture.",
        "tags": ["Layer", "service"]
      },
      {
        "id": "service-composition",
        "title": "Service Composition",
        "category": "service",
        "difficulty": "intermediate",
        "description": "Compose multiple services together using Effect's composition patterns.",
        "tags": ["Effect", "composition"]
      }
    ]
  }
}
```

**Note**: When `format="both"`, we return markdown blocks + JSON content block. The JSON content block contains the structured payload and is the canonical source for programmatic access (MCP-supported surface). The `structuredContent` field is best-effort/internal-only and may be dropped by MCP SDK.

## 3. `search_patterns` - Format "json"

**Request:**
```json
{
  "q": "concurrency",
  "format": "json"
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"kind\": \"patternSearchResults:v1\",\n  \"query\": {\n    \"q\": \"concurrency\"\n  },\n  \"metadata\": {\n    \"totalCount\": 8,\n    \"categories\": {\n      \"concurrency\": 8\n    },\n    \"difficulties\": {\n      \"intermediate\": 5,\n      \"advanced\": 3\n    },\n    \"renderedCards\": 0,\n    \"renderedCardIds\": [],\n    \"contractMarkers\": {\n      \"index\": 0,\n      \"cards\": 0,\n      \"version\": \"v1\"\n    }\n  },\n  \"patterns\": [\n    {\n      \"id\": \"effect-all\",\n      \"title\": \"Effect.all Pattern\",\n      \"category\": \"concurrency\",\n      \"difficulty\": \"intermediate\",\n      \"description\": \"Run multiple effects in parallel using Effect.all.\",\n      \"tags\": [\"Effect.all\", \"concurrency\"]\n    },\n    {\n      \"id\": \"effect-forEach\",\n      \"title\": \"Effect.forEach Pattern\",\n      \"category\": \"concurrency\",\n      \"difficulty\": \"intermediate\",\n      \"description\": \"Process collections in parallel with controlled concurrency.\",\n      \"tags\": [\"Effect.forEach\", \"concurrency\"]\n    }\n  ]\n}",
      "mimeType": "application/json"
    }
  ],
  "structuredContent": {
    "kind": "patternSearchResults:v1",
    "query": {
      "q": "concurrency",
      "format": "json"
    },
    "metadata": {
      "totalCount": 8,
      "categories": {
        "concurrency": 8
      },
      "difficulties": {
        "intermediate": 5,
        "advanced": 3
      },
      "renderedCards": 0,
      "renderedCardIds": [],
      "contractMarkers": {
        "index": 0,
        "cards": 0,
        "version": "v1"
      }
    },
    "patterns": [
      {
        "id": "effect-all",
        "title": "Effect.all Pattern",
        "category": "concurrency",
        "difficulty": "intermediate",
        "description": "Run multiple effects in parallel using Effect.all.",
        "tags": ["Effect.all", "concurrency"]
      },
      {
        "id": "effect-forEach",
        "title": "Effect.forEach Pattern",
        "category": "concurrency",
        "difficulty": "intermediate",
        "description": "Process collections in parallel with controlled concurrency.",
        "tags": ["Effect.forEach", "concurrency"]
      }
    ]
  }
}
```

**Note**: The JSON content block contains valid JSON (no `undefined`, no placeholders). The `structuredContent` field contains the same data for programmatic access.

## 4. `search_patterns` - Elicitation (Empty Query)

**Request:**
```json
{
  "q": ""
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Search Query Needed\n\nWhat pattern are you looking for? Please provide a search query.",
      "mimeType": "text/markdown"
    }
  ],
  "structuredContent": {
    "kind": "needsInput:v1",
    "type": "elicitation",
    "message": "What pattern are you looking for? Please provide a search query.",
    "needsInput": {
      "fields": ["q"],
      "reason": "Search query is required to find relevant patterns",
      "suggestions": {
        "q": [
          "error handling",
          "service pattern",
          "concurrency",
          "resource management"
        ]
      }
    }
  }
}
```

## 5. `search_patterns` - Elicitation (Too Broad)

**Request:**
```json
{
  "q": "effect",
  "limit": 100
}
```

**Note**: Returns >20 results without filters, triggers elicitation.

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Narrow Your Search\n\nFound 45 patterns. Would you like to narrow your search by category or difficulty?\n\n**Available filters:**\n- Category: error-handling, service, validation, composition, concurrency, streams, resource, scheduling\n- Difficulty: beginner, intermediate, advanced",
      "mimeType": "text/markdown"
    }
  ],
  "structuredContent": {
    "kind": "needsInput:v1",
    "type": "elicitation",
    "message": "Found 45 patterns. Would you like to narrow your search by category or difficulty?",
    "needsInput": {
      "fields": ["category", "difficulty"],
      "reason": "Too many results (45). Narrowing filters will help find the right pattern.",
      "suggestions": {
        "category": [
          "error-handling",
          "service",
          "validation",
          "composition",
          "concurrency",
          "streams",
          "resource",
          "scheduling"
        ],
        "difficulty": [
          "beginner",
          "intermediate",
          "advanced"
        ]
      }
    },
    "options": [
      {
        "label": "error-handling",
        "value": "error-handling",
        "description": "Filter by error-handling category",
        "field": "category"
      },
      {
        "label": "service",
        "value": "service",
        "description": "Filter by service category",
        "field": "category"
      },
      {
        "label": "beginner",
        "value": "beginner",
        "description": "Filter by beginner difficulty",
        "field": "difficulty"
      },
      {
        "label": "intermediate",
        "value": "intermediate",
        "description": "Filter by intermediate difficulty",
        "field": "difficulty"
      },
      {
        "label": "advanced",
        "value": "advanced",
        "description": "Filter by advanced difficulty",
        "field": "difficulty"
      }
    ]
  }
}
```

**Note**: Options are grouped by `field` so clients can render separate dropdowns for category and difficulty.

## 6. `get_pattern` - Normal Response

**Request:**
```json
{
  "id": "effect-service"
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "# Effect.Service Pattern\n\n<!-- kind:pattern-card:v1 -->\n**Category:** service | **Difficulty:** intermediate\n\n**Use when:** You need to create reusable, testable services with dependency injection.\n\n**API:** `Effect.Service`\n\n**Example:**\n\n```typescript\nexport class MyService extends Effect.Service<MyService>()(\n  \"MyService\",\n  {\n    sync: () => ({\n      method: () => Effect.succeed(\"result\")\n    })\n  }\n);\n```\n\n**Notes:**\n\n- Use Effect.Service for dependency injection\n- Provides testability and modularity",
      "mimeType": "text/markdown"
    }
  ],
  "structuredContent": {
    "kind": "patternDetails:v1",
    "id": "effect-service",
    "title": "Effect.Service Pattern",
    "category": "service",
    "difficulty": "intermediate",
    "summary": "Create reusable services using Effect.Service for dependency injection and testability.",
    "description": "Effect.Service provides a powerful way to create reusable, testable services with dependency injection. Services are defined using the Effect.Service class and can be composed using Effect layers.",
    "tags": ["Effect.Service", "dependency-injection"],
    "useGuidance": {
      "useWhen": "You need to create reusable, testable services with dependency injection",
      "avoidWhen": "For simple one-off operations that don't need dependency injection"
    },
    "sections": [
      {
        "title": "Description",
        "content": "Effect.Service provides a powerful way to create reusable, testable services...",
        "type": "description"
      },
      {
        "title": "Example",
        "content": "export class MyService extends Effect.Service<MyService>()(...)",
        "type": "example"
      }
    ],
    "examples": [
      {
        "code": "export class MyService extends Effect.Service<MyService>()(\n  \"MyService\",\n  {\n    sync: () => ({\n      method: () => Effect.succeed(\"result\")\n    })\n  }\n);",
        "language": "typescript",
        "description": "Basic service definition"
      }
    ],
    "provenance": {
      "source": "Effect Patterns API",
      "timestamp": "2026-01-22T21:30:00.000Z",
      "version": "pps-v2",
      "marker": "v1"
    }
  }
}
```

## 7. `get_pattern` - Invalid ID (404)

**Request:**
```json
{
  "id": "definitely-does-not-exist-12345"
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Pattern Not Found\n\nPattern \"definitely-does-not-exist-12345\" not found. Please provide a valid pattern ID.\n\n**Did you mean:**\n- `effect-service`\n- `error-handling-match`\n- `service-layer`\n- `error-handling-catch-tag`\n- `validation-schema`",
      "mimeType": "text/markdown"
    }
  ],
  "structuredContent": {
    "kind": "needsInput:v1",
    "type": "elicitation",
    "message": "Pattern \"definitely-does-not-exist-12345\" not found. Please provide a valid pattern ID.",
    "needsInput": {
      "fields": ["id"],
      "reason": "Pattern ID \"definitely-does-not-exist-12345\" is invalid or does not exist",
      "suggestions": {
        "id": [
          "effect-service",
          "error-handling-match",
          "service-layer",
          "error-handling-catch-tag",
          "validation-schema"
        ]
      }
    },
    "options": [
      {
        "label": "effect-service",
        "value": "effect-service",
        "description": "Pattern ID: effect-service",
        "field": "id"
      },
      {
        "label": "error-handling-match",
        "value": "error-handling-match",
        "description": "Pattern ID: error-handling-match",
        "field": "id"
      },
      {
        "label": "service-layer",
        "value": "service-layer",
        "description": "Pattern ID: service-layer",
        "field": "id"
      },
      {
        "label": "error-handling-catch-tag",
        "value": "error-handling-catch-tag",
        "description": "Pattern ID: error-handling-catch-tag",
        "field": "id"
      },
      {
        "label": "validation-schema",
        "value": "validation-schema",
        "description": "Pattern ID: validation-schema",
        "field": "id"
      }
    ]
  }
}
```

## Notes

- **All `undefined` values are omitted** - Keys are not included in JSON if value is undefined
- **All timestamps use ISO 8601 format**: `2026-01-22T21:30:00.000Z`
- **All structured outputs include `kind` discriminator** for type-safe parsing
- **`patterns[]` in search results contains ALL matches**, not just rendered cards
- **`metadata.renderedCardIds`** lists which patterns were rendered as cards (in order)
- **`metadata.renderedCards`** indicates how many cards are rendered in markdown
- **Format gating**:
  - `format="markdown"` (default): Returns markdown blocks only (NO JSON content block)
  - `format="json"`: Returns JSON content block only
  - `format="both"`: Returns markdown blocks + JSON content block
- **Structured content**: The JSON content block (when present) is the canonical source for programmatic access. The `structuredContent` field is best-effort/internal-only and may be dropped by MCP SDK.
- **MIME types**: The `mimeType` field is set by the server but may be stripped by transports/clients. Clients must not depend on `mimeType` for content identification. Use schema-validated JSON parsing to identify structured content blocks.
- **Search results use "card summary"**: Only id/title/category/difficulty/description/tags (no examples/useCases/relatedPatterns)
- **Full details**: Use `get_pattern` for examples, sections, useGuidance, etc.
- **Elicitation `fields`**: Array of field names (not single string)
- **Elicitation `suggestions`**: Object keyed by field name (not flat array)
- **Options include `field`**: So clients can group/separate by field type
- **Rendered Card IDs**: Always match first K patterns in index order: `renderedCardIds === patterns.slice(0, renderedCards).map(p => p.id)`
- **Contract Validation**: Server validates `contractMarkers.cards === renderedCardIds.length` and logs warnings if mismatched
- **Format Echo**: Query includes resolved `format` value for debugging and traceability
