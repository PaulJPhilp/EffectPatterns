# Release Notes - v0.1.0

This is the first release of the Pattern Explorer ChatGPT App.

## Features

- Search for Effect patterns.
- Explain Effect patterns.
- Generate Effect pattern snippets.
- Secure endpoints with API key authentication.
- Widget for rich snippet display.

## Acceptance Checklist

- [ ] `ai-plugin.json` and `openapi.json` are hosted and reachable.
- [ ] JSON Schema is generated and used for function definitions.
- [ ] Widget is accessible via `templateUri` and sandboxed.
- [ ] Server endpoints validate inputs and call the MCP server.
- [ ] Responses include `traceId` in the body and `x-trace-id` header.
- [ ] Contract tests and integration tests pass in CI.
- [ ] README.md is present and clear.
