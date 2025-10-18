# Enhanced QA Validation Guide

## Overview

Phase 3 of the QA improvements adds **semantic validation** to the LLM-based QA process. This catches issues that syntax checking and runtime tests miss.

## What's New

### Enhanced QA Schema (`qa-schema-enhanced.mdx`)

Adds 4 semantic validation checks to the existing QA process:

1. **Memory Behavior** 💾
   - Validates streaming patterns actually stream
   - Detects loading entire files/datasets into memory
   - Checks for constant memory usage

2. **Concurrency Claims** 🔀
   - Verifies parallel patterns have concurrency options
   - Detects sequential execution masquerading as parallel
   - Validates timing claims match implementation

3. **Effect Idioms** 🎨
   - Flags non-idiomatic Effect code
   - Detects `catchAll+gen` for logging (should use `tapError`)
   - Checks for proper pipe usage
   - Validates typed errors vs generic `Error`

4. **API Modernization** 🔄
   - Detects 10+ deprecated Effect APIs
   - Suggests modern replacements
   - Checks for outdated patterns

## JSON Response Format

```json
{
  "passed": boolean,
  "errors": ["string"],
  "warnings": ["string"],
  "suggestions": ["string"],
  "semantic_checks": {
    "memory_behavior": "pass" | "fail" | "unknown",
    "concurrency_claims": "pass" | "fail" | "unknown",
    "effect_idioms": "pass" | "fail" | "unknown",
    "api_modernization": "pass" | "fail" | "unknown"
  },
  "tokens": number,
  "cost": number
}
```

## Usage

### Automated QA Process

The QA process automatically uses the enhanced schema:

```bash
# Run QA with enhanced validation
bun run qa:process

# Generate QA report
bun run qa:report
```

The `qa-process.sh` script now:
1. Checks for `qa-schema-enhanced.mdx`
2. Falls back to `qa-schema.mdx` if not found
3. Passes the pattern to the LLM with semantic checks
4. Saves results with semantic validation data

### Manual Testing

Test specific patterns:

```bash
# Test a single pattern
npx tsx cli/src/main.ts generate \
  --schema-prompt scripts/qa/prompts/qa-schema-enhanced.mdx \
  --output-format json \
  --output test-result.json \
  content/new/processed/stream-from-file.mdx

# View results
cat test-result.json | jq
```

### Integration with Pipeline

```bash
# Full pipeline with enhanced QA
bun run ingest          # Extract patterns
bun run test:behavioral # Runtime validation  
bun run lint:effect     # Pattern linting
bun run qa:process      # Enhanced LLM QA
bun run qa:report       # Generate report
```

## Semantic Validation Details

### 1. Memory Behavior Check

**Triggers for**: Patterns with "stream" in filename or title

**What it checks**:
```typescript
// ❌ FAIL: Loads entire file into memory
const content = yield* fs.readFileString(path)
const stream = Stream.fromIterable(content.split('\n'))

// ✅ PASS: True streaming
const stream = fs.readFile(path).pipe(
  Stream.decodeText('utf-8'),
  Stream.splitLines
)
```

**Result**:
- `"pass"` - Uses constant memory streaming
- `"fail"` - Claims streaming but loads everything first
- `"unknown"` - Not a streaming pattern

---

### 2. Concurrency Claims Check

**Triggers for**: Patterns with "parallel", "concurrent", "all" in filename/title

**What it checks**:
```typescript
// ❌ FAIL: Sequential by default!
const results = yield* Effect.all(effects)

// ✅ PASS: Explicitly parallel
const results = yield* Effect.all(effects, { concurrency: "unbounded" })
```

**Result**:
- `"pass"` - Has explicit concurrency option
- `"fail"` - Claims parallel but sequential, or missing option
- `"unknown"` - Not a concurrency pattern

---

### 3. Effect Idioms Check

**What it checks**:

**Anti-Pattern 1**: Verbose error logging
```typescript
// ❌ FAIL: Non-idiomatic
.pipe(Effect.catchAll((e) => Effect.gen(function* () {
  yield* Effect.log(`Error: ${e}`)
})))

// ✅ PASS: Idiomatic
.pipe(
  Effect.tapError((e) => Effect.log(`Error: ${e}`)),
  Effect.catchAll(() => Effect.succeed(default))
)
```

**Anti-Pattern 2**: Generic errors
```typescript
// ❌ FAIL: Generic Error
Effect<string, Error>
Effect.fail(new Error("Failed"))

// ✅ PASS: Typed error
class ParseError extends Data.TaggedError("ParseError")<{
  message: string
}> {}
Effect<string, ParseError>
Effect.fail(new ParseError({ message: "Failed" }))
```

**Anti-Pattern 3**: Long chains without pipe
```typescript
// ❌ FAIL: Hard to read
value.map(f1).map(f2).map(f3).map(f4)

// ✅ PASS: Clear with pipe
pipe(value, map(f1), map(f2), map(f3), map(f4))
```

**Result**:
- `"pass"` - Uses idiomatic patterns
- `"fail"` - Uses anti-patterns
- `"unknown"` - Unable to determine

---

### 4. API Modernization Check

**Deprecated APIs flagged**:

| Deprecated | Modern Replacement |
|------------|-------------------|
| `Effect.fromOption` | `Option.match` + `Effect.succeed`/`fail` |
| `Effect.fromEither` | `Either.match` + `Effect.succeed`/`fail` |
| `Option.zip` | `Option.all` |
| `Either.zip` | `Either.all` |
| `Option.cond` | Ternary + `Option.some`/`none` |
| `Either.cond` | Ternary + `Either.right`/`left` |
| `Effect.matchTag` | `Effect.catchTags` |
| `Schema.string` | `Schema.String` (capitalized) |
| `Brand.Branded<T, "X">` | `T & Brand.Brand<"X">` |
| `Brand.schema()` | `Schema.brand()` |

**Result**:
- `"pass"` - Uses modern APIs throughout
- `"fail"` - Uses deprecated APIs
- `"unknown"` - Unable to determine

---

## Validation Priority

**Priority 1** (Errors - Must Fix):
1. Code compiles and runs
2. No deprecated APIs
3. Concurrency claims match implementation
4. Streaming patterns actually stream

**Priority 2** (Warnings - Should Fix):
1. Uses idiomatic Effect patterns
2. Typed errors instead of generic Error
3. Clear and complete examples
4. Accurate descriptions

**Priority 3** (Suggestions - Nice to Have):
1. More comprehensive examples
2. Performance considerations
3. Edge case handling
4. Additional context

---

## Examples

### Example 1: Streaming Pattern

**Input Pattern**: Claims to stream a large file

**Enhanced QA catches**:
```json
{
  "passed": false,
  "errors": [
    "Streaming pattern loads entire file with fs.readFileString instead of actual streaming"
  ],
  "semantic_checks": {
    "memory_behavior": "fail",
    "concurrency_claims": "unknown",
    "effect_idioms": "pass",
    "api_modernization": "pass"
  }
}
```

**Fix**: Use `fs.readFile().pipe(Stream.decodeText(), Stream.splitLines)`

---

### Example 2: Parallel Pattern

**Input Pattern**: Claims to run effects in parallel

**Enhanced QA catches**:
```json
{
  "passed": false,
  "errors": [
    "Claims 'parallel execution' but Effect.all has no concurrency option (sequential by default)"
  ],
  "warnings": [
    "Example output shows 1500ms but sequential execution would take longer"
  ],
  "semantic_checks": {
    "memory_behavior": "unknown",
    "concurrency_claims": "fail",
    "effect_idioms": "pass",
    "api_modernization": "pass"
  }
}
```

**Fix**: Add `{ concurrency: "unbounded" }` to `Effect.all`

---

### Example 3: Error Handling Pattern

**Input Pattern**: Shows error handling example

**Enhanced QA catches**:
```json
{
  "passed": false,
  "warnings": [
    "Uses Effect.catchAll + Effect.gen just for logging - use Effect.tapError instead",
    "Generic Error type instead of typed error (Data.TaggedError)"
  ],
  "suggestions": [
    "Show example of typed error with Effect.catchTag"
  ],
  "semantic_checks": {
    "memory_behavior": "unknown",
    "concurrency_claims": "unknown",
    "effect_idioms": "fail",
    "api_modernization": "pass"
  }
}
```

**Fix**: Use `tapError` for logging, create typed error class

---

## Benefits

### Catches Real Bugs

Would have prevented all 3 community PRs:
- **PR #11**: Memory behavior check catches non-streaming
- **PR #10**: Concurrency check catches missing options
- **PR #9**: Idioms check catches non-idiomatic patterns

### Improves Quality

- Ensures patterns are idiomatic
- Validates behavior matches claims
- Enforces modern API usage
- Catches subtle semantic issues

### Fast Feedback

- Runs during QA process
- Detailed error messages
- Actionable suggestions
- Prevents issues before release

---

## Comparison: Phase 1 + 2 + 3

| Validation Type | Phase 1 (Behavioral) | Phase 2 (Linter) | Phase 3 (LLM QA) |
|----------------|---------------------|------------------|------------------|
| **Memory Usage** | ✅ Runtime check | ❌ | ✅ Code analysis |
| **Concurrency** | ✅ Timing check | ✅ Option check | ✅ Claims vs impl |
| **Effect Idioms** | ❌ | ✅ Pattern check | ✅ Deep analysis |
| **Deprecated APIs** | ❌ | ✅ Regex check | ✅ Context-aware |
| **Documentation** | ❌ | ❌ | ✅ Accuracy check |
| **Speed** | ~1s | ~30ms | ~5-10s per pattern |
| **Coverage** | Runtime | Syntax | Semantic |

**All 3 together**: Comprehensive validation from syntax to semantics to runtime.

---

## Future Enhancements

Planned additions to semantic validation:

1. **Resource Management** - Check for proper cleanup
2. **Layer Composition** - Validate dependency graphs
3. **Service Patterns** - Check service implementations
4. **Test Isolation** - Verify test layer independence
5. **Performance Claims** - Validate performance characteristics

---

## Contributing

To enhance the QA schema:

1. Edit `scripts/qa/prompts/qa-schema-enhanced.mdx`
2. Add new semantic checks
3. Document in this guide
4. Test with `bun run qa:process`
5. Update examples

---

## Related

- [QA_GAP_ANALYSIS.md](./QA_GAP_ANALYSIS.md) - Why we need these checks
- [EFFECT_LINTER_RULES](../release/EFFECT_LINTER_RULES.md) - Pattern linter rules
- [test-behavioral.ts](./scripts/publish/test-behavioral.ts) - Runtime validation

