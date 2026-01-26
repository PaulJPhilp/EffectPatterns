# @effect-patterns/analysis-core

> Transport-agnostic code analysis brain for Effect-TS patterns

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-blue.svg)](https://www.typescriptlang.org/)
[![Effect](https://img.shields.io/badge/Effect-3.19+-purple.svg)](https://effect.website/)

A pure Effect library providing transport-agnostic code analysis services for Effect-TS patterns. Built with modern Effect.Service patterns for type-safe dependency injection and composability.

This package contains the core analysis logic (rules, detection, and refactor/fix generation) as Effect services. It is designed to be invoked by:

- The MCP server (HTTP / Vercel)
- A local CLI harness (bulk analysis)
- An autonomous coding agent

## Features

- **20 governed rules** implemented with precise AST-based detection
- **7 automated refactorings** implemented as TypeScript AST transforms
- **Cross-file consistency analysis** for pattern violations
- **Transport-agnostic design** - pure Effect services
- **Zero false positives** through TypeScript AST analysis
- **Effect.Service pattern** for modern dependency injection
- **Type-safe interfaces** with comprehensive error handling

## Installation

```bash
# npm
npm install @effect-patterns/analysis-core effect typescript

# bun
bun add @effect-patterns/analysis-core effect typescript

# pnpm
pnpm add @effect-patterns/analysis-core effect typescript
```

## Quick Start

```typescript
import { Effect } from "effect";
import { AnalysisService } from "@effect-patterns/analysis-core";

const program = Effect.gen(function* () {
  const analysis = yield* AnalysisService;
  return yield* analysis.analyzeFile("foo.ts", "export const x = async () => 1");
});

Effect.runPromise(program.pipe(Effect.provide(AnalysisService.Default)));
```

**Output includes:**

- `findings[]` - Rule violations with precise line/column ranges
- `suggestions[]` - High-level recommendations  
- `analyzedAt` - ISO timestamp

## Governed Rules and Fixes

This package intentionally separates:

- **Detection** (governed `RuleId`s) - AST-based pattern matching
- **Remediation** (`FixId`s) - Automated AST transformations with preview

### Current Rules (20)

| Rule ID | Description | Severity | Category |
|---------|-------------|----------|----------| |
| `async-await` | Prefer Effect over async/await | high | async |
| `node-fs` | Prefer @effect/platform FileSystem | medium | resources |
| `try-catch-in-effect` | Prefer Effect.try over try/catch | high | errors |
| `try-catch-boundary-ok` | try/catch OK at HTTP boundaries | low | errors |
| `catch-log-and-swallow` | Don't log and swallow errors | high | errors |
| `throw-in-effect-code` | Don't throw inside Effect code | high | errors |
| `any-type` | Avoid `any` type | high | style |
| `effect-map-fn-reference` | Wrap Effect.map callbacks | low | dependency-injection |
| `yield-star-non-effect` | `yield*` on `non-Effect` value | medium | async |
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
|--------|-------------|------------| |
| `replace-node-fs` | Rewrite node:fs imports to @effect/platform | `node-fs` |
| `add-filter-or-fail-validator` | Add Effect.filterOrFail validation | `missing-validation` |
| `wrap-effect-map-callback` | Wrap Effect.map(fn) to Effect.map(x => fn(x)) | `effect-map-fn-reference` |
| `replace-context-tag` | Convert Context.Tag to Effect.Service | `context-tag-anti-pattern` |
| `replace-promise-all` | Convert Promise.all to Effect.all | `promise-all-in-effect` |
| `replace-console-log` | Convert console.log to Effect.log | `console-log-in-effect` |
| `add-schema-decode` | Add TODO comment for Schema.decodeUnknown | `schema-decode-unknown` |

## API Reference

### Services

The package provides five main services using the Effect.Service pattern:

#### `AnalysisService`

Main orchestration service that composes all other analysis services.

#### `CodeAnalyzerService`

Single-file analysis with TypeScript AST traversal.

#### `RuleRegistryService`

Rule definitions, metadata, and rule-to-fix mappings.

#### `RefactoringEngineService`

AST-based code transformation and fix generation.

#### `ConsistencyAnalyzerService`

Cross-file pattern consistency analysis.

### Core Methods

#### `analyzeFile(filename, source)`

Analyze a single TypeScript file for pattern violations.

```typescript
import { AnalysisService } from "@effect-patterns/analysis-core";

const program = Effect.gen(function* () {
  const analysis = yield* AnalysisService;
  return yield* analysis.analyzeFile("foo.ts", "export const x = async () => 1");
});
```

**Returns**: `Effect<AnalysisReport, AnalysisError>`

#### `analyzeConsistency(files)`

Analyze multiple files for cross-file pattern consistency.

```typescript
const files = [
  { filename: "a.ts", source: 'import { readFile } from "node:fs";' },
  { filename: "b.ts", source: 'import { FileSystem } from "@effect/platform";' }
];

const program = Effect.gen(function* () {
  const analysis = yield* AnalysisService;
  return yield* analysis.analyzeConsistency(files);
});
```

**Returns**: `Effect<ConsistencyReport, AnalysisError>`

#### `listRules()`

Get all available analysis rules.

```typescript
const rules = yield* analysis.listRules();
```

**Returns**: `Effect<Rule[], never>`

#### `listFixes()`

Get all available automated fixes.

```typescript
const fixes = yield* analysis.listFixes();
```

**Returns**: `Effect<Fix[], never>`

#### `applyRefactorings(fixIds, files)`

Apply automated refactorings to files (preview-only).

```typescript
const result = yield* analysis.applyRefactorings(
  ["replace-node-fs"],
  [{ filename: "a.ts", source: 'import { readFile } from "node:fs";' }]
);
```

**Returns**: `Effect<RefactoringResult, RefactoringError>`

#### `generateFix(input)`

Generate a fix preview for a specific rule violation.

```typescript
const result = yield* analysis.generateFix({
  ruleId: "node-fs",
  filename: "a.ts", 
  source: 'import { readFile } from "node:fs";'
});
```

**Returns**: `Effect<GenerateFixOutput, RefactoringError>`

## Usage Examples

### Basic File Analysis

```typescript
import { Effect } from "effect";
import { AnalysisService } from "@effect-patterns/analysis-core";

const analyzeFile = (filename: string, source: string) =>
  Effect.gen(function* () {
    const analysis = yield* AnalysisService;
    const report = yield* analysis.analyzeFile(filename, source);
    
    console.log(`Found ${report.findings.length} issues in ${filename}`);
    for (const finding of report.findings) {
      console.log(`- ${finding.ruleId}: ${finding.message} at line ${finding.position.line}`);
    }
    
    return report;
  });

// Run the analysis
Effect.runPromise(
  analyzeFile("example.ts", "export const x = async () => 1").pipe(
    Effect.provide(AnalysisService.Default)
  )
);
```

### Multi-File Consistency Analysis

```typescript
import { Effect } from "effect";
import { AnalysisService } from "@effect-patterns/analysis-core";

const files = [
  { filename: "a.ts", source: 'import { readFile } from "node:fs";' },
  { filename: "b.ts", source: 'import { FileSystem } from "@effect/platform";' }
];

const checkConsistency = Effect.gen(function* () {
  const analysis = yield* AnalysisService;
  const report = yield* analysis.analyzeConsistency(files);
  
  console.log(`Consistency analysis completed:`);
  console.log(`- ${report.inconsistencies.length} inconsistencies found`);
  console.log(`- ${report.suggestions.length} suggestions generated`);
  
  return report;
});

Effect.runPromise(
  checkConsistency.pipe(Effect.provide(AnalysisService.Default))
);
```

### Automated Refactoring

```typescript
import { Effect } from "effect";
import { AnalysisService } from "@effect-patterns/analysis-core";

const applyFixes = Effect.gen(function* () {
  const analysis = yield* AnalysisService;
  
  // Apply node:fs to @effect/platform refactoring
  const result = yield* analysis.applyRefactorings(
    ["replace-node-fs"],
    [{ 
      filename: "filesystem.ts", 
      source: 'import { readFile } from "node:fs";\nconst content = readFile("file.txt");' 
    }]
  );
  
  console.log(`Refactoring preview:`);
  for (const change of result.changes) {
    console.log(`File: ${change.filename}`);
    console.log(`Before: ${change.before}`);
    console.log(`After: ${change.after}`);
  }
  
  return result;
});

Effect.runPromise(
  applyFixes.pipe(Effect.provide(AnalysisService.Default))
);
```

### Rule and Fix Discovery

```typescript
import { Effect } from "effect";
import { AnalysisService, RuleIdValues, FixIdValues } from "@effect-patterns/analysis-core";

const exploreRules = Effect.gen(function* () {
  const analysis = yield* AnalysisService;
  
  // Get all available rules
  const rules = yield* analysis.listRules();
  console.log(`Available rules (${rules.length}):`);
  for (const rule of rules) {
    console.log(`- ${rule.id}: ${rule.title} (${rule.severity})`);
  }
  
  // Get all available fixes
  const fixes = yield* analysis.listFixes();
  console.log(`\nAvailable fixes (${fixes.length}):`);
  for (const fix of fixes) {
    console.log(`- ${fix.id}: ${fix.title}`);
  }
  
  return { rules, fixes };
});

Effect.runPromise(
  exploreRules.pipe(Effect.provide(AnalysisService.Default))
);
```

## Architecture

### Service Composition

All services use the modern Effect.Service pattern with automatic dependency injection:

```typescript
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

```typescript
// Can be used from MCP server, CLI, or agents
const analysis = yield* AnalysisService;
const result = yield* analysis.analyzeFile(filename, content);
```

Transport-specific concerns (HTTP, file I/O, MCP protocol) are handled by:

- `packages/mcp-server` - HTTP/Vercel integration
- CLI harness (future) - Command-line interface  
- Autonomous agents (future) - Direct service usage

### Type Safety

The package provides comprehensive TypeScript types:

```typescript
import {
  type AnalysisReport,
  type CodeFinding,
  type CodeSuggestion,
  type RuleId,
  type FixId,
  RuleIdValues,
  FixIdValues,
} from "@effect-patterns/analysis-core";
```

## Testing

```bash
# Run tests
bun test packages/analysis-core/

# Watch mode
bun test --watch packages/analysis-core/

# Coverage
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

### Testing with Services

```typescript
import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { AnalysisService } from "@effect-patterns/analysis-core";

describe("AnalysisService", () => {
  it("should analyze async/await patterns", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const analysis = yield* AnalysisService;
        return yield* analysis.analyzeFile(
          "test.ts",
          "export const x = async () => 1"
        );
      }).pipe(
        Effect.provide(AnalysisService.Default)
      )
    );
    
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].ruleId).toBe("async-await");
  });
});
```

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

## Dependencies

- **effect**: Core Effect library
- **typescript**: TypeScript Compiler API for AST analysis

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

## License

MIT © Effect Patterns Team

---

**Part of the [Effect Patterns Hub](https://github.com/PaulJPhilp/Effect-Patterns)**
