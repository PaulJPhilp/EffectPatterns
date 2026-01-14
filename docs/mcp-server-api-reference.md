# MCP Server API Reference

All endpoints require an API key.

- Header: `x-api-key: <PATTERN_API_KEY>`

Responses include:

- `traceId`: OpenTelemetry trace ID (may be empty)
- `timestamp`: ISO timestamp string

## POST /api/analyze-code

Analyze a single source file and return suggestions + findings.

### Request

```json
{
  "source": "string",
  "filename": "string (optional)",
  "analysisType": "validation | patterns | errors | all (optional)",
  "config": {
    "rules": {
      "<ruleId>": "off | warn | error",
      "<ruleId>": [
        "warn | error",
        {
          "severity": "low | medium | high (optional)",
          "options": { "<key>": "<any>" }
        }
      ]
    },
    "extends": ["string"],
    "ignore": ["string"],
    "include": ["string"]
  }
}
```

Notes:

- `analysisType` limits rule categories evaluated.
- `config.rules` allows disabling rules or overriding severity.

### Response

```json
{
  "suggestions": [
    {
      "id": "<ruleId>",
      "title": "string",
      "message": "string",
      "severity": "low | medium | high"
    }
  ],
  "findings": [
    {
      "id": "string",
      "ruleId": "<ruleId>",
      "title": "string",
      "message": "string",
      "severity": "low | medium | high",
      "filename": "string (optional)",
      "range": {
        "startLine": 1,
        "startCol": 1,
        "endLine": 1,
        "endCol": 1
      },
      "refactoringIds": ["<fixId>"]
    }
  ],
  "traceId": "string",
  "timestamp": "string"
}
```

### Example

Disable `async-await` and run patterns-only analysis:

```bash
curl -sS \
  -H "content-type: application/json" \
  -H "x-api-key: $PATTERN_API_KEY" \
  -d '{
    "filename": "src/foo.ts",
    "source": "import { Effect } from \"effect\";\n" \
      + "const foo = async () => Effect.succeed(1);\n",
    "analysisType": "patterns",
    "config": {
      "rules": {
        "async-await": "off"
      }
    }
  }' \
  http://localhost:3000/api/analyze-code
```

## POST /api/list-rules

List all governed rules, optionally applying config.

### Request

Body is optional. If provided:

```json
{
  "config": {
    "rules": {
      "<ruleId>": "off | warn | error",
      "<ruleId>": [
        "warn | error",
        {
          "severity": "low | medium | high (optional)",
          "options": { "<key>": "<any>" }
        }
      ]
    },
    "extends": ["string"],
    "ignore": ["string"],
    "include": ["string"]
  }
}
```

### Response

```json
{
  "rules": [
    {
      "id": "<ruleId>",
      "title": "string",
      "message": "string",
      "severity": "low | medium | high",
      "category": "string",
      "fixIds": ["<fixId>"]
    }
  ],
  "traceId": "string",
  "timestamp": "string"
}
```

### Example

Disable a rule in the listing:

```bash
curl -sS \
  -H "content-type: application/json" \
  -H "x-api-key: $PATTERN_API_KEY" \
  -d '{
    "config": {
      "rules": {
        "async-await": "off"
      }
    }
  }' \
  http://localhost:3000/api/list-rules
```

## POST /api/list-fixes

List all available automated fixes.

### Request

No body.

### Response

```json
{
  "fixes": [
    {
      "id": "<fixId>",
      "title": "string",
      "description": "string"
    }
  ],
  "traceId": "string",
  "timestamp": "string"
}
```

## POST /api/analyze-consistency

Analyze multiple files together for cross-file consistency issues.

### Request

```json
{
  "files": [
    {
      "filename": "string",
      "source": "string"
    }
  ]
}
```

### Response

```json
{
  "issues": [
    {
      "id": "string",
      "title": "string",
      "message": "string",
      "severity": "low | medium | high",
      "filenames": ["string"]
    }
  ],
  "traceId": "string",
  "timestamp": "string"
}
```

## POST /api/apply-refactoring

Preview or apply refactorings to in-memory files.

### Request

```json
{
  "refactoringId": "<fixId> (optional)",
  "refactoringIds": ["<fixId>"],
  "files": [
    {
      "filename": "string",
      "source": "string"
    }
  ],
  "preview": true
}
```

Notes:

- If `preview` is omitted or `true`, changes are not written.
- If `preview` is `false`, the server attempts to write changes to disk.

### Response

```json
{
  "applied": true,
  "changes": [
    {
      "filename": "string",
      "before": "string",
      "after": "string"
    }
  ],
  "traceId": "string",
  "timestamp": "string"
}
```
