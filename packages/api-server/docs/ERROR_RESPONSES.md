# Tool Error Responses

This document shows structured error responses for non-elicitation errors (network failures, server errors, authentication errors, etc.).

**Format Parameter**: Both `search_patterns` and `get_pattern` tools accept a `format` parameter. Other tools (`list_analysis_rules`, `analyze_code`, `review_code`) always use default `format="markdown"` (clean error messages, no JSON blocks). For tools that support `format`, errors follow the same format gating as successful responses.

## Error Response Structure

All non-elicitation errors return structured error responses with `kind: "toolError:v1"`:

```typescript
{
  kind: "toolError:v1",
  code: string,           // Error code (see below)
  message: string,        // Human-readable error message
  retryable?: boolean,    // Whether the operation can be retried
  details?: Record<string, unknown>  // Additional error details
}
```

**Error Detection**: 
- **Canonical**: Parse JSON content block and check `kind === "toolError:v1"` (when `format="json"` or `format="both"`)
- **Fallback**: `structuredContent.kind === "toolError:v1"` (best-effort, may be dropped by MCP SDK)
- **Convenience**: `isError: true` flag may be present but is best-effort metadata (not officially part of MCP SDK)
- **Recommendation**: Errors follow the same `format` gating as other responses. For reliable structured error handling, call tools with `format="json"` or `format="both"` and parse the JSON content block. In default `format="markdown"`, responses are UX-first and may not include a JSON block.

**Format Gating**: Errors follow the same format gating as other responses:

| format | Human message block | JSON `toolError:v1` block |
|---|---:|---:|
| `markdown` (default) | ✅ | ❌ |
| `json` | ❌ | ✅ |
| `both` | ✅ | ✅ |

**Important**: Structured error payloads (`toolError:v1`) are only guaranteed when calling tools with `format="json"` or `format="both"`. In default `format="markdown"`, responses are UX-first and may omit JSON blocks.

**Note**: Human-facing error messages use `mimeType: "text/markdown"` for consistency with other content. Structured error data is delivered via JSON content block when `format="json"` or `format="both"`.

## Error Codes

- `NETWORK_ERROR` - Network/timeout failures (retryable: true)
- `SERVER_ERROR` - 5xx server errors (retryable: true)
- `CLIENT_ERROR` - 4xx client errors (retryable: false)
- `NOT_FOUND` - 404 errors (retryable: false)
- `AUTHENTICATION_ERROR` - 401/403 errors (retryable: false)
- `UNKNOWN_ERROR` - Fallback for unclassified errors (retryable: false)

## Example Responses

### Network Error (Timeout) - format="markdown" (default)

**Scenario**: API request times out or network connection fails

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Network error: Request timeout",
      "mimeType": "text/markdown"
    }
    // NO JSON content block when format="markdown" (default)
  ],
  "structuredContent": {
    // Best-effort/internal-only (may be dropped by MCP SDK)
    // For reliable structured error handling, use format="json" or format="both"
    "kind": "toolError:v1",
    "code": "NETWORK_ERROR",
    "message": "Network error: Request timeout",
    "retryable": true
  },
  "isError": true
}
```

**Note**: Default `format="markdown"` returns clean error message only (no JSON blob). For structured error handling, request `format="json"` or `format="both"`.

**Note**: `details.statusCode` is omitted when status code is not available (undefined values are not included in JSON).

### Authentication Error (401) - format="markdown" (default)

**Scenario**: Invalid or missing API key

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Authentication required: Missing or invalid API key",
      "mimeType": "text/markdown"
    }
    // NO JSON content block when format="markdown" (default)
  ],
  "structuredContent": {
    // Best-effort/internal-only (may be dropped by MCP SDK)
    // For reliable structured error handling, use format="json" or format="both"
    "kind": "toolError:v1",
    "code": "AUTHENTICATION_ERROR",
    "message": "Authentication required: Missing or invalid API key",
    "retryable": false,
    "details": {
      "statusCode": 401
    }
  },
  "isError": true
}
```

**Note**: Default `format="markdown"` returns clean error message only. For structured error handling, request `format="json"` or `format="both"`.

### Server Error (500) - format="markdown" (default)

**Scenario**: Internal server error

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Internal server error: Database connection failed",
      "mimeType": "text/markdown"
    }
    // NO JSON content block when format="markdown" (default)
  ],
  "structuredContent": {
    // Best-effort/internal-only (may be dropped by MCP SDK)
    // For reliable structured error handling, use format="json" or format="both"
    "kind": "toolError:v1",
    "code": "SERVER_ERROR",
    "message": "Internal server error: Database connection failed",
    "retryable": true,
    "details": {
      "statusCode": 500
    }
  },
  "isError": true
}
```

### Client Error (400) - format="markdown" (default)

**Scenario**: Invalid request parameters

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Invalid request: limit must be between 1 and 100",
      "mimeType": "text/markdown"
    }
    // NO JSON content block when format="markdown" (default)
  ],
  "structuredContent": {
    // Best-effort/internal-only (may be dropped by MCP SDK)
    // For reliable structured error handling, use format="json" or format="both"
    "kind": "toolError:v1",
    "code": "CLIENT_ERROR",
    "message": "Invalid request: limit must be between 1 and 100",
    "retryable": false,
    "details": {
      "statusCode": 400
    }
  },
  "isError": true
}
```

### Not Found (404) - format="markdown" (default)

**Scenario**: Pattern ID doesn't exist (but this triggers elicitation, not toolError)

**Note**: 404 for pattern IDs triggers elicitation (see `get_pattern` examples). This example shows a 404 for a different resource.

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Resource not found: /api/patterns/invalid-resource",
      "mimeType": "text/markdown"
    }
    // NO JSON content block when format="markdown" (default)
  ],
  "structuredContent": {
    // Best-effort/internal-only (may be dropped by MCP SDK)
    // For reliable structured error handling, use format="json" or format="both"
    "kind": "toolError:v1",
    "code": "NOT_FOUND",
    "message": "Resource not found: /api/patterns/invalid-resource",
    "retryable": false,
    "details": {
      "statusCode": 404
    }
  },
  "isError": true
}
```

### Unknown Error (Fallback) - format="markdown" (default)

**Scenario**: Unclassified error

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Unknown error occurred",
      "mimeType": "text/markdown"
    }
    // NO JSON content block when format="markdown" (default)
  ],
  "structuredContent": {
    // Best-effort/internal-only (may be dropped by MCP SDK)
    // For reliable structured error handling, use format="json" or format="both"
    "kind": "toolError:v1",
    "code": "UNKNOWN_ERROR",
    "message": "Unknown error occurred",
    "retryable": false
  },
  "isError": true
}
```

### Error Response with format="both"

**Example**: Same error as above, but with `format="both"` requested

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Network error: Request timeout",
      "mimeType": "text/markdown"
    },
    {
      "type": "text",
      "text": "{\n  \"kind\": \"toolError:v1\",\n  \"code\": \"NETWORK_ERROR\",\n  \"message\": \"Network error: Request timeout\",\n  \"retryable\": true\n}",
      "mimeType": "application/json"
    }
  ],
  "structuredContent": {
    // Best-effort/internal-only (may be dropped by MCP SDK)
    // Canonical structured error is in the JSON content block above
    "kind": "toolError:v1",
    "code": "NETWORK_ERROR",
    "message": "Network error: Request timeout",
    "retryable": true
  },
  "isError": true
}
```

**Note**: When `format="both"`, error responses include both the human-readable message and the JSON content block for programmatic access.

### Error Response with format="json"

**Example**: Same error as above, but with `format="json"` requested

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"kind\": \"toolError:v1\",\n  \"code\": \"NETWORK_ERROR\",\n  \"message\": \"Network error: Request timeout\",\n  \"retryable\": true\n}",
      "mimeType": "application/json"
    }
  ],
  "structuredContent": {
    // Best-effort/internal-only (may be dropped by MCP SDK)
    // Canonical structured error is in the JSON content block above
    "kind": "toolError:v1",
    "code": "NETWORK_ERROR",
    "message": "Network error: Request timeout",
    "retryable": true
  },
  "isError": true
}
```

**Note**: When `format="json"`, error responses include only the JSON content block (no human-readable message block). The error message is available in `structuredError.message` within the JSON block.

## Error Handling Guidelines

### For Clients

1. **Parse JSON content block** - Extract structured error from JSON content block (canonical source)
2. **Check `kind === "toolError:v1"`** - Validate error structure using schema validation
3. **Fallback: Check `structuredContent.kind`** - Best-effort fallback (may be dropped by MCP SDK)
4. **Optional: Check `isError` flag** - Best-effort metadata (may not be preserved by all MCP clients)
5. **Use `retryable` flag** - Determine if operation should be retried
6. **Display `message`** - Show human-readable error to user
7. **Log `code` and `details`** - For debugging

**Recommendation**: For reliable structured error handling, request `format="json"` or `format="both"` and parse the JSON content block. The `structuredContent` field is best-effort/internal-only and may be dropped by MCP SDK. The `mimeType` field is also best-effort and may be stripped by transports/clients.

**Example parsing** (when `format="json"` or `format="both"`):
```typescript
// Find JSON content block (only present when format includes JSON)
const jsonBlock = result.content.find(block => {
  try {
    const parsed = JSON.parse(block.text || "");
    return parsed && parsed.kind === "toolError:v1";
  } catch {
    return false;
  }
});
if (jsonBlock) {
  const error = JSON.parse(jsonBlock.text);
  // Use error.code, error.message, error.retryable, etc.
} else {
  // format="markdown" mode: only human-readable message available
  // structuredContent may be present but is best-effort
}
```

### Retry Logic

- **`retryable: true`**: Client may retry with exponential backoff
- **`retryable: false`**: Client should not retry (user action required)

### Error Code Semantics

- **`NETWORK_ERROR`**: Transient network issues, timeouts
- **`SERVER_ERROR`**: Server-side failures (may be transient)
- **`CLIENT_ERROR`**: Invalid request (fix request, don't retry)
- **`NOT_FOUND`**: Resource doesn't exist (may trigger elicitation for patterns)
- **`AUTHENTICATION_ERROR`**: Auth required (user must provide credentials)
- **`UNKNOWN_ERROR`**: Unclassified (log for investigation)

## Distinction: Errors vs Elicitation

- **Errors** (`toolError:v1`): System failures, invalid requests, auth issues
- **Elicitation** (`needsInput:v1`): Missing/ambiguous user input (not an error)

Both use structured responses, but elicitation is a normal part of the interaction flow, not a failure.

**Consistency**: `get_pattern` always returns elicitation (`needsInput:v1`) for 404 responses (pattern not found), never `toolError:v1` with `NOT_FOUND`. This ensures consistent UX - missing patterns are treated as input clarification, not system errors.
