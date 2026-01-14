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

## Current Status

- Governed rule detection implemented (20 rules)
- Automated refactorings implemented (AST transforms)
- Test suite in this package (coverage target met: 85%+ lines)

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

## Governed Rules and Fixes

This package intentionally separates:

- Detection (governed `RuleId`s)
- Remediation (`FixId`s) that can be previewed as file diffs

To list the full, current set at runtime:

```ts
import { Effect } from "effect";
import { AnalysisService } from "@effect-patterns/analysis-core";

const program = Effect.gen(function* () {
  const analysis = yield* AnalysisService;
  const rules = yield* analysis.listRules();
  const fixes = yield* analysis.listFixes();
  return { rules, fixes };
});

await Effect.runPromise(program.pipe(Effect.provide(AnalysisService.Default)));
```

Common examples include:

- Rules: `node-fs`, `try-catch-in-effect`, `context-tag-anti-pattern`,
  `promise-all-in-effect`, `console-log-in-effect`, `schema-decode-unknown`
- Fixes: `replace-node-fs`, `replace-context-tag`, `replace-promise-all`,
  `replace-console-log`, `add-schema-decode`,
  `add-filter-or-fail-validator`, `wrap-effect-map-callback`

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

Refactorings are applied as TypeScript AST transforms and returned as
in-memory diffs. This package does not write files.

## Layering

Each service is an `Effect.Service` and exposes `.Default` / `*Live`.

Typical usage:

```ts
Effect.provide(program, AnalysisService.Default)
```

`AnalysisService` composes the underlying services via `dependencies`.

## Testing

This package has a dedicated unit test suite under `src/__tests__/`.

To run tests:

```sh
bun test packages/analysis-core/
```

To run coverage:

```sh
bun test --coverage packages/analysis-core/
```
