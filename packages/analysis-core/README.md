# @effect-patterns/analysis-core

Transport-agnostic code analysis "brain" for the Effect Patterns project.

This package contains the core analysis logic (rules, detection, and
refactor/fix generation) as Effect services. It is designed to be invoked by:

- The MCP server (HTTP / Vercel)
- A local CLI harness (bulk analysis)
- An autonomous coding agent

## Goals

- Keep analysis logic independent of any transport (HTTP/MCP/CLI)
- Centralize governed architectural rules for Effect-TS projects
- Provide structured analysis output (findings + suggestions)
- Provide automated fix generation (AST-based refactorings)
- Eliminate false positives through TypeScript AST analysis

## Current Status

- **20 governed rules** implemented with precise AST-based detection
- **7 automated refactorings** implemented as TypeScript AST transforms
- **Cross-file consistency analysis** for pattern violations
- **Comprehensive test suite** with 85%+ line coverage
- **Zero false positives** through AST analysis (vs. previous regex-based approach)

## Public API

All public exports are re-exported from `src/index.ts`.

### Services

- `AnalysisService` - Main analysis orchestration service
- `CodeAnalyzerService` - Single-file analysis with AST traversal
- `RuleRegistryService` - Rule definitions and metadata
- `RefactoringEngineService` - AST-based code transformation
- `ConsistencyAnalyzerService` - Cross-file pattern consistency

### IDs

- `RuleId` / `RuleIdValues`
- `FixId` / `FixIdValues`

## Governed Rules and Fixes

This package intentionally separates:

- **Detection** (governed `RuleId`s) - AST-based pattern matching
- **Remediation** (`FixId`s) - Automated AST transformations with preview

### Current Rules (20)

| Rule ID | Description | Severity | Category |
|---------|-------------|----------|----------|
| `async-await` | Prefer Effect over async/await | high | async |
| `node-fs` | Prefer @effect/platform FileSystem | medium | resources |
| `try-catch-in-effect` | Prefer Effect.try over try/catch | high | errors |
| `try-catch-boundary-ok` | try/catch OK at HTTP boundaries | low | errors |
| `catch-log-and-swallow` | Don't log and swallow errors | high | errors |
| `throw-in-effect-code` | Don't throw inside Effect code | high | errors |
| `any-type` | Avoid `any` type | high | style |
| `effect-map-fn-reference` | Wrap Effect.map callbacks | low | dependency-injection |
| `yield-star-non-effect` | yield* on non-Effect value | medium | async |
| `context-tag-anti-pattern` | Use Effect.Service not Context.Tag | high | dependency-injection |
| `promise-all-in-effect` | Use Effect.all not Promise.all | high | async |
| `mutable-ref-in-effect` | Avoid mutable refs in Effect | medium | style |
| `console-log-in-effect` | Use Effect logging | medium | style |
| `effect-runSync-unsafe` | Avoid Effect.runSync | high | async |
| `layer-provide-anti-pattern` | Provide layers at root | medium | dependency-injection |
| `effect-gen-no-yield` | Effect.gen without yield* is wasteful | low | style |
| `schema-decode-unknown` | Use Schema for external data | high | validation |
| `missing-validation` | Add input validation | high | validation |
| `missing-error-channel` | Effect may fail but error is never handled | high | errors |
| `non-typescript` | Non-TypeScript input warning | low | style |

### Current Fixes (7)

| Fix ID | Description | Applies To |
|--------|-------------|------------|
| `replace-node-fs` | Rewrite node:fs imports to @effect/platform | `node-fs` |
| `add-filter-or-fail-validator` | Add Effect.filterOrFail validation | `missing-validation` |
| `wrap-effect-map-callback` | Wrap Effect.map(fn) to Effect.map(x => fn(x)) | `effect-map-fn-reference` |
| `replace-context-tag` | Convert Context.Tag to Effect.Service | `context-tag-anti-pattern` |
| `replace-promise-all` | Convert Promise.all to Effect.all | `promise-all-in-effect` |
| `replace-console-log` | Convert console.log to Effect.log | `console-log-in-effect` |
| `add-schema-decode` | Add TODO comment for Schema.decodeUnknown | `schema-decode-unknown` |

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

**Output includes:**
- `findings[]` - Rule violations with precise line/column ranges
- `suggestions[]` - High-level recommendations  
- `analyzedAt` - ISO timestamp

### Analyze multiple files for consistency

```ts
import { Effect } from "effect";
import { AnalysisService } from "@effect-patterns/analysis-core";

const files = [
  { filename: "a.ts", source: 'import { readFile } from "node:fs";' },
  { filename: "b.ts", source: 'import { FileSystem } from "@effect/platform";' }
];

const program = Effect.gen(function* () {
  const analysis = yield* AnalysisService;
  return yield* analysis.analyzeConsistency(files);
});

await Effect.runPromise(program.pipe(Effect.provide(AnalysisService.Default)));
```

### List governed rules and fixes

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

### Generate refactoring changes

```ts
import { Effect } from "effect";
import { AnalysisService } from "@effect-patterns/analysis-core";

const program = Effect.gen(function* () {
  const analysis = yield* AnalysisService;
  const result = yield* analysis.applyRefactorings(
    ["replace-node-fs"],
    [{ filename: "a.ts", source: 'import { readFile } from "node:fs";' }]
  );
  return result;
});

await Effect.runPromise(program.pipe(Effect.provide(AnalysisService.Default)));
```

**Key points:**
- Refactorings are applied as TypeScript AST transforms
- Returns in-memory diffs (preview-only, no file writing)
- Multiple refactorings can be applied in a single operation
- Each change includes `before` and `after` content for comparison

### Generate fix preview for specific violation

```ts
import { Effect } from "effect";
import { AnalysisService } from "@effect-patterns/analysis-core";

const program = Effect.gen(function* () {
  const analysis = yield* AnalysisService;
  return yield* analysis.generateFix({
    ruleId: "node-fs",
    filename: "a.ts", 
    source: 'import { readFile } from "node:fs";'
  });
});

await Effect.runPromise(program.pipe(Effect.provide(AnalysisService.Default)));
```

## Architecture

### Service Composition

All services are `Effect.Service` instances with automatic layer composition:

```ts
// Main orchestration service - composes all others
AnalysisService.Default

// Individual services (composed automatically)
CodeAnalyzerService.Default
RuleRegistryService.Default  
RefactoringEngineService.Default
ConsistencyAnalyzerService.Default
```

### AST-Based Analysis

This package uses TypeScript's Compiler API for precise code analysis:

- **Zero false positives** - AST traversal vs. regex matching
- **Precise locations** - 1-based line/column ranges for IDE integration
- **Safe transforms** - AST-based refactoring preserves code structure
- **Type information** - Foundation for future type-aware analysis

### Transport-Agnostic Design

The core analysis logic is completely independent of transport:

```ts
// Can be used from MCP server, CLI, or agents
const analysis = yield* AnalysisService;
const result = yield* analysis.analyzeFile(filename, content);
```

Transport-specific concerns (HTTP, file I/O, MCP protocol) are handled by:
- `packages/mcp-server` - HTTP/Vercel integration
- CLI harness (future) - Command-line interface  
- Autonomous agents (future) - Direct service usage

## Testing

This package has a comprehensive test suite under `src/__tests__/` with 85%+ line coverage.

### Run tests

```sh
# Unit tests
bun test packages/analysis-core/

# With coverage
bun test --coverage packages/analysis-core/

# Coverage with threshold (80% minimum)
bun test --coverage --coverage.threshold=80 packages/analysis-core/
```

### Test Structure

- **Unit tests** - Individual service and rule testing
- **Integration tests** - Cross-service coordination
- **Rule tests** - Each of the 20 rules has dedicated tests
- **Refactoring tests** - Each of the 7 fixes has transformation tests
- **AST tests** - Safe traversal and transformation utilities

### Integration Testing

The `packages/mcp-server` package contains integration tests that verify the full stack:
- MCP server → analysis-core → analysis results
- Real-world code scenarios
- Cross-file consistency checking

## Development

### Adding New Rules

1. Define rule in `src/services/rule-registry/`
2. Add AST detection logic in `src/services/code-analyzer/`
3. Create corresponding fix (if applicable) in `src/services/refactoring-engine/`
4. Add comprehensive tests in `src/__tests__/`

### Adding New Fixes

1. Implement AST transformation in `src/services/refactoring-engine/`
2. Update rule-to-fix mappings in `src/services/rule-registry/`
3. Add transformation tests with before/after examples

## Roadmap

### Phase 1: Core Enhancements
- [ ] Rule configuration files (enable/disable per project)
- [ ] Category filtering for analysis types
- [ ] Severity overrides per project

### Phase 2: Integration & Tooling  
- [ ] Project-wide analysis with directory traversal
- [ ] GitHub Action for CI/CD integration
- [ ] Report generation (JSON, Markdown, HTML)

### Phase 3: Advanced Features
- [ ] Type-aware analysis with TypeScript Program
- [ ] LSP server for IDE integration
- [ ] Effect pipeline analysis
- [ ] Service dependency analysis

## Related Packages

- **`@effect-patterns/mcp-server`** - HTTP/MCP server integration
- **`@effect/platform`** - Platform services used in refactoring targets
- **`effect`** - Core Effect-TS framework

---

*Last updated: January 2026*
