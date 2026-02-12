# @effect-patterns/ep-cli

> End-user CLI for the Effect Patterns Hub

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Effect](https://img.shields.io/badge/Effect-3.19+-purple.svg)](https://effect.website/)

Search, browse, and install Effect-TS patterns directly from your terminal. Built with `@effect/cli` for type-safe command parsing and Effect-native error handling.

## Installation

```bash
# bun
bun add -g @effect-patterns/ep-cli
```

Requires Bun runtime.

## Commands

### Pattern Discovery

```bash
# Search patterns by keyword
ep search "retry"

# List all patterns with optional filters
ep list --difficulty intermediate --category error-handling

# Show detailed pattern information
ep show retry-with-backoff
```

### Install Rules

Install Effect pattern rules into your AI tool configuration.

```bash
# Add rules for a specific AI tool
ep install add --tool cursor
ep install add --tool cursor --skill-level intermediate --use-case error-handling

# Interactive rule selection
ep install add --tool cursor -i

# List supported AI tools
ep install list

# Show installed rules
ep install list --installed
```

Supported tools: `agents`, `cursor`, `vscode`, `windsurf`

### Skills Management

Manage and validate Claude Skills built from patterns.

```bash
# List all available skills
ep skills list

# Preview a skill's content
ep skills preview error-management

# Validate all skills
ep skills validate

# Show skill statistics
ep skills stats
```

## Maintainer Commands

Maintainer workflows (release, pattern authoring, publishing/admin commands) live in `@effect-patterns/ep-admin`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PATTERN_API_KEY` | API key for hosted Effect Patterns API (`x-api-key` header) | - |
| `EFFECT_PATTERNS_API_URL` | Base URL for Effect Patterns API | `https://effect-patterns-mcp.vercel.app` |
| `EP_API_TIMEOUT_MS` | HTTP timeout for API requests (milliseconds) | `10000` |
| `LOG_LEVEL` | Set log level (`debug`, `info`, `warn`, `error`) | `info` |
| `DEBUG` | Enable debug logging | - |
| `VERBOSE` | Enable verbose logging | - |

## License

MIT
