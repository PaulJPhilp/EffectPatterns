# Effect Patterns Hub

A community-driven knowledge base of practical, goal-oriented patterns for building robust applications with Effect-TS.

## Overview

Effect Patterns Hub is a comprehensive resource for developers learning and mastering Effect-TS. The project provides:

- **[EffectTalk.dev](https://effecttalk.dev/)** - Browse 700+ patterns, take guided tours, and run code in the browser
- **700+ Curated Patterns** - Goal-oriented, production-ready patterns with TypeScript examples
- **CLI Tool (`ep`)** - Search, discover, and install patterns from the command line
- **Effect Patterns Toolkit** - Type-safe library for pattern operations
- **AI Coding Rules** - Machine-readable rules for 10+ AI coding tools

## Features

### Pattern Library

Browse 700+ patterns organized by:

- **Skill Level**: Beginner → Intermediate → Advanced
- **Use Case**: Error Handling, Concurrency, Data Modeling, HTTP APIs, etc.
- **Tags**: Searchable, categorized concepts

Each pattern includes:

- Clear use case description
- Working TypeScript example
- Good practices vs. anti-patterns
- Rationale and trade-offs
- Related patterns

### CLI Tool

The `ep` command-line tool provides:

See the CLI documentation: **[packages/ep-cli/README.md](../../packages/ep-cli/README.md)**.

```bash
# Search patterns
ep search "retry"

# Show pattern details
ep show retry-based-on-specific-errors

# Install AI rules for your coding tool
ep install add --tool cursor --skill-level intermediate

# List all patterns
ep list --difficulty advanced
```

### Effect Patterns Toolkit

A pure Effect library for pattern operations:

```typescript
import {
  searchPatterns,
  getPatternById,
  buildSnippet,
} from "@effect-patterns/toolkit";

// Search patterns
const results =
  yield *
  searchPatterns({
    query: "error handling",
    skillLevel: "intermediate",
  });

// Generate code snippet
const snippet =
  yield *
  buildSnippet({
    patternId: "retry-with-backoff",
    customName: "retryRequest",
  });
```

### AI Coding Rules

Auto-generated coding rules for AI tools:

- Claude Code (377KB, 11,308 lines)
- Cursor
- Windsurf
- GitHub Copilot
- And 6 more tools

Generated from patterns using `bun run rules`

## Installation

### Prerequisites

- **Bun** (v1.0+) - Recommended JavaScript runtime
- **Node.js** (v18+) - Alternative runtime
- **TypeScript** (5.8+)

### Setup

```bash
# Clone the repository
git clone https://github.com/PaulJPhilp/Effect-Patterns.git
cd Effect-Patterns

# Install dependencies
bun install

# Build the toolkit
bun run toolkit:build

# Run tests
bun test
```

### Using the CLI

#### Install CLI Globally (Recommended)

The `ep` CLI is published on npm as `@effect-patterns/ep-cli`:

```bash
# Install globally with bun (recommended)
bun add -g @effect-patterns/ep-cli

# Or with npm
npm install -g @effect-patterns/ep-cli

# Verify installation
ep --version

# Use anywhere
ep search "error handling"
ep list --difficulty intermediate
ep show handle-errors-with-catch
ep install add --tool cursor
```

## Usage

### Search Patterns

```bash
# Search by keyword
ep search "error handling"

# Filter by difficulty
ep list --difficulty intermediate

# Show pattern details
ep show handle-errors-with-catch
```

### Install AI Rules

```bash
# Install rules for Cursor
ep install add --tool cursor

# Install intermediate-level rules for VS Code
ep install add --tool vscode --skill-level intermediate

# Interactive rule selection for Windsurf
ep install add --tool windsurf -i

# List supported tools
ep install list
```

### Create New Patterns

```bash
# 1. Create pattern files in content/new/
mkdir -p content/new/src
touch content/new/src/my-pattern.ts
touch content/new/my-pattern.mdx

# 2. Write TypeScript example
# Edit content/new/src/my-pattern.ts

# 3. Fill out MDX template with frontmatter
# Edit content/new/my-pattern.mdx

# 4. Run ingestion pipeline
bun run ingest

# 5. Run full publishing pipeline
bun run pipeline
```

## Project Structure

```
Effect-Patterns/
├── content/
│   ├── published/         # Published patterns (150+ MDX files)
│   ├── new/              # Patterns in development
│   ├── src/              # TypeScript examples
│   └── raw/              # Raw pattern data
│
├── packages/
│   └── toolkit/          # Effect Patterns Toolkit
│
├── scripts/
│   ├── ep.ts             # CLI entry point
│   ├── publish/          # Publishing pipeline
│   ├── ingest/           # Pattern ingestion
│   └── qa/               # Quality assurance
│
├── rules/
│   └── generated/        # AI coding rules
│
└── docs/                 # Documentation
    ├── guides/           # User guides
    └── implementation/   # Technical docs
```

## Development

### Common Commands

```bash
# Pattern Management
bun run ingest              # Ingest new patterns
bun run pipeline            # Full publishing pipeline
bun run validate            # Validate pattern structure
bun run publish             # Publish validated patterns

# Testing
bun test                    # Run all tests
bun run test:integration    # Integration tests
bun run test:cli            # CLI tests

# Code Quality
bun run lint                # Lint with Biome
bun run typecheck           # TypeScript type checking

# Rules Generation
bun run rules               # Generate all AI tool rules
bun run rules:claude        # Generate Claude-specific rules
```

### Technology Stack

- **Effect-TS** (v3.18+) - Functional TypeScript framework
- **Bun** (v1.0+) - Fast JavaScript runtime
- **TypeScript** (5.8+) - Type safety
- **Vitest** - Testing framework
- **Biome** - Fast linter and formatter
- **@effect/cli** - CLI framework
- **@effect/schema** - Runtime validation

## Publishing Workflow

⚠️ **IMPORTANT: All generation must flow through the pipeline**

The repository enforces strict separation between source patterns and generated outputs to maintain consistency and prevent integration failures.

### Correct Workflow

1. **Create patterns in development directory**
   ```bash
   mkdir -p content/new/src
   touch content/new/src/my-pattern.ts
   touch content/new/my-pattern.mdx
   ```

2. **Validate patterns**
   ```bash
   bun run validate
   ```

3. **Run the publishing pipeline** (handles all generation)
   ```bash
   bun run pipeline
   ```
   This automatically:
   - Tests TypeScript examples
   - Validates MDX files
   - Publishes to `content/published/`
   - Generates AI rules and skills

4. **Commit the results**
   ```bash
   git add -A
   git commit -m "feat: add my pattern"
   ```

### Forbidden: Direct Generation

Never write generated files directly to:

- ❌ `patterns/` - Use `content/new/` → pipeline
- ❌ `rules/` - Generated by `bun run pipeline`
- ❌ `.claude/skills/` - Generated by `bun run ep install skills`
- ❌ `.gemini/skills/` - Generated by `bun run ep install skills`
- ❌ `.openai/skills/` - Generated by `bun run ep install skills`
- ❌ `content/published/` - Use `content/new/` → pipeline

All outputs are pipeline-generated. Direct edits will be overwritten by the next pipeline run.

### Protection Mechanisms

The repository includes safeguards to prevent bypassing the pipeline:

1. **Pre-commit hook** - Prevents committing generated files outside `content/published/`
2. **Pipeline validation** - Checks for generated files before running
3. **CI/CD checks** - Validates pipeline integrity before merging

If you see these errors, run: `bun run pipeline`

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feat/my-pattern`
3. **Add your pattern** to `content/new/`
4. **Run the pipeline**: `bun run pipeline`
5. **Commit changes**: `git commit -m "feat: add my pattern"`
6. **Push to your fork**: `git push origin feat/my-pattern`
7. **Open a Pull Request**

See [docs/guides/CONTRIBUTING.md](./docs/guides/CONTRIBUTING.md) for detailed guidelines.

### Pattern Requirements

All patterns must include:

- ✅ Valid YAML frontmatter
- ✅ Unique `id` (kebab-case)
- ✅ `skillLevel`: beginner, intermediate, or advanced
- ✅ `useCase` array with valid categories
- ✅ At least 3 `tags`
- ✅ Working TypeScript code
- ✅ Sections: Use Case, Good Example, Anti-Pattern, Rationale
- ✅ Rule description for AI tools

## Code Style

### TypeScript Conventions

```typescript
// ✅ Effect-first - use Effect primitives
import { Effect } from "effect";

const fetchUser = (id: string) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise(() => fetch(`/users/${id}`));
    const user = yield* Effect.tryPromise(() => response.json());
    return user;
  });

// ❌ Don't use raw Promise
async function fetchUser(id: string) {
  const response = await fetch(`/users/${id}`);
  return response.json();
}
```

### Error Handling

```typescript
import { Data } from "effect";

class NetworkError extends Data.TaggedError("NetworkError")<{
  cause: unknown;
}> {}

// Use tagged errors for type-safe error handling
const program = Effect.gen(function* () {
  // ...
}).pipe(
  Effect.catchTag("NetworkError", (error) => {
    // Handle specific error type
  })
);
```

## Testing

```typescript
import { Effect, Layer } from "effect";
import { describe, it, expect } from "vitest";

describe("MyService", () => {
  const TestLayer = Layer.succeed(
    MyService,
    MyService.of({
      // Mock implementation
    })
  );

  it("should do something", async () => {
    const result = await Effect.runPromise(
      myFunction().pipe(Effect.provide(TestLayer))
    );

    expect(result).toBe("expected");
  });
});
```

## Documentation

- **[packages/ep-cli/README.md](../../packages/ep-cli/README.md)** - End-user CLI documentation
- **[README.md](./README.md)** - Pattern index (auto-generated)
- **[SETUP.md](./SETUP.md)** - Setup and installation guide
- **[TESTING.md](./TESTING.md)** - Testing documentation
- **[SECURITY.md](./SECURITY.md)** - Security policy
- **[ROADMAP.md](./ROADMAP.md)** - Future features and plans
- **[CLAUDE.md](./CLAUDE.md)** - Context for Claude Code
- **[docs/guides/](./docs/guides/)** - User guides and tutorials
- **[docs/implementation/](./docs/implementation/)** - Technical implementation docs

## Roadmap

### Current Focus (v0.4.0)

- ✅ 700+ curated patterns
- ✅ CLI tool with search and installation
- ✅ Effect Patterns Toolkit
- ✅ AI coding rules for 10+ tools
- ✅ Comprehensive test coverage (80%+)

### Next 3 Months

- [ ] Package manager support (npm, pnpm)
- [ ] Re-enable Effect-TS linter
- [ ] Interactive rule selection in CLI
- [ ] Rule update notifications
- [ ] Additional AI tool support
- [ ] Pattern templates
- [ ] Web UI for pattern browsing

See [ROADMAP.md](./ROADMAP.md) for the complete roadmap.

## Resources

- **[EffectTalk.dev](https://effecttalk.dev/)** - Interactive pattern browser and guided tours
- **[Effect-TS Documentation](https://effect.website/)** - Official Effect docs
- **[Effect Discord](https://discord.gg/effect-ts)** - Community support
- **[GitHub Repository](https://github.com/PaulJPhilp/Effect-Patterns)** - Source code
- **[Contributing Guide](./docs/guides/CONTRIBUTING.md)** - How to contribute
- **[Security Policy](./SECURITY.md)** - Report security issues

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

- **Effect-TS Community** - For feedback, patterns, and support
- **Contributors** - Everyone who has submitted patterns and improvements
- **Discord Community** - For sharing knowledge and best practices

---

**Effect Patterns Hub** - Building better Effect-TS applications, one pattern at a time.
