# Effect Patterns Hub - Agent Context

## Build/Lint/Test Commands
- **Test all**: `bun test`
- **Test single file**: `bun test scripts/__tests__/ep-cli.test.ts` or `vitest run <file>`
- **Lint**: `bun run lint` (Biome)
- **Type check**: `bun run typecheck`
- **Full QA**: `bun run qa:process`

## Architecture
Monorepo with CLI tool (`ep`), MCP server, Next.js apps, and 150+ Effect-TS patterns. Core: Effect 3.18+, TypeScript 5.9+, Bun runtime.

## Code Style
- **Effect-first**: `Effect.gen` for complex flows, `.pipe` for simple transforms
- **Tagged errors**: Extend `Data.TaggedError` with domain-specific types
- **Service pattern**: `Effect.Service` with Layer-based DI
- **Imports**: Direct from `effect`, group related imports
- **Naming**: kebab-case files, camelCase functions, PascalCase types, SCREAMING_SNAKE_CASE constants
- **Formatting**: Biome (2 spaces, 80 width, single quotes, semicolons)

## AI Tool Rules
See CLAUDE.md and .github/copilot-instructions.md for comprehensive Effect-TS patterns and coding guidelines.
