# Analysis Core: Implementation Plan

This plan assumes the ts-morph refactoring is complete and the declarative
template system is in place.

---

## Phase 1: Configuration & Filtering (Week 1-2)

### 1.1 Rule Configuration File Support

**Use Case**: UC-4.3 - Enable/Disable Rules

**Goal**: Allow projects to configure which rules are active via a config file.

**Implementation**:

```
src/
├── config/
│   ├── schema.ts          # Configuration schema
│   ├── loader.ts          # Config file discovery and loading
│   └── types.ts           # Configuration types
```

**Config Schema** (`.analysisrc.json`):
```json
{
  "rules": {
    "async-await": "off",
    "node-fs": "warn",
    "console-log-in-effect": "error"
  },
  "extends": ["@effect-patterns/recommended"],
  "ignore": ["**/*.test.ts", "**/fixtures/**"]
}
```

**Tasks**:
1. Define `AnalysisConfig` schema with @effect/schema
2. Create `ConfigLoaderService` to find and parse config files
3. Update `RuleRegistryService` to accept config and filter rules
4. Add `loadConfig()` to `AnalysisService` API
5. Add tests for config loading and rule filtering

**Effort**: 3-4 days

---

### 1.2 Category Filtering

**Use Case**: UC-1.2 - Analyze File by Category

**Goal**: Make `analysisType` parameter functional.

**Implementation**:

Update `CodeAnalyzerService.analyze()` to filter rules by category:

```typescript
const categoryMap: Record<AnalysisType, RuleCategory[]> = {
  validation: ["validation"],
  patterns: ["style", "dependency-injection", "resources", "types"],
  errors: ["errors", "async", "concurrency", "platform"],
  all: ["async", "errors", "validation", "resources", 
        "dependency-injection", "style", "concurrency", "platform", "types"],
};
```

**Tasks**:
1. Add category filtering logic to `CodeAnalyzerService`
2. Update tests to verify category filtering
3. Document category mappings in README

**Effort**: 1 day

---

### 1.3 Severity Overrides

**Use Case**: UC-4.5 - Rule Severity Override

**Goal**: Allow config to override default severities.

**Implementation**:

Extend config schema:
```json
{
  "rules": {
    "console-log-in-effect": ["error", { "severity": "high" }]
  }
}
```

**Tasks**:
1. Extend config schema for severity overrides
2. Update `RuleRegistryService` to apply overrides
3. Add tests

**Effort**: 1 day

---

## Phase 2: Project-Wide Analysis (Week 3-4)

### 2.1 Directory Traversal

**Use Case**: UC-2.2 - Project-Wide Analysis

**Goal**: Analyze entire project directories with gitignore support.

**Implementation**:

```
src/
├── project/
│   ├── discovery.ts       # File discovery with glob/gitignore
│   ├── project-analyzer.ts # Orchestrates multi-file analysis
│   └── types.ts
```

**New API**:
```typescript
interface ProjectAnalysisInput {
  readonly rootDir: string;
  readonly include?: string[];      // Glob patterns
  readonly exclude?: string[];      // Additional excludes
  readonly respectGitignore?: boolean;
}

interface ProjectAnalysisOutput {
  readonly files: readonly AnalysisReport[];
  readonly consistency: readonly ConsistencyIssue[];
  readonly summary: {
    readonly totalFiles: number;
    readonly totalFindings: number;
    readonly bySeverity: Record<Severity, number>;
    readonly byRule: Record<RuleId, number>;
  };
}
```

**Tasks**:
1. Add `fast-glob` and `ignore` dependencies
2. Create `FileDiscoveryService` for glob + gitignore
3. Create `ProjectAnalyzerService` that orchestrates analysis
4. Add `analyzeProject(input)` to `AnalysisService`
5. Add tests with fixture directories

**Effort**: 4-5 days

---

### 2.2 Type-Aware Analysis

**Use Case**: UC-2.3 - Type-Aware Analysis

**Goal**: Use TypeScript's type checker for accurate detection.

**Implementation**:

With ts-morph, this becomes straightforward:

```typescript
// Create project with type checking
const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

// Now we can check types
const type = node.getType();
const isEffect = type.getText().startsWith("Effect<");
```

**New Rules Enabled**:
- Distinguish `Effect.map` from `Array.map`
- Detect `Effect<A, never, R>` where error channel should be typed
- Validate service dependency types

**Tasks**:
1. Update `TemplateEngineService` to optionally accept tsconfig path
2. Add type-aware predicates to template interface
3. Implement `missing-error-channel` rule properly (currently placeholder)
4. Add `effect-vs-array-map` rule
5. Add tests with type-aware fixtures

**Effort**: 5-6 days

---

## Phase 3: CI/CD Integration (Week 5-6)

### 3.1 Report Generation

**Use Case**: UC-5.5 - Batch Report Generation

**Goal**: Generate reports in multiple formats for dashboards and PRs.

**Implementation**:

```
src/
├── reporters/
│   ├── json-reporter.ts
│   ├── markdown-reporter.ts
│   ├── sarif-reporter.ts    # GitHub Code Scanning format
│   └── types.ts
```

**Output Formats**:
- **JSON**: Machine-readable, full detail
- **Markdown**: Human-readable for PR comments
- **SARIF**: GitHub Code Scanning integration

**Tasks**:
1. Define `Reporter` interface
2. Implement JSON reporter (trivial)
3. Implement Markdown reporter with tables and summaries
4. Implement SARIF reporter for GitHub integration
5. Add `--format` option concept for CLI consumers

**Effort**: 3-4 days

---

### 3.2 GitHub Action

**Use Case**: UC-5.4 - GitHub Action Integration

**Goal**: Pre-built action for running analysis on PRs.

**Implementation**:

Create new package: `packages/github-action/`

```yaml
# action.yml
name: 'Effect Patterns Analysis'
description: 'Analyze Effect-TS code for best practices'
inputs:
  config:
    description: 'Path to .analysisrc.json'
    required: false
  fail-on:
    description: 'Fail if findings at this severity or higher'
    default: 'high'
runs:
  using: 'node20'
  main: 'dist/index.js'
```

**Features**:
- Inline PR annotations via GitHub API
- Summary comment with findings table
- SARIF upload for Code Scanning tab
- Configurable failure threshold

**Tasks**:
1. Create `packages/github-action` package
2. Implement action entry point
3. Add GitHub API integration for annotations
4. Add SARIF upload support
5. Write action documentation
6. Test with sample repository

**Effort**: 5-6 days

---

## Phase 4: Advanced Analysis (Week 7-8)

### 4.1 Effect Pipeline Analysis

**Use Case**: UC-6.2 - Effect Pipeline Analysis

**Goal**: Trace Effect pipelines to detect issues.

**New Rules**:
| Rule ID | Description |
|---------|-------------|
| `unreachable-catch` | Error handler after `.catchAll()` is unreachable |
| `redundant-effect-wrap` | `Effect.succeed(Effect.succeed(x))` |
| `missing-flatMap` | `Effect.map` returning Effect (should be flatMap) |
| `unhandled-error-type` | Error type in channel but no handler |

**Implementation**:

```typescript
interface PipelineTemplate extends RefactoringTemplate {
  /** Analyze the full pipe chain, not just single nodes */
  analyzePipeline: (chain: CallExpression[]) => Finding[];
}
```

**Tasks**:
1. Create pipeline chain extractor (follows `.pipe()` calls)
2. Implement pipeline-aware templates
3. Add rules for common pipeline issues
4. Add tests with complex pipeline fixtures

**Effort**: 5-6 days

---

### 4.2 Service Dependency Analysis

**Use Case**: UC-6.3 - Service Dependency Analysis

**Goal**: Analyze Effect.Service definitions for issues.

**New Rules**:
| Rule ID | Description |
|---------|-------------|
| `circular-service-dep` | Service A depends on B which depends on A |
| `missing-layer-dep` | Service uses dependency not in `dependencies` |
| `unused-layer-dep` | Dependency declared but never used |

**Implementation**:

Build a dependency graph from `Effect.Service` definitions:

```typescript
interface ServiceNode {
  name: string;
  file: string;
  dependencies: string[];
  usedServices: string[];  // From yield* calls
}

const graph = buildServiceGraph(project);
const cycles = detectCycles(graph);
```

**Tasks**:
1. Create `ServiceGraphBuilder` to extract service definitions
2. Implement cycle detection algorithm
3. Implement dependency validation
4. Add visualization output (Mermaid diagram)
5. Add tests with service fixtures

**Effort**: 5-6 days

---

## Summary

| Phase | Use Cases | Duration | Dependencies |
|-------|-----------|----------|--------------|
| 1 | UC-4.3, UC-1.2, UC-4.5 | 2 weeks | None |
| 2 | UC-2.2, UC-2.3 | 2 weeks | Phase 1 |
| 3 | UC-5.5, UC-5.4 | 2 weeks | Phase 2 |
| 4 | UC-6.2, UC-6.3 | 2 weeks | Phase 2 |

**Total Estimated Duration**: 8 weeks

---

## Milestones

| Milestone | Deliverable | Target |
|-----------|-------------|--------|
| M1 | Configurable rules with category filtering | Week 2 |
| M2 | Project-wide type-aware analysis | Week 4 |
| M3 | GitHub Action with SARIF reporting | Week 6 |
| M4 | Effect pipeline and service analysis | Week 8 |

---

## Dependencies to Add

```json
{
  "dependencies": {
    "ts-morph": "^24.0.0",
    "fast-glob": "^3.3.0",
    "ignore": "^5.3.0"
  },
  "devDependencies": {
    "@actions/core": "^1.10.0",
    "@actions/github": "^6.0.0"
  }
}
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| ts-morph bundle size | Tree-shake unused features; consider lazy loading |
| Type-checking performance | Cache ts.Program; incremental compilation |
| GitHub Action complexity | Start with SARIF-only; add annotations later |
| Circular dependency detection | Use well-tested graph algorithms (Tarjan's) |

---

*Created: January 2026*
