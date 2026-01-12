# Publish Service

Complete publishing pipeline service for Effect Patterns.

## Overview

The Publish Service provides:
- Pattern validation (structure, frontmatter, sections)
- TypeScript code testing and type checking
- Effect-TS linting with custom rules
- Pattern publishing to target directories
- README generation with statistics
- Full pipeline orchestration

## API

### Validation

#### `validatePattern(patternPath: string, config: ValidatorConfig): Effect<ValidationResult, Error>`

Validate a single pattern file.

**Parameters:**
- `patternPath` - Path to the pattern MDX file
- `config` - Validator configuration

**Returns:** `ValidationResult` with validity status and issues

---

#### `validateAllPatterns(config: ValidatorConfig): Effect<ValidationResult[], Error>`

Validate all patterns in the published directory.

**Parameters:**
- `config` - Validator configuration with directory paths

**Returns:** Array of `ValidationResult` objects

---

### Testing

#### `testPattern(patternPath: string, config: TesterConfig): Effect<TestResult, Error>`

Test a single pattern's TypeScript code.

**Parameters:**
- `patternPath` - Path to the pattern
- `config` - Tester configuration

**Returns:** `TestResult` with pass/fail status

---

#### `runTypeCheck(patternPath: string): Effect<boolean, Error>`

Run TypeScript type checking on a pattern.

**Parameters:**
- `patternPath` - Path to the pattern

**Returns:** `true` if type check passes

---

#### `runFullTestSuite(config: TesterConfig): Effect<TestSummary, Error>`

Run the complete test suite on all patterns.

**Parameters:**
- `config` - Tester configuration

**Returns:** `TestSummary` with aggregate results

---

### Linting

#### `lintFile(filePath: string, config: LinterConfig): Effect<LintResult, Error>`

Lint a single file with Effect-TS rules.

**Parameters:**
- `filePath` - Path to the file
- `config` - Linter configuration

**Returns:** `LintResult` with issues found

---

#### `lintAllFiles(config: LinterConfig): Effect<LintResult[], Error>`

Lint all files in the source directory.

**Parameters:**
- `config` - Linter configuration

**Returns:** Array of `LintResult` objects

---

### Publishing

#### `publishPattern(patternPath: string, config: PublisherConfig): Effect<PublishResult, Error>`

Publish a single pattern to the target directory.

**Parameters:**
- `patternPath` - Path to the pattern
- `config` - Publisher configuration

**Returns:** `PublishResult` with success status

---

#### `publishAllPatterns(config: PublisherConfig): Effect<PublishResult[], Error>`

Publish all patterns to the target directory.

**Parameters:**
- `config` - Publisher configuration

**Returns:** Array of `PublishResult` objects

---

### Generation

#### `generateReadme(config: GeneratorConfig): Effect<string, Error>`

Generate README content from patterns.

**Parameters:**
- `config` - Generator configuration

**Returns:** Generated README string

---

#### `generateReadmeWithStats(config: GeneratorConfig): Effect<{ readme: string; stats: PatternInfo[] }, Error>`

Generate README with pattern statistics.

**Parameters:**
- `config` - Generator configuration

**Returns:** Object with README and pattern stats

---

### Pipeline

#### `runFullPipeline(config: PipelineConfig): Effect<PipelineResult, Error>`

Run the complete publishing pipeline.

**Parameters:**
- `config` - Pipeline configuration

**Returns:** `PipelineResult` with all step results

---

#### `runValidateAndTest(config: PipelineConfig): Effect<{ validation: ValidationResult[]; testing: TestResult[] }, Error>`

Run validation and testing steps only.

---

#### `runPublishAndGenerate(config: PipelineConfig): Effect<{ publishing: PublishResult[]; generation: string }, Error>`

Run publishing and generation steps only.

## Types

### `ValidatorConfig`
```typescript
interface ValidatorConfig {
  publishedDir: string;
  srcDir: string;
  concurrency: number;
}
```

### `ValidationResult`
```typescript
interface ValidationResult {
  file: string;
  valid: boolean;
  issues: ValidationIssue[];
  warnings: number;
  errors: number;
}
```

### `TestResult`
```typescript
interface TestResult {
  file: string;
  passed: boolean;
  error?: string;
  duration: number;
}
```

### `LintResult`
```typescript
interface LintResult {
  file: string;
  issues: LintIssue[];
  errorCount: number;
  warningCount: number;
}
```

### `PipelineResult`
```typescript
interface PipelineResult {
  validation: ValidationResult[];
  testing: TestResult[];
  linting: LintResult[];
  publishing: PublishResult[];
  generation: string;
  success: boolean;
}
```

## Errors

- `Error` - Generic error for file operations and pipeline failures

## Usage

```typescript
import { Publish } from "./services/publish/index.js";

const program = Effect.gen(function* () {
  const publish = yield* Publish;
  
  const config: PipelineConfig = {
    publishedDir: "./content/published",
    srcDir: "./content/src",
    targetDir: "./dist/patterns",
    concurrency: 4,
  };
  
  // Run full pipeline
  const result = yield* publish.runFullPipeline(config);
  
  if (result.success) {
    console.log("Pipeline completed successfully!");
  } else {
    console.log("Pipeline failed with errors");
  }
});
```
