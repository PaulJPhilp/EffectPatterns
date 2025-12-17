# Contributing to The Effect Patterns Hub

Thank you for your interest in contributing! This project aims to be the best
community-driven knowledge base for Effect-TS patterns. Every contribution helps.

---

## ⚠️ Pipeline Integrity (CRITICAL)

**All generation must flow through the pipeline. Never bypass it.**

### The Schema Pattern Incident

On December 17, 2025, 60 schema patterns were generated directly to `patterns/schema/` instead of through the pipeline. This caused:

- Output structure violations
- Pipeline steps were skipped
- Validation was incomplete
- Rules and skills didn't regenerate
- Repository integrity was compromised

**This will never happen again.**

### The Rule

✅ **ALLOWED:**
- Create/edit source files in `content/new/`
- Run the pipeline: `bun run pipeline`
- Finalize: `bun run scripts/publish/move-to-published.ts`
- Commit output from `content/published/`

❌ **FORBIDDEN:**
- Never write directly to `patterns/`
- Never write directly to `rules/`
- Never write directly to `.claude/skills/`, `.gemini/`, `.openai/`
- Never modify `content/published/` without using the pipeline

### Three-Layer Protection

We've implemented safeguards to prevent bypass:

1. **Pre-commit Hook** - Blocks commits to forbidden directories
2. **Pipeline Validation** - Detects unauthorized generated files before running
3. **CI/CD Enforcement** - Repository rules validate pipeline integrity

If you see a hook error, **you are trying to bypass the pipeline**. This is not allowed. Let the pipeline handle generation.

---

## Documentation Pipeline

This project uses a two-stage pipeline system:

### 1. Ingest Stage

New patterns start in `/content/new` and go through validation:

- **Source Files**
  - TypeScript examples in `/content/new/src/*.ts`
  - MDX documentation in `/content/new/*.mdx`
  - Run `npm run ingest` to process

### 2. Publishing Pipeline

The main pipeline has five sequential steps:

1. **Test** (`/content/src`)

   - Run all TypeScript examples
   - Verify code correctness

2. **Publish** (`/content/raw` → `/content/published`)

   - Convert raw MDX to published format
   - Expand TypeScript examples inline

3. **Validate** (`/content/published`)

   - Check frontmatter and sections
   - Verify code block consistency

4. **Generate** (`README.md`)

   - Create main README
   - Group patterns by use case

5. **Rules** (`/rules`)
   - Generate AI coding rules
   - Multiple output formats

### Available Commands

- `npm run ingest` - Process new patterns from `/content/new`
- `npm run pipeline` - Run all publishing steps in sequence
- `npm run all` - Alias for pipeline

Individual pipeline steps:

- `npm run test` - Run TypeScript examples
- `npm run publish` - Convert raw to published MDX
- `npm run validate` - Validate published files
- `npm run generate` - Generate README
- `npm run rules` - Generate AI rules

### Validation Rules

All patterns must have:

1. Valid frontmatter with required fields
2. A Good Example section with TypeScript code
3. An Anti-Pattern section
4. Either an Explanation or Rationale section
5. TypeScript code that matches the source file

## Linting Guidelines

The Effect Patterns Hub includes a linter that enforces best practices for Effect-TS code.

### Running the Linter

```bash
# Check all patterns
ep init                # Create ep.json configuration
ep lint rules          # List all linter rules
ep lint content/new/src/**  # Lint TypeScript examples
ep lint --apply        # Auto-fix violations where possible
```

### Linter Rules

The linter enforces 6 key rules:

1. **effect-use-taperror** (warning)
   - Use `Effect.tapError` for logging errors instead of `catchAll` + `Effect.gen`
   - Promotes cleaner, more readable error handling

2. **effect-explicit-concurrency** (warning)
   - Always specify the `concurrency` option in `Effect.all()` and `Effect.forEach()`
   - Prevents accidental sequential execution and resource exhaustion

3. **effect-deprecated-api** (error)
   - Catch usage of deprecated Effect APIs
   - Helps keep patterns up-to-date with current Effect versions

4. **effect-prefer-pipe** (info)
   - Suggest using `pipe()` for long method chains (>3 operations)
   - Improves readability for complex effect compositions

5. **effect-stream-memory** (error)
   - Detect memory-loading operations in stream files
   - Prevents accidental performance issues with large datasets

6. **effect-error-model** (info)
   - Suggest using `Data.TaggedError` instead of generic `Error`
   - Encourages type-safe error handling patterns

### Tips for Pattern Authors

- Run `ep lint` before submitting pull requests
- Use `ep lint --apply` to automatically fix violations where possible
- Review linter output to ensure your examples follow Effect best practices
- If you disagree with a linter rule for your specific context, document the exception

## Adding New Patterns

### Step 1: Create New Pattern Files

Create your new pattern in the `/content/new` directory:

1. Create the TypeScript example in `/content/new/src/{pattern-id}.ts`
2. Create the MDX documentation in `/content/new/{pattern-id}.mdx`

### Step 2: Run the Ingest Process

Run `npm run ingest` to process your new pattern. This will:

1. Validate your pattern files
2. Move the TypeScript file to `/content/src`
3. Move the MDX file to `/content/raw`

If validation fails, fix the issues and try again.

### Step 3: Run the Publishing Pipeline

1. **Fill out your pattern**

   - Add your TypeScript code to the `.ts` file
   - Fill out the MDX template with your pattern details
   - Make sure to include all required sections

2. **Run the pipeline**

   ```bash
   npm run pipeline
   ```

   This will:

   - Run your TypeScript example
   - Convert and validate your MDX
   - Update README and rules

3. **Submit a Pull Request**
   - Verify all pipeline steps passed
   - Include both your source files and generated files

## The Pattern Structure

Each pattern is a single `.mdx` file with YAML frontmatter for metadata and a
Markdown body for the explanation. Please fill out all fields.

- `title`: The human-readable title.
- `id`: A unique, kebab-case identifier (matches the filename).
- `skillLevel`: `beginner` | `intermediate` | `advanced`
- `useCase`: An array of high-level goals (e.g., "Domain Modeling").
- `summary`: A concise, one-sentence explanation.
- `tags`: A list of relevant lowercase keywords.
- `related`: (Optional) A list of related pattern `id`s.
- `author`: Your GitHub username or name.
