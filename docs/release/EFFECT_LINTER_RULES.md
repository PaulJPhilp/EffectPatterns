# Effect Patterns Linter Rules

Custom linter for Effect-TS patterns and idioms. Runs alongside Biome to catch Effect-specific issues that general-purpose linters can't detect.

## Usage

```bash
# Run Biome (general TypeScript linting)
bun run lint

# Run Effect patterns linter
bun run lint:effect

# Run both
bun run lint:all
```

---

## Rules

### 1. `effect-use-taperror` ⚠️ Warning

**Detects**: Using `Effect.catchAll` with `Effect.gen` just for logging

**Problem**:
```typescript
// ❌ Verbose and not idiomatic
parseJson(json).pipe(
	Effect.catchAll((error) =>
		Effect.gen(function* () {
			yield* Effect.log(`Error: ${error.message}`)
		})
	)
)
```

**Solution**:
```typescript
// ✅ Use tapError for side-effect logging
parseJson(json).pipe(
	Effect.tapError((error) => Effect.log(`Error: ${error.message}`)),
	Effect.catchAll(() => Effect.succeed(defaultValue))
)
```

**Why**: `Effect.tapError` is designed for side-effect logging. Reserve `Effect.catchAll` for actual error recovery.

---

### 2. `effect-explicit-concurrency` ⚠️ Warning / ❌ Error

**Detects**: `Effect.all` without explicit `concurrency` option

**Problem**:
```typescript
// ❌ Runs sequentially by default!
const results = yield* Effect.all(effects)
```

**Solution**:
```typescript
// ✅ Explicitly parallel
const results = yield* Effect.all(effects, { concurrency: "unbounded" })

// ✅ Or explicitly sequential
const results = yield* Effect.all(effects, { concurrency: 1 })

// ✅ Or bounded parallelism
const results = yield* Effect.all(effects, { concurrency: 5 })
```

**Why**: `Effect.all` is sequential by default, which is often surprising. Being explicit about concurrency prevents performance bugs.

**Severity**:
- **Error** in files with "parallel" or "concurrent" in the name
- **Warning** in other files

---

### 3. `effect-deprecated-api` ❌ Error

**Detects**: Usage of deprecated Effect APIs

| Deprecated | Replacement |
|------------|-------------|
| `Effect.fromOption` | `Option.match` with `Effect.succeed`/`Effect.fail` |
| `Effect.fromEither` | `Either.match` with `Effect.succeed`/`Effect.fail` |
| `Option.zip` | `Option.all` |
| `Either.zip` | `Either.all` |
| `Option.cond` | Ternary with `Option.some`/`Option.none` |
| `Either.cond` | Ternary with `Either.right`/`Either.left` |
| `Effect.matchTag` | `Effect.catchTags` |

**Example**:
```typescript
// ❌ Deprecated
const effect = Effect.fromOption(option, () => new Error("None"))

// ✅ Modern API
const effect = Option.match(option, {
	onNone: () => Effect.fail(new Error("None")),
	onSome: (value) => Effect.succeed(value)
})
```

---

### 4. `effect-prefer-pipe` ℹ️ Info

**Detects**: Long method chains (>3 calls)

**Problem**:
```typescript
// 🤔 Hard to read
const result = value.map(x => x * 2).filter(x => x > 5).reduce((a, b) => a + b).toString()
```

**Solution**:
```typescript
// ✅ More readable with pipe
const result = pipe(
	value,
	Array.map(x => x * 2),
	Array.filter(x => x > 5),
	Array.reduce((a, b) => a + b),
	String
)
```

**Why**: Pipe-based composition is more readable for long chains and follows Effect conventions.

---

### 5. `effect-stream-memory` ❌ Error / ⚠️ Warning

**Detects**: Non-streaming operations in stream patterns

**Problem**:
```typescript
// ❌ Loads entire file into memory!
const content = yield* fs.readFileString(filePath)
const stream = Stream.fromIterable(content.split('\n'))
```

**Solution**:
```typescript
// ✅ True streaming with constant memory
const stream = fs.readFile(filePath).pipe(
	Stream.decodeText('utf-8'),
	Stream.splitLines
)
```

**Why**: Streaming patterns should use constant memory, not load entire datasets into memory first.

**Also Detects**:
- `Stream.runCollect` (loads entire stream into memory)
- Suggest: Use `Stream.run` or other streaming combinators

---

### 6. `effect-error-model` ℹ️ Info

**Detects**: Generic `Error` instead of typed errors

**Problem**:
```typescript
// 🤔 Generic error type
const effect: Effect<string, Error, never> = ...
Effect.fail(new Error("Something went wrong"))
```

**Solution**:
```typescript
// ✅ Typed error
class ParseError extends Data.TaggedError("ParseError")<{
	readonly message: string
}> {}

const effect: Effect<string, ParseError, never> = ...
Effect.fail(new ParseError({ message: "Invalid JSON" }))
```

**Why**: Typed errors enable:
- Better error handling with `Effect.catchTag`
- Type-safe error recovery
- Clear error contracts

---

## Configuration

The linter checks:
- `content/new/src/*.ts` (new patterns)
- `content/src/*.ts` (published patterns)

Concurrency: 10 files in parallel

---

## Integration

### CI/CD

Add to your CI pipeline:

```yaml
- name: Lint Effect Patterns
	run: bun run lint:effect
```

### Pre-commit Hook

```bash
#!/bin/sh
bun run lint:all
```

### VS Code

You can create a task in `.vscode/tasks.json`:

```json
{
	"label": "Lint Effect Patterns",
	"type": "shell",
	"command": "bun run lint:effect",
	"group": "test"
}
```

---

## Performance

- **Speed**: ~30ms for 42 files
- **Parallel**: 10 workers
- **Memory**: Low (streaming file reads)

---

## Disabling Rules

To disable a rule for a specific line, add a comment:

```typescript
// effect-lint-disable-next-line effect-explicit-concurrency
const results = yield* Effect.all(effects)
```

To disable for an entire file:

```typescript
// effect-lint-disable-file
```

---

## Comparison with Biome

| Feature | Biome | Effect Linter |
|---------|-------|---------------|
| General TypeScript | ✅ | ❌ |
| Formatting | ✅ | ❌ |
| Effect Idioms | ❌ | ✅ |
| Deprecated APIs | ❌ | ✅ |
| Concurrency Checks | ❌ | ✅ |
| Streaming Validation | ❌ | ✅ |
| Speed | Very Fast | Fast |

**Use both**: Biome for general linting, Effect Linter for Effect-specific patterns.

---

## Future Rules

Planned additions:

1. **effect-service-naming**: Enforce naming conventions for services
2. **effect-layer-composition**: Check for proper layer composition
3. **effect-test-isolation**: Verify test layer isolation
4. **effect-context-usage**: Validate Context usage patterns
5. **effect-resource-cleanup**: Check for proper resource cleanup

---

## Contributing

To add a new rule:

1. Add the check function in `scripts/publish/lint-effect-patterns.ts`
2. Document it in this file
3. Add test cases in `scripts/__tests__/lint-effect-patterns.test.ts`
4. Update the changelog

---

## Related

- [QA_GAP_ANALYSIS.md](./QA_GAP_ANALYSIS.md) - Why we need semantic validation
- [Biome Configuration](./biome.json) - General linting rules
- [Behavioral Tests](./scripts/publish/test-behavioral.ts) - Runtime validation

