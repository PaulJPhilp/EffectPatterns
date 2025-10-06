# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Effect Patterns Hub is a community-driven knowledge base of practical, goal-oriented patterns for building robust applications with Effect-TS. The repository maintains Effect patterns as MDX files with executable TypeScript examples, validates them, and generates documentation and AI coding rules.

## Key Commands

### Development Workflow
```bash
# Run the main CLI tool
bun run ep [command]

# Validate all pattern files
bun run validate

# Run all TypeScript example tests
bun run test

# Full publishing pipeline (test → publish → validate → generate → rules)
bun run pipeline

# Generate README.md from patterns
bun run generate

# Generate AI coding rules from patterns
bun run rules

# Generate comprehensive rules file for Claude (patterns + CLAUDE.md)
bun run rules:claude

# Lint Effect patterns
bun run lint:effect
bun run lint        # Biome linter
```

### Testing Commands
```bash
# Run all tests
bun run test:all

# Individual test suites
bun run test                  # Main improved tests
bun run test:behavioral       # Behavioral tests
bun run test:integration      # Integration tests
bun run test:scripts          # Script tests (vitest)
```

### Content Management
```bash
# Ingest new patterns
bun run ingest

# QA workflow
bun run qa:process
bun run qa:report
bun run qa:status
```

### Runtime
- **Always use Bun instead of Node.js** (see `.cursor/rules/use-bun-instead-of-node-vite-npm-pnpm.mdc`)
- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun run <script>` instead of `npm run <script>`

## Architecture

### Content Structure

The repository follows a multi-stage content pipeline:

```
content/
├── new/
│   ├── raw/           # Unprocessed MDX patterns (input)
│   ├── processed/     # Intermediate stage
│   ├── published/     # Final validated MDX (output)
│   └── src/           # TypeScript example code
├── published/         # Legacy published patterns
└── archived/          # Archived patterns
```

**Key concept**: Patterns flow through stages: `raw/` → (ingest) → `processed/` → (publish) → `published/`

### Scripts Architecture

The `scripts/` directory contains the core automation:

```
scripts/
├── ep.ts                 # Main CLI entry point (@effect/cli)
├── publish/              # Publishing pipeline scripts
│   ├── pipeline.ts       # Orchestrates full pipeline
│   ├── test-improved.ts  # Validates TS examples
│   ├── publish.ts        # Converts raw → published
│   ├── validate-improved.ts  # Validates published files
│   ├── generate.ts       # Generates README
│   └── rules-improved.ts # Generates AI rules
├── ingest/               # Content ingestion
├── qa/                   # Quality assurance
└── __tests__/            # Script tests
```

**Pipeline flow**:
1. **test** → Run and validate all TypeScript examples
2. **publish** → Convert raw MDX to published MDX
3. **validate** → Validate published MDX files
4. **generate** → Generate README.md
5. **rules** → Generate AI coding rules

The pipeline stops if any step fails.

### Pattern File Structure

Each pattern consists of two files:

1. **MDX file** (`content/new/raw/*.mdx`): Documentation with frontmatter
   ```yaml
   ---
   id: pattern-name
   title: 'Pattern Title'
   skillLevel: 'beginner' | 'intermediate' | 'advanced'
   useCase: 'core-concepts' | 'error-management' | ...
   summary: 'Brief summary'
   ---
   ```

2. **TypeScript file** (`content/new/src/*.ts`): Executable example code
   - Must be runnable with `bun run`
   - Should demonstrate the pattern
   - Must not throw errors when executed

**Validation**: The validate script checks that every `.mdx` file has a corresponding `.ts` file with matching filename.

### The ep CLI

`scripts/ep.ts` is a unified CLI built with `@effect/cli`. It provides:

- `ep validate` - Validate patterns
- `ep test` - Run TypeScript tests
- `ep pipeline` - Full publishing pipeline
- `ep generate` - Generate README
- `ep rules` - Generate AI rules
- `ep lint [files]` - Lint Effect patterns
- `ep lint --apply` - Auto-fix linting issues
- `ep lint rules` - Show available linting rules
- `ep init` - Initialize configuration
- `ep pattern new` - Scaffold new pattern
- `ep release preview` - Preview next release
- `ep release create` - Create new release

### Effect Linter Rules

The repository includes custom Effect-TS linting rules (in `ep.ts`):

1. **effect-use-taperror** - Use `Effect.tapError` instead of `catchAll + gen` for logging
2. **effect-explicit-concurrency** - `Effect.all` must specify concurrency option
3. **effect-deprecated-api** - Detects deprecated APIs (Option.zip, Either.zip, etc.)
4. **effect-prefer-pipe** - Suggest `pipe()` for long method chains
5. **effect-stream-memory** - Catch non-streaming operations in stream patterns
6. **effect-error-model** - Suggest typed errors over generic Error

### Code Generation

The project generates two key artifacts:

1. **README.md** - Generated from pattern metadata (frontmatter)
   - Source: `scripts/publish/generate.ts`
   - Organized by categories/use cases
   - Includes skill levels and summaries

2. **AI Coding Rules** - Machine-readable rules for AI IDEs
   - Source: `scripts/publish/rules-improved.ts`
   - Output: `rules/` directory
   - Format: `.mdc` files with YAML frontmatter

3. **Claude Coding Rules** - Comprehensive rules combining patterns + repository guidance
   - Source: `scripts/publish/generate-claude-rules.ts`
   - Output: `rules/generated/rules-for-claude.md`
   - Combines: Auto-generated pattern rules + CLAUDE.md content
   - Run with: `bun run rules:claude`

## TypeScript Configuration

- Uses `NodeNext` module resolution
- Includes `@effect/language-service` plugin for enhanced type checking
- Strict mode is **disabled** (`strict: false`) to allow flexible pattern examples
- Target: ES2020

**Important**: The `@effect/language-service` plugin provides:
- Detection of floating Effects (not handled)
- Warnings for unnecessary `gen`
- Warnings for try/catch in gen blocks

## Testing Strategy

**Test execution**: All TypeScript examples in `content/new/src/` must:
1. Run successfully with `bun run <file>`
2. Not throw unhandled errors
3. Complete execution (not hang)

**Validation strategy**:
- Patterns are validated in parallel (CONCURRENCY = 10)
- Both structural (frontmatter, required fields) and content validation
- Broken link detection
- Code block validation

## Project Management

### Release Process
The project uses conventional commits and semantic versioning:

```bash
# Preview next release
bun run ep release preview

# Create and publish release
bun run ep release create
```

The release workflow:
1. Analyzes commits since last tag
2. Determines version bump (major/minor/patch)
3. Generates changelog
4. Updates package.json and CHANGELOG.md
5. Creates git commit and tag
6. Pushes to remote

### CI/CD

GitHub Actions workflow (`.github/workflows/generate-docs.yml`):
- Triggers on push to `main`
- Runs `bun run generate` (README)
- Runs `bun run rules` (AI rules)
- Auto-commits changes back to repo

## Important Patterns

### Effect Usage
This project extensively uses Effect-TS patterns:
- Services for dependency injection
- Effect.gen for sequential logic
- Layer for composing dependencies
- Context for accessing services
- Tagged errors for type-safe error handling

### Concurrency
- Pattern validation runs in parallel (10 concurrent workers)
- Use `Effect.all` with explicit `{ concurrency: N }` option
- Avoid `Effect.all` without concurrency specification

### File Operations
- Use `@effect/platform` FileSystem service
- Prefer Effect-wrapped file operations over node:fs
- Use `Bun.file` for Bun-specific operations

### Error Handling
- Use `Data.TaggedError` for custom error types
- Prefer typed errors over generic Error
- Use `Effect.catchTag` for specific error recovery

## Development Guidelines

1. **Always use Bun**: Never use Node.js, npm, pnpm, or yarn commands
2. **Test before committing**: Run `bun run test` to validate all examples
3. **Validate patterns**: Run `bun run validate` before publishing
4. **Full pipeline**: Run `bun run pipeline` for complete validation
5. **Lint Effect code**: Use `bun run lint:effect` to check Effect idioms
6. **Follow conventional commits**: For automated changelog generation

## File Locations

- Main CLI: `scripts/ep.ts`
- Publishing pipeline: `scripts/publish/pipeline.ts`
- Pattern validation: `scripts/publish/validate-improved.ts`
- Test runner: `scripts/publish/test-improved.ts`
- README generator: `scripts/publish/generate.ts`
- Rules generator: `scripts/publish/rules-improved.ts`
- Content: `content/new/` (active), `content/published/` (legacy)
- Generated output: `README.md`, `rules/`

## Key Dependencies

- **effect** (v3.17.14+) - Core Effect-TS library
- **@effect/cli** - Type-safe CLI building
- **@effect/platform** - Cross-platform APIs
- **@effect/platform-node** - Node.js platform layer
- **@effect/ai** - AI integration (Anthropic, OpenAI, Google)
- **effect-mdx** - MDX processing
- **gray-matter** - Frontmatter parsing
- **vitest** - Testing framework
- **@biomejs/biome** - Fast linter/formatter
