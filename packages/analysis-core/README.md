# @effect-patterns/analysis-core

Transport-agnostic code analysis "brain" for the Effect Patterns project.

This package contains the core analysis logic (rules, detection, and
refactor/fix generation) as Effect services. It is designed to be invoked by:

- The MCP server (HTTP / Vercel)
- A local CLI harness (bulk analysis)
- An autonomous coding agent

## Goals

- Keep analysis logic independent of any transport (HTTP/MCP/CLI)
- Centralize governed architectural rules
- Provide structured analysis output (findings + suggestions)
- Provide automated fix generation (AST-based refactorings)

## Public API

All public exports are re-exported from `src/index.ts`.

### Services

- `AnalysisService` / `AnalysisServiceLive`
- `CodeAnalyzerService` / `CodeAnalyzerServiceLive`
- `RuleRegistryService` / `RuleRegistryServiceLive`
- `RefactoringEngineService` / `RefactoringEngineServiceLive`
- `ConsistencyAnalyzerService` / `ConsistencyAnalyzerServiceLive`

### IDs

- `RuleId` / `RuleIdValues`
- `FixId` / `FixIdValues`

## Usage

### Analyze a file (in-memory)

```ts
import { Effect } from "effect";
import { AnalysisService } from "@effect-patterns/analysis-core";

const program = Effect.gen(function* () {
  const analysis = yield* AnalysisService;
  return yield* analysis.analyzeFile("foo.ts", "export const x = async () => 1");
});

await Effect.runPromise(program.pipe(Effect.provide(AnalysisService.Default)));
```

### List governed rules

```ts
import { Effect } from "effect";
import { AnalysisService } from "@effect-patterns/analysis-core";

const rules = await Effect.runPromise(
  Effect.gen(function* () {
    const analysis = yield* AnalysisService;
    return yield* analysis.listRules();
  }).pipe(Effect.provide(AnalysisService.Default))
);
```

### Generate refactoring changes

```ts
import { Effect } from "effect";
import { AnalysisService } from "@effect-patterns/analysis-core";

const changes = await Effect.runPromise(
  Effect.gen(function* () {
    const analysis = yield* AnalysisService;
    const result = yield* analysis.applyRefactorings(
      ["replace-node-fs"],
      [{ filename: "a.ts", source: 'import { readFile } from "node:fs";' }]
    );
    return result;
  }).pipe(Effect.provide(AnalysisService.Default))
);
```

## Layering

Each service is an `Effect.Service` and exposes `.Default` / `*Live`.

Typical usage:

```ts
Effect.provide(program, AnalysisService.Default)
```

`AnalysisService` composes the underlying services via `dependencies`.

## Testing

This package currently has no dedicated test suite. The MCP server package
provides integration coverage by consuming these services.

To prevent CI failures from an empty test suite, the package test script runs
Vitest with `--passWithNoTests`.
