# CLAUDE.md

Context for Claude Code when working on the Effect Patterns Hub repository.

**Version:** 0.8.1 | **Last Updated:** 2025-12-17

---

## Quick Start

```bash
bun install                    # Install dependencies
bun test                       # Verify setup
bun run ep search "effect"     # Test CLI
```

**Jump to your task:**
- **Adding a pattern?** → See "Pattern Development"
- **Working on the CLI?** → See "Common Commands: CLI"
- **Running the Code Assistant?** → See `app/code-assistant/SETUP_CHECKLIST.md`
- **Debugging the API?** → See "Common Commands: MCP Server"

---

## Project Overview

Effect Patterns Hub is a knowledge base of 131+ practical patterns for building robust Effect-TS applications.

**Main Components:**
- Pattern Library (131+ curated patterns with TypeScript examples)
- CLI Tool (`ep`) - Search, discover, and manage patterns
- Universal Skills Generation (v0.8.0+) - Export to Claude, Gemini, and OpenAI
- Effect Patterns Toolkit - Type-safe pattern operations library
- MCP Server - REST API for programmatic access
- Code Assistant - AI-powered coding agent (Phase 1 complete)
- Chat Assistant - Conversational interface for patterns
- Data Analysis Engine - Discord export + LangGraph thematic analysis
- AI Coding Rules - Rules for 10+ AI tools (Claude, Cursor, Windsurf, etc.)

**Tech Stack:** Effect-TS, TypeScript, Bun, Next.js, Vercel, OpenTelemetry

---

## Development Workflow

### Common Commands

**Pattern & Content Management:**
```bash
bun run ingest              # Ingest new patterns from content/new/
bun run pipeline            # Full publishing pipeline (5 steps)
bun run validate            # Validate pattern structure
bun run publish             # Publish validated patterns
bun run rules:claude        # Generate Claude-specific AI rules
```

**Testing:**
```bash
bun test                    # Run all tests
bun run test:behavioral     # Behavioral tests
bun run test:integration    # Integration tests
bun run test:server         # MCP server tests
bun run test:cli            # CLI tests
```

**Linting & Type Checking:**
```bash
bun run lint                # Lint with Biome
bun run typecheck           # TypeScript type checking
bun run lint:effect         # Effect-specific linting
```

**CLI Development:**
```bash
bun run ep                  # Run CLI
bun run ep search "query"   # Test search
bun run ep lint --apply     # Auto-fix violations
```

**Skills Generation (v0.8.0+):**
```bash
bun run ep install skills                           # Generate all skills (Claude, Gemini, OpenAI)
bun run ep install skills --format claude          # Claude Skills only
bun run ep install skills --format gemini          # Gemini Skills only
bun run ep install skills --format openai          # OpenAI Skills only
bun run ep install skills --format claude,gemini   # Multiple formats
bun run ep install skills --category error-management  # Specific category
```

**MCP Server:**
```bash
bun run mcp:dev             # Start in dev mode (watch)
bun run mcp:test            # Run server tests
```

**Data Pipeline:**
```bash
bun run ingest:discord      # Export Discord channel data
bun run analyze             # Run LangGraph thematic analysis
```

**Apps (Next.js):**
```bash
cd app/code-assistant && bun run dev      # Dev server (localhost:3002)
cd app/chat-assistant && bun run dev      # Dev server (localhost:3000)
```

---

## Pattern Development Cycle

### 1. Create Pattern Files

```bash
mkdir -p content/new/src
touch content/new/src/my-pattern.ts    # TypeScript example
touch content/new/my-pattern.mdx        # MDX documentation
```

### 2. Write Pattern Content

**TypeScript Example** (`content/new/src/my-pattern.ts`):
```typescript
import { Effect } from "effect";

const example = Effect.gen(function* () {
  // Pattern implementation
});

Effect.runPromise(example);
```

**MDX Documentation** (`content/new/my-pattern.mdx`):
```markdown
---
id: my-pattern
title: Pattern Title
summary: One-sentence description
skillLevel: intermediate        # beginner, intermediate, or advanced
useCase: ["Error Management"]   # See docs/ARCHITECTURE.md for valid categories
tags: [validation, schema, branded-types]
author: YourName
rule:
  description: "Use X to achieve Y in Z context"
---

## Use Case
When to use this pattern...

## Good Example
\`\`\`typescript
// Well-implemented example
\`\`\`

## Anti-Pattern
\`\`\`typescript
// What NOT to do
\`\`\`

## Rationale
Why this pattern works...
```

### 3. Run Publishing Pipeline

```bash
bun run ingest              # Process pattern files
bun run pipeline            # Validate, test, publish (5 steps)
bun run scripts/publish/move-to-published.ts  # Finalize to content/published/
```

**Pipeline Steps:**
1. Test TypeScript examples (type checking)
2. Publish MDX files (embed code)
3. Validate published files (frontmatter, sections, links)
4. Generate README (from already-published patterns)
5. Generate AI rules (6 formats)

**IMPORTANT:** Pipeline outputs to `content/new/published/`, not `content/published/`. Move finalization is a separate step.

### 4. Validation Requirements

Patterns must include:
- ✅ Valid YAML frontmatter
- ✅ Unique `id` (kebab-case)
- ✅ `skillLevel`: beginner, intermediate, or advanced
- ✅ `useCase` array with valid categories (aliases supported)
- ✅ At least 3 `tags`
- ✅ TypeScript code in `content/new/src/`
- ✅ Sections: Use Case, Good Example, Anti-Pattern, Rationale
- ✅ Rule description

---

## Code Style & Conventions

### TypeScript

- **Strict mode enabled** - No implicit any
- **Effect-first** - Use Effect for all async/error handling
- **Use `Effect.gen`** over `.pipe` for readability in complex flows
- **Use `.pipe`** for simple, linear transformations
- **NEVER use `Context.Tag`** - Always use `Effect.Service` with class syntax

**Good Example:**
```typescript
const fetchUser = (id: string) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise(() => fetch(`/users/${id}`));
    const user = yield* Effect.tryPromise(() => response.json());
    return user;
  });
```

### Error Handling

- Use tagged errors extending `Data.TaggedError`
- Explicit error types: `Effect<A, E, R>`
- Use `catchTag` for specific error recovery
- Use `mapError` to transform errors at boundaries

### Testing

- Use Vitest for all tests
- Use `Effect.runPromise` to run Effects
- Use Layer-based DI for mocking
- Colocate tests with source or in `__tests__/`

### Naming Conventions

- **Files:** kebab-case (`my-pattern.ts`, `handle-errors.mdx`)
- **Pattern IDs:** kebab-case (`retry-based-on-specific-errors`)
- **Functions:** camelCase (`buildSnippet`, `searchPatterns`)
- **Types:** PascalCase (`PatternSummary`, `GenerateRequest`)
- **Services:** PascalCase (`PatternService`, `AuthService`)
- **Layers:** PascalCase + `Live` suffix (`PatternServiceLive`, `AuthLayer`)

---

## Important File Locations

**Configuration:**
- `package.json` - Root package, workspaces, scripts
- `tsconfig.json` - TypeScript configuration
- `biome.json` - Linter/formatter config
- `vercel.json` - Vercel deployment settings

**Content Directories:**
- `content/published/*.mdx` - Final published patterns (131+)
- `content/new/src/*.ts` - TypeScript examples (development)
- `content/new/processed/*.mdx` - MDX with component tags (from ingest)
- `content/new/published/*.mdx` - Pipeline output (before finalization)
- `.claude/skills/` - Generated Claude Skills (14 categories)
- `.gemini/skills/` - Generated Gemini Skills (JSON format with system prompts)
- `.openai/skills/` - Generated OpenAI Skills (SKILL.md format)

**Core Entry Points:**
- `packages/cli/src/index.ts` - Main CLI
- `packages/cli/src/skills/skill-generator.ts` - Skills generation utilities (v0.8.0+)
- `services/mcp-server/src/` - MCP server
- `packages/toolkit/src/` - Pattern toolkit
- `app/code-assistant/` - Code Assistant app
- `app/chat-assistant/` - Chat Assistant app

---

## Troubleshooting

**Pattern validation fails:**
- Check YAML frontmatter syntax
- Ensure required fields present (`id`, `title`, `skillLevel`, `useCase`)
- Verify `skillLevel` is valid: beginner, intermediate, or advanced
- Check `id` is unique and kebab-case

**TypeScript examples don't run:**
- Verify imports are correct
- Check Effect version compatibility (v3.18+)
- Run `bun run typecheck` to verify syntax

**Tests fail:**
- Reinstall: `rm -rf node_modules && bun install`
- Run with verbose: `bun test --reporter=verbose`
- Check test data validity

**CLI doesn't work:**
- Try `bun run ep` instead of global `ep` command
- Verify `scripts/ep.ts` has execute permissions

**MCP server errors:**
- Check `PATTERN_API_KEY` is set in environment
- Verify `data/patterns.json` exists
- Run `bun run toolkit:build` first

**Skills generation fails:**
- Ensure published patterns exist: `ls content/published/*.mdx`
- Verify YAML frontmatter is valid in pattern files
- Check skill output directories are writable: `.claude/`, `.gemini/`, `.openai/`
- Try specific format: `bun run ep install skills --format claude`
- Review error message for missing pattern sections

---

## Reference Documentation

For detailed information, see these specialized guides:

- **Architecture & Monorepo Structure** → [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- **Publishing Pipeline Details** → [`docs/PUBLISHING_PIPELINE.md`](./docs/PUBLISHING_PIPELINE.md)
- **Pipeline State Machine** → [`docs/PIPELINE_STATE.md`](./docs/PIPELINE_STATE.md)
- **Discord Service & Data Analysis** → [`docs/DATA_ANALYSIS.md`](./docs/DATA_ANALYSIS.md)
- **Dependencies** → [`docs/DEPENDENCIES.md`](./docs/DEPENDENCIES.md)
- **CI/CD & Deployment** → [`docs/CI_CD.md`](./docs/CI_CD.md)
- **Security Practices** → [`SECURITY.md`](./SECURITY.md)
- **Contributing Guide** → [`docs/guides/CONTRIBUTING.md`](./docs/guides/CONTRIBUTING.md)

---

## External Resources

- [Effect-TS Documentation](https://effect.website/)
- [Effect Discord Community](https://discord.gg/effect-ts)
- [GitHub Repository](https://github.com/PaulJPhilp/Effect-Patterns)
- [Project Roadmap](./ROADMAP.md)

---

**For Claude Code:** Load this context when working on Effect Patterns Hub to ensure consistency with project structure and conventions.
