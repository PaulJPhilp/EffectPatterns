# QA Service

Quality Assurance service for validating and repairing Effect patterns.

## Overview

The QA Service provides functionality to:
- Get QA status summaries for patterns
- Generate comprehensive QA reports
- Repair failed patterns (single or batch)
- Categorize errors by type
- Generate repair recommendations

## API

### `getQAStatus(config: QAConfig): Effect<QAStatus, Error>`

Get current QA status summary including pass/fail counts and failure categories.

**Parameters:**
- `config` - QA configuration with directory paths

**Returns:** `QAStatus` with total, passed, failed counts and breakdown by category

**Errors:** `Error` if unable to read QA results

---

### `generateQAReport(config: QAConfig): Effect<QAReport, Error>`

Generate a comprehensive QA report with detailed metrics and recommendations.

**Parameters:**
- `config` - QA configuration with directory paths

**Returns:** `QAReport` with summary, failures breakdown, metrics, and recommendations

**Errors:** `Error` if unable to generate report

---

### `repairPattern(patternId: string, config: QAConfig, dryRun: boolean): Effect<RepairResult, Error>`

Repair a single failed pattern.

**Parameters:**
- `patternId` - ID of the pattern to repair
- `config` - QA configuration
- `dryRun` - If true, show what would be changed without applying

**Returns:** `RepairResult` with success status and changes applied

**Errors:** `Error` if pattern not found or repair fails

---

### `repairAllFailed(config: QAConfig, dryRun: boolean): Effect<RepairSummary, Error>`

Repair all failed patterns in batch.

**Parameters:**
- `config` - QA configuration
- `dryRun` - If true, show what would be changed without applying

**Returns:** `RepairSummary` with attempted, repaired, and failed counts

**Errors:** `Error` if batch repair fails

---

### `loadQAResults(config: QAConfig): Effect<QAResult[], Error>`

Load QA results from JSON files in the results directory.

**Parameters:**
- `config` - QA configuration with results directory path

**Returns:** Array of `QAResult` objects

**Errors:** `Error` if unable to read result files

---

### `categorizeError(error: string): string`

Categorize a QA error by type (imports, typescript, deprecated, etc.).

**Parameters:**
- `error` - Error message string

**Returns:** Category string (e.g., "imports", "typescript", "patterns")

---

### `generateRecommendations(results: QAResult[]): string[]`

Generate repair recommendations based on QA results.

**Parameters:**
- `results` - Array of QA results

**Returns:** Array of recommendation strings

## Types

### `QAConfig`
```typescript
interface QAConfig {
  qaDir: string;
  resultsDir: string;
  backupsDir: string;
  repairsDir: string;
  patternsDir: string;
  reportFile: string;
}
```

### `QAStatus`
```typescript
interface QAStatus {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  failuresByCategory: Record<string, number>;
  bySkillLevel: Record<string, { passed: number; failed: number }>;
}
```

### `RepairResult`
```typescript
interface RepairResult {
  patternId: string;
  success: boolean;
  changesApplied?: number;
  error?: string;
}
```

## Errors

- `Error` - Generic error for file operations and validation failures

## Usage

```typescript
import { QA } from "./services/qa/index.js";

const program = Effect.gen(function* () {
  const qa = yield* QA;
  
  const config: QAConfig = {
    qaDir: "./qa",
    resultsDir: "./qa/results",
    backupsDir: "./qa/backups",
    repairsDir: "./qa/repairs",
    patternsDir: "./content/published",
    reportFile: "./qa/report.json",
  };
  
  // Get status
  const status = yield* qa.getQAStatus(config);
  console.log(`Pass rate: ${status.passRate}%`);
  
  // Repair failed patterns (dry run)
  const summary = yield* qa.repairAllFailed(config, true);
  console.log(`Would repair ${summary.repaired} patterns`);
});
```
