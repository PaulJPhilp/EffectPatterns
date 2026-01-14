# Analysis Core: Use Cases

This document defines all use cases for the `@effect-patterns/analysis-core`
package, identifies which are currently implemented, and highlights gaps.

---

## Overview

The analysis-core package provides transport-agnostic code analysis for
Effect-TS projects. It is designed to be consumed by:

- **MCP Server** (HTTP/Vercel) - AI assistant integration
- **CLI Harness** - Bulk analysis and CI/CD pipelines
- **Autonomous Coding Agent** - Automated code improvement

---

## Use Case Categories

1. **Single-File Analysis** - Detect issues in individual files
2. **Multi-File Analysis** - Cross-file consistency checks
3. **Automated Refactoring** - Generate code fixes
4. **Rule Management** - Query and configure rules
5. **Integration** - Consume analysis from external systems

---

## UC-1: Single-File Analysis

### UC-1.1: Analyze File for All Issues ✅ Implemented

**Actor**: Developer, CI Pipeline, AI Agent

**Description**: Analyze a single TypeScript file and return all detected
issues (findings) and summary suggestions.

**Input**:
- `filename`: string
- `source`: string (file content)

**Output**:
- `findings[]`: Concrete violations with location, severity, fix suggestions
- `suggestions[]`: Summary-level recommendations
- `analyzedAt`: ISO timestamp

**API**: `AnalysisService.analyzeFile(filename, content)`

**Current Rules Detected** (20 rules):
| Rule ID | Description | Severity |
|---------|-------------|----------|
| `async-await` | Prefer Effect over async/await | high |
| `node-fs` | Prefer @effect/platform FileSystem | medium |
| `try-catch-in-effect` | Prefer Effect.try over try/catch | high |
| `try-catch-boundary-ok` | try/catch OK at HTTP boundaries | low |
| `catch-log-and-swallow` | Don't log and swallow errors | high |
| `throw-in-effect-code` | Don't throw inside Effect code | high |
| `any-type` | Avoid `any` type | high |
| `effect-map-fn-reference` | Wrap Effect.map callbacks | low |
| `yield-star-non-effect` | yield* on non-Effect value | medium |
| `context-tag-anti-pattern` | Use Effect.Service not Context.Tag | high |
| `promise-all-in-effect` | Use Effect.all not Promise.all | high |
| `mutable-ref-in-effect` | Avoid mutable refs in Effect | medium |
| `console-log-in-effect` | Use Effect logging | medium |
| `effect-runSync-unsafe` | Avoid Effect.runSync | high |
| `layer-provide-anti-pattern` | Provide layers at root | medium |
| `effect-gen-no-yield` | Effect.gen without yield* is wasteful | low |
| `schema-decode-unknown` | Use Schema for external data | high |
| `missing-validation` | Add input validation | high |
| `missing-error-channel` | Effect may fail but error is never | high |
| `non-typescript` | Non-TypeScript input warning | low |

---

### UC-1.2: Analyze File by Category ✅ Implemented

**Actor**: Developer, AI Agent

**Description**: Analyze a file for a specific category of issues only.

**Input**:
- `filename`: string
- `source`: string
- `analysisType`: `"validation"` | `"patterns"` | `"errors"` | `"all"`

**Output**: Filtered findings based on category

**API**: `CodeAnalyzerService.analyze({ source, filename, analysisType })`

**Note**: Currently `analysisType` is accepted but all rules run regardless.
Category filtering is a gap.

---

### UC-1.3: Get Precise Source Locations ✅ Implemented

**Actor**: IDE Integration, AI Agent

**Description**: Each finding includes precise 1-based line/column ranges
for highlighting in editors.

**Output per finding**:
```typescript
range: {
  startLine: number;  // 1-based
  startCol: number;   // 1-based
  endLine: number;
  endCol: number;
}
```

---

## UC-2: Multi-File Analysis

### UC-2.1: Detect Cross-File Inconsistencies ✅ Implemented

**Actor**: CI Pipeline, Code Review

**Description**: Analyze multiple files together to detect inconsistent
patterns across a codebase.

**Input**:
- `files[]`: Array of `{ filename, source }`

**Output**:
- `issues[]`: Cross-file consistency issues

**API**: `AnalysisService.analyzeConsistency(files)`

**Current Consistency Checks**:
| Issue ID | Description |
|----------|-------------|
| `mixed-fs` | Some files use node:fs, others use @effect/platform |
| `mixed-validation` | Inconsistent use of Effect.filterOrFail |

---

### UC-2.2: Project-Wide Analysis ❌ Not Implemented

**Actor**: CI Pipeline, Architect

**Description**: Analyze an entire project directory, respecting gitignore,
and produce a comprehensive report.

**Gap**: Currently requires caller to read files and pass content. No
built-in directory traversal or project discovery.

---

### UC-2.3: Type-Aware Analysis ❌ Not Implemented

**Actor**: Advanced Linting

**Description**: Use TypeScript's type checker to distinguish between
`Effect.map` and `Array.map`, or verify that a variable is actually an
Effect type before flagging.

**Gap**: Current analysis is purely syntactic (AST-based). No `ts.Program`
or type checker integration.

---

## UC-3: Automated Refactoring

### UC-3.1: Generate Fix Preview ✅ Implemented

**Actor**: Developer, AI Agent

**Description**: Given a rule violation, generate a preview of the
automated fix without writing files.

**Input**:
- `ruleId`: The violated rule
- `filename`: string
- `source`: string

**Output**:
- `changes[]`: Array of `{ filename, before, after }`
- `applied`: boolean (always `false` - preview only)

**API**: `AnalysisService.generateFix({ ruleId, filename, source })`

---

### UC-3.2: Apply Multiple Refactorings ✅ Implemented

**Actor**: Bulk Migration, AI Agent

**Description**: Apply one or more refactorings to multiple files at once.

**Input**:
- `refactoringIds[]`: Fix IDs to apply
- `files[]`: Array of `{ filename, source }`

**Output**:
- `changes[]`: Transformed file contents

**API**: `AnalysisService.applyRefactorings(refactoringIds, files)`

**Current Refactorings** (7 fixes):
| Fix ID | Description |
|--------|-------------|
| `replace-node-fs` | Rewrite node:fs imports to @effect/platform |
| `add-filter-or-fail-validator` | Add Effect.filterOrFail validation |
| `wrap-effect-map-callback` | Wrap Effect.map(fn) to Effect.map(x => fn(x)) |
| `replace-context-tag` | Convert Context.Tag to Effect.Service |
| `replace-promise-all` | Convert Promise.all to Effect.all |
| `replace-console-log` | Convert console.log to Effect.log |
| `add-schema-decode` | Add TODO comment for Schema.decodeUnknown |

---

### UC-3.3: Apply Fix and Write Files ❌ Not Implemented

**Actor**: CLI, IDE Plugin

**Description**: Apply refactorings and write the results back to disk.

**Gap**: The engine is preview-only. Writing files is left to the caller.
This is intentional for transport-agnostic design but could be a separate
utility.

---

### UC-3.4: Interactive Fix Selection ❌ Not Implemented

**Actor**: Developer

**Description**: Present multiple fix options for a single issue and let
the user choose.

**Gap**: Currently each rule maps to specific fixes. No alternative fix
suggestions or user choice mechanism.

---

## UC-4: Rule Management

### UC-4.1: List All Rules ✅ Implemented

**Actor**: Developer, Documentation

**Description**: Retrieve the complete list of governed rules with metadata.

**Output per rule**:
- `id`: RuleId
- `title`: Human-readable name
- `message`: Detailed explanation
- `severity`: `"low"` | `"medium"` | `"high"`
- `category`: `"async"` | `"errors"` | `"validation"` | `"resources"` |
  `"dependency-injection"` | `"style"`
- `fixIds[]`: Available automated fixes

**API**: `AnalysisService.listRules()`

---

### UC-4.2: List All Fixes ✅ Implemented

**Actor**: Developer, Documentation

**Description**: Retrieve the complete list of available automated fixes.

**Output per fix**:
- `id`: FixId
- `title`: Human-readable name
- `description`: What the fix does

**API**: `AnalysisService.listFixes()`

---

### UC-4.3: Enable/Disable Rules ❌ Not Implemented

**Actor**: Developer, Project Configuration

**Description**: Configure which rules are active for a project, similar
to ESLint's configuration.

**Gap**: All rules are always active. No configuration file support
(e.g., `.analysisrc.json`).

---

### UC-4.4: Custom Rule Definition ❌ Not Implemented

**Actor**: Team Lead, Architect

**Description**: Define custom rules specific to a project's conventions.

**Gap**: Rules are hardcoded in `RuleRegistryService`. No plugin or
extension mechanism.

---

### UC-4.5: Rule Severity Override ❌ Not Implemented

**Actor**: Developer

**Description**: Override the default severity of rules per project.

**Gap**: Severities are fixed in the rule definitions.

---

## UC-5: Integration

### UC-5.1: MCP Server Integration ✅ Implemented

**Actor**: AI Assistant (Claude, etc.)

**Description**: Expose analysis capabilities via MCP protocol for AI
assistants to analyze code in real-time.

**Integration Point**: `packages/mcp-server` depends on `analysis-core`

---

### UC-5.2: CLI Integration ✅ Implemented

**Actor**: Developer, CI Pipeline

**Description**: Run analysis from command line for local development
and CI/CD pipelines.

**Integration Point**: CLI harness can import and use `AnalysisService`

---

### UC-5.3: IDE Plugin Integration ❌ Not Implemented

**Actor**: Developer

**Description**: Real-time analysis in VS Code or other IDEs with
inline diagnostics and quick fixes.

**Gap**: No Language Server Protocol (LSP) implementation. Would require
a separate package.

---

### UC-5.4: GitHub Action Integration ❌ Not Implemented

**Actor**: CI Pipeline

**Description**: Pre-built GitHub Action for running analysis on PRs
with inline comments.

**Gap**: No GitHub Action package. Users must build their own workflow.

---

### UC-5.5: Batch Report Generation ❌ Not Implemented

**Actor**: Architect, Tech Lead

**Description**: Generate comprehensive reports (HTML, JSON, Markdown)
for codebase health dashboards.

**Gap**: No report generation. Output is raw JSON only.

---

## UC-6: Advanced Analysis (Future)

### UC-6.1: Dependency Graph Analysis ❌ Not Implemented

**Actor**: Architect

**Description**: Analyze import/export relationships to detect circular
dependencies, unused exports, or layering violations.

---

### UC-6.2: Effect Pipeline Analysis ❌ Not Implemented

**Actor**: Developer

**Description**: Trace Effect pipelines to detect:
- Unreachable error handlers
- Missing error channel types
- Unnecessary Effect wrapping

---

### UC-6.3: Service Dependency Analysis ❌ Not Implemented

**Actor**: Architect

**Description**: Analyze Effect.Service definitions to:
- Detect circular service dependencies
- Validate layer composition
- Suggest optimal layer ordering

---

### UC-6.4: Performance Pattern Detection ❌ Not Implemented

**Actor**: Performance Engineer

**Description**: Detect patterns that may cause performance issues:
- Unbounded concurrency
- Missing caching opportunities
- N+1 query patterns in Effect code

---

### UC-6.5: Migration Assistant ❌ Not Implemented

**Actor**: Developer

**Description**: Assist with migrations:
- Effect 2.x to 3.x
- Legacy patterns to modern Effect.Service
- Batch refactoring with rollback support

---

## Summary

### Implemented Use Cases (11)

| ID | Use Case | Status |
|----|----------|--------|
| UC-1.1 | Analyze File for All Issues | ✅ |
| UC-1.2 | Analyze File by Category | ✅ (partial) |
| UC-1.3 | Get Precise Source Locations | ✅ |
| UC-2.1 | Detect Cross-File Inconsistencies | ✅ |
| UC-3.1 | Generate Fix Preview | ✅ |
| UC-3.2 | Apply Multiple Refactorings | ✅ |
| UC-4.1 | List All Rules | ✅ |
| UC-4.2 | List All Fixes | ✅ |
| UC-5.1 | MCP Server Integration | ✅ |
| UC-5.2 | CLI Integration | ✅ |

### Missing Use Cases (15)

| ID | Use Case | Priority | Effort |
|----|----------|----------|--------|
| UC-1.2 | Category Filtering (complete) | Medium | Low |
| UC-2.2 | Project-Wide Analysis | High | Medium |
| UC-2.3 | Type-Aware Analysis | High | High |
| UC-3.3 | Apply Fix and Write Files | Low | Low |
| UC-3.4 | Interactive Fix Selection | Low | Medium |
| UC-4.3 | Enable/Disable Rules | High | Medium |
| UC-4.4 | Custom Rule Definition | Medium | High |
| UC-4.5 | Rule Severity Override | Medium | Low |
| UC-5.3 | IDE Plugin (LSP) | High | High |
| UC-5.4 | GitHub Action | Medium | Medium |
| UC-5.5 | Batch Report Generation | Medium | Medium |
| UC-6.1 | Dependency Graph Analysis | Low | High |
| UC-6.2 | Effect Pipeline Analysis | Medium | High |
| UC-6.3 | Service Dependency Analysis | Medium | High |
| UC-6.4 | Performance Pattern Detection | Low | High |
| UC-6.5 | Migration Assistant | Medium | High |

---

## Recommended Priorities

### Phase 1: High Value / Low Effort
1. **UC-4.3**: Rule configuration file support
2. **UC-1.2**: Complete category filtering
3. **UC-4.5**: Severity overrides

### Phase 2: High Value / Medium Effort
1. **UC-2.2**: Project-wide analysis with directory traversal
2. **UC-5.4**: GitHub Action for CI integration
3. **UC-5.5**: Report generation (JSON, Markdown, HTML)

### Phase 3: Advanced Features
1. **UC-2.3**: Type-aware analysis with ts.Program
2. **UC-5.3**: LSP server for IDE integration
3. **UC-6.2**: Effect pipeline analysis
4. **UC-6.3**: Service dependency analysis

---

*Last updated: January 2026*
