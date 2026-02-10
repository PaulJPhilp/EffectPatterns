# @effect-patterns/ep-cli

> End-user CLI for the Effect Patterns Hub

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Effect](https://img.shields.io/badge/Effect-3.19+-purple.svg)](https://effect.website/)

Search, browse, and install Effect-TS patterns directly from your terminal. Built with `@effect/cli` for type-safe command parsing and Effect-native error handling.

## Installation

```bash
# npm
npm install -g @effect-patterns/ep-cli

# bun
bun add -g @effect-patterns/ep-cli

# pnpm
pnpm add -g @effect-patterns/ep-cli
```

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

### Pattern Authoring

```bash
# Scaffold a new pattern (interactive wizard)
ep pattern new
```

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

### Release Management

```bash
# Preview next release version and changelog
ep release preview

# Create a release (version bump, changelog, tag, push)
ep release create
```

### Admin / Publishing Pipeline

```bash
# Lint patterns for Effect-TS best practices
ep admin lint
ep admin lint --fix

# Validate pattern files
ep admin validate -v

# Run example tests
ep admin test

# Generate documentation
ep admin generate

# Run the full publishing pipeline (test -> validate -> generate -> ingest)
ep admin pipeline
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Set log level (`debug`, `info`, `warn`, `error`) | `info` |
| `DEBUG` | Enable debug logging | - |
| `VERBOSE` | Enable verbose logging | - |

## License

MIT
