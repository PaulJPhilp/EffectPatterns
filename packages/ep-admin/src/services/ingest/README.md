# Ingest Service

Pattern ingestion and processing service for the Effect Patterns publishing pipeline.

## Overview

The Ingest Service handles:
- Discovering patterns from raw directories
- Validating pattern structure and content
- Testing TypeScript code in patterns
- Checking for duplicate patterns
- Migrating patterns to published directory
- Running the complete ingest pipeline

## API

### `discoverPatterns(config: IngestConfig): Effect<Pattern[], Error>`

Discover patterns from the raw directory.

**Parameters:**
- `config` - Ingest configuration with directory paths

**Returns:** Array of discovered `Pattern` objects

**Errors:** `Error` if directory read fails

---

### `validatePattern(pattern: Pattern, config: IngestConfig): Effect<IngestResult, Error>`

Validate a single pattern's structure and content.

**Parameters:**
- `pattern` - Pattern to validate
- `config` - Ingest configuration

**Returns:** `IngestResult` with validation status and issues

**Errors:** `Error` if validation fails

---

### `validatePatterns(patterns: Pattern[], config: IngestConfig): Effect<IngestResult[], Error>`

Validate multiple patterns in batch.

**Parameters:**
- `patterns` - Array of patterns to validate
- `config` - Ingest configuration

**Returns:** Array of `IngestResult` objects

**Errors:** `Error` if batch validation fails

---

### `testPattern(result: IngestResult): Effect<IngestResult, Error>`

Test a pattern's TypeScript code for compilation.

**Parameters:**
- `result` - Ingest result with pattern to test

**Returns:** Updated `IngestResult` with test status

**Errors:** `Error` if test execution fails

---

### `checkDuplicates(results: IngestResult[], config: IngestConfig): Effect<IngestResult[], Error>`

Check for duplicate patterns in the published directory.

**Parameters:**
- `results` - Array of ingest results
- `config` - Ingest configuration

**Returns:** Updated results with duplicate flags

**Errors:** `Error` if duplicate check fails

---

### `migratePattern(result: IngestResult, config: IngestConfig): Effect<boolean, Error>`

Migrate a validated pattern to the published directory.

**Parameters:**
- `result` - Ingest result with pattern to migrate
- `config` - Ingest configuration

**Returns:** `true` if migration successful

**Errors:** `Error` if migration fails

---

### `runIngestPipeline(config: IngestConfig): Effect<IngestReport, Error>`

Run the complete ingest pipeline (discover, validate, test, migrate).

**Parameters:**
- `config` - Ingest configuration

**Returns:** `IngestReport` with complete pipeline results

**Errors:** `Error` if pipeline fails

---

### `processFile(file: string, config: IngestConfig): Effect<ProcessResult, Error>`

Process a single file through the pipeline.

**Parameters:**
- `file` - File path to process
- `config` - Ingest configuration

**Returns:** `ProcessResult` with success status

**Errors:** `Error` if processing fails

---

### `generateReport(results: IngestResult[]): IngestReport`

Generate an ingest report from results (synchronous).

**Parameters:**
- `results` - Array of ingest results

**Returns:** `IngestReport` with summary statistics

## Types

### `IngestConfig`
```typescript
interface IngestConfig {
  rawDir: string;
  srcDir: string;
  processedDir: string;
  publishedDir: string;
  targetPublishedDir: string;
  reportDir: string;
}
```

### `Pattern`
```typescript
interface Pattern {
  id: string;
  title: string;
  rawPath: string;
  srcPath: string;
  processedPath: string;
  frontmatter: Record<string, unknown>;
  hasTypeScript: boolean;
}
```

### `IngestResult`
```typescript
interface IngestResult {
  pattern: Pattern;
  valid: boolean;
  issues: IngestIssue[];
  qaScore?: number;
  qaPassed?: boolean;
  testPassed?: boolean;
  isDuplicate?: boolean;
}
```

## Errors

- `Error` - Generic error for file operations and validation failures

## Usage

```typescript
import { Ingest } from "./services/ingest/index.js";

const program = Effect.gen(function* () {
  const ingest = yield* Ingest;
  
  const config: IngestConfig = {
    rawDir: "./content/new/raw",
    srcDir: "./content/new/src",
    processedDir: "./content/new/processed",
    publishedDir: "./content/published",
    targetPublishedDir: "./content/published",
    reportDir: "./reports",
  };
  
  // Run complete pipeline
  const report = yield* ingest.runIngestPipeline(config);
  console.log(`Processed ${report.totalPatterns} patterns`);
  console.log(`Migrated: ${report.migrated}, Failed: ${report.failed}`);
});
```
