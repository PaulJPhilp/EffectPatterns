# Setup Guide

Complete guide for setting up and using the Effect Patterns Hub CLI.

## Prerequisites

- **Bun** v1.0+ - [Install Bun](https://bun.sh)
- **Git** - For cloning the repository

> **Note:** Currently, the CLI requires Bun. Support for npm and pnpm is planned for a future release.

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/patrady/effect-patterns.git
cd effect-patterns
```

### 2. Install Dependencies

```bash
bun install
```

This will install all required dependencies including:
- Effect-TS core libraries
- CLI framework (@effect/cli)
- Pattern validation tools
- Testing frameworks

### 3. Link the CLI Globally

```bash
bun link
```

This creates a global `ep` command that you can use from anywhere.

### 4. Verify Installation

```bash
ep --help
```

You should see the CLI help output with all available commands.

## Quick Verification

Run these commands to verify everything is working:

```bash
# Check CLI is accessible
ep --help

# List supported AI tools
ep install list

# Validate existing patterns (should pass)
ep admin validate
```

## Installing Rules into AI Tools

The Effect Patterns Hub can inject coding rules directly into your AI development tools.

### Supported Tools

| Tool | Command | File Path |
|------|---------|-----------|
| Cursor IDE | `ep install add --tool cursor` | `.cursor/rules.md` |
| AGENTS.md | `ep install add --tool agents` | `AGENTS.md` |
| Windsurf IDE | `ep install add --tool windsurf` | `.windsurf/rules.md` |
| Gemini AI | `ep install add --tool gemini` | `GEMINI.md` |
| Claude AI | `ep install add --tool claude` | `CLAUDE.md` |
| VS Code | `ep install add --tool vscode` | `.vscode/rules.md` |
| Kilo IDE | `ep install add --tool kilo` | `.kilo/rules.md` |
| Kira IDE | `ep install add --tool kira` | `.kira/rules.md` |
| Trae IDE | `ep install add --tool trae` | `.trae/rules.md` |
| Goose AI | `ep install add --tool goose` | `.goosehints` |

### Installation Examples

```bash
# Install all rules for Cursor IDE
ep install add --tool cursor

# Install only beginner-level rules
ep install add --tool cursor --skill-level beginner

# Install only error-management rules
ep install add --tool agents --use-case error-management

# Combine filters: beginner error-management rules
ep install add --tool goose --skill-level beginner --use-case error-management
```

### Filtering Options

You can filter which rules to install using:

**Skill Level:**
- `--skill-level beginner` - Basic patterns for getting started
- `--skill-level intermediate` - Patterns for common use cases
- `--skill-level advanced` - Complex patterns and edge cases

**Use Case:**
- `--use-case core-concepts` - Fundamental Effect-TS concepts
- `--use-case error-management` - Error handling patterns
- `--use-case resource-management` - Resource and lifecycle management
- `--use-case concurrency` - Concurrent and parallel operations
- `--use-case testing` - Testing patterns
- And more...

Run `ep install list` to see all available tools.

### Prerequisites for Rules Installation

Before installing rules, you need to start the Pattern Server:

```bash
# In a separate terminal
bun run server:dev
```

The server runs on `http://localhost:3001` by default.

If you need to use a different port:

```bash
ep install add --tool cursor --server-url http://localhost:PORT
```

## Creating New Patterns

### Interactive Wizard

```bash
ep pattern new
```

This launches an interactive wizard that will:
1. Ask for pattern metadata (title, skill level, use case, etc.)
2. Create an MDX documentation file
3. Create a TypeScript example file
4. Scaffold the pattern structure

### Manual Creation

If you prefer to create patterns manually:

1. Create `content/new/raw/{pattern-name}.mdx` with frontmatter:
   ```yaml
   ---
   id: pattern-name
   title: 'Pattern Title'
   skillLevel: beginner | intermediate | advanced
   useCase: core-concepts | error-management | ...
   summary: 'Brief description'
   ---
   ```

2. Create `content/new/src/{pattern-name}.ts` with executable TypeScript code

3. Validate:
   ```bash
   ep admin validate
   ```

## Development Workflow

### Validating Patterns

```bash
# Validate all patterns
ep admin validate

# Verbose output for debugging
ep admin validate --verbose
```

### Running Tests

```bash
# Test all TypeScript examples
ep admin test

# Run all test suites
bun run test:all

# Verbose output
ep admin test --verbose
```

### Full Publishing Pipeline

```bash
# Run complete pipeline: test → publish → validate → generate → rules
ep admin pipeline

# Verbose output
ep admin pipeline --verbose
```

This runs:
1. **Test** - Validates all TypeScript examples execute correctly
2. **Publish** - Converts raw patterns to published format
3. **Validate** - Checks all published patterns
4. **Generate** - Creates README.md from pattern metadata
5. **Rules** - Generates AI coding rules

### Generating Documentation

```bash
# Generate README.md from patterns
ep admin generate

# Generate AI coding rules
ep admin rules generate
```

## Release Management

### Preview Next Release

```bash
ep admin release preview
```

This analyzes commits since the last tag and shows:
- Recommended version bump (major/minor/patch)
- Draft changelog
- Commits included in the release

### Create Release

```bash
ep admin release create
```

This will:
1. Determine version bump from conventional commits
2. Generate changelog
3. Update `package.json` and `docs/reference/CHANGELOG.md`
4. Create git commit and tag
5. Push to remote

**Important**: Use [conventional commits](https://www.conventionalcommits.org/) format:

```bash
feat: add new error recovery pattern     # Minor version bump
fix: correct typo in documentation       # Patch version bump
feat!: change API structure              # Major version bump

# With body
feat: add support for streaming patterns

Add Stream.fromAsyncIterable pattern with examples
demonstrating memory-efficient data processing.
```

## Troubleshooting

### `ep: command not found`

**Solution**: Run `bun link` in the project directory

### Pattern Server Not Running

**Error**: "Cannot connect to Pattern Server"

**Solution**: Start the server in a separate terminal:
```bash
bun run server:dev
```

### Validation Failures

**Error**: "Pattern validation failed"

**Solution**: Run with verbose flag to see details:
```bash
ep admin validate --verbose
```

Common issues:
- Missing `.ts` file for `.mdx` pattern
- Invalid frontmatter fields
- TypeScript example doesn't execute
- Broken links in MDX

### Tests Failing

**Error**: "Tests failed with errors"

**Solution**:
1. Check if TypeScript file runs directly:
   ```bash
   bun run content/new/src/{pattern-name}.ts
   ```

2. Check for unhandled errors or hanging processes

3. Verify all dependencies are installed:
   ```bash
   bun install
   ```

### Permission Denied

**Error**: "Permission denied" when running `ep`

**Solution**: Make the script executable:
```bash
chmod +x scripts/ep.ts
```

## Configuration

### Custom Server URL

If the Pattern Server runs on a different port:

```bash
ep install add --tool cursor --server-url http://localhost:3002
```

### Verbose Output

Add `--verbose` or `-v` to any command for detailed output:

```bash
ep admin validate --verbose
ep admin test -v
ep admin pipeline --verbose
```

## Environment Variables

The CLI respects the following environment variables:

- **TTY detection** - Automatically disables spinners in non-interactive environments (CI/CD)
- **Color output** - Automatically disables colors when piping to files

## Uninstalling

To remove the global `ep` command:

```bash
bun unlink
```

To completely remove the project:

```bash
cd ..
rm -rf effect-patterns
```

## Getting Help

### CLI Help

```bash
# General help
ep --help

# Command-specific help
ep install --help
ep pattern --help
ep admin --help
```

### Documentation

- **README.md** - Overview and pattern catalog
- **CLAUDE.md** - Claude Code specific guidance
- **GEMINI.md** - Gemini AI specific guidance
- **AGENTS.md** - General AI agent guidance

### Common Commands Reference

```bash
# Installation
ep install list                                           # List supported tools
ep install add --tool cursor                              # Install all rules
ep install add --tool cursor --skill-level beginner       # Filter by skill level
ep install add --tool agents --use-case error-management  # Filter by use case

# Pattern Management
ep pattern new                            # Create new pattern

# Quality Assurance
ep admin validate                         # Validate patterns
ep admin test                             # Test examples
ep admin pipeline                         # Full pipeline

# Documentation Commands
ep admin generate                         # Generate README
ep admin rules generate                   # Generate AI rules

# Release Management
ep admin release preview                  # Preview release
ep admin release create                   # Create release
```

## Next Steps

1. **Install rules into your AI tool**:
   ```bash
   ep install add --tool cursor
   ```

2. **Explore existing patterns** in `content/new/published/`

3. **Create your first pattern**:
   ```bash
   ep pattern new
   ```

4. **Contribute** by submitting patterns via pull request

## Contributing

See the main [README.md](./README.md) for contribution guidelines.

## Support

For issues and questions:
- **GitHub Issues**: https://github.com/patrady/effect-patterns/issues
- **Discussions**: https://github.com/patrady/effect-patterns/discussions
