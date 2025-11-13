# @effect-patterns/cli

The command-line interface for Effect Patterns - search, discover, and install Effect-TS patterns from your terminal.

## Installation

```bash
bun install -g @effect-patterns/cli
```

Or with npm:

```bash
npm install -g @effect-patterns/cli
```

## Usage

### Search Patterns

```bash
# Search by keyword
ep search "error handling"

# Filter by skill level
ep list --skill-level intermediate

# Show pattern details
ep show handle-errors-with-catch
```

### Install AI Rules

```bash
# Install rules for Cursor
ep install add --tool cursor

# Install intermediate-level rules
ep install add --tool claude --skill-level intermediate

# Preview without installing
ep install add --tool windsurf --dry-run

# List supported tools
ep install list-tools
```

### Admin Commands

```bash
# Validate all patterns
ep admin validate

# Run all tests
ep admin test

# Generate AI rules
ep admin rules generate

# Run complete pipeline
ep admin pipeline
```

## Features

- **Search & Discover**: Find patterns by keyword, skill level, and use case
- **Pattern Details**: View comprehensive pattern documentation with examples
- **AI Tool Integration**: Install pattern rules for your favorite AI coding assistant
- **Admin Tools**: Manage pattern publishing and validation

## Links

- [Effect Patterns Hub](https://github.com/PaulJPhilp/Effect-Patterns)
- [Documentation](https://github.com/PaulJPhilp/Effect-Patterns/tree/main/docs)

## License

MIT
