# PIPELINE.md - Publishing Pipeline Architecture

## Overview

The Effect Patterns Hub uses a strict two-stage publishing pipeline that enforces separation between source patterns and generated outputs. This document describes the complete architecture, from source creation through final publication.

## Design Principles

1. **Separation of Concerns**
   - Source files live in `content/new/`
   - Generated files live in `content/published/`
   - Pipeline is the only mechanism for generation

2. **Idempotency**
   - Pipeline can run multiple times safely
   - Patterns can be refined and re-published
   - README and rules regenerate from published state

3. **Atomic Prevention**
   - Pre-commit hooks block unauthorized outputs
   - Pipeline validation detects bypass attempts
   - Three-layer protection prevents the Schema Pattern Incident

4. **Integrity Protection**
   - All outputs are generated, never hand-edited
   - Direct edits are overwritten on next pipeline run
   - Git history prevents accidental bypasses

## Repository Architecture

```
effect-patterns/
├── content/
│   ├── new/                          ← SOURCE (inputs to pipeline)
│   │   ├── src/                      ← TypeScript examples
│   │   │   └── *.ts
│   │   ├── processed/                ← After validation (transient)
│   │   │   └── *.mdx
│   │   └── published/                ← Pipeline output (before finalize)
│   │       └── *.mdx
│   └── published/                    ← CANONICAL (finalized, published)
│       ├── patterns/
│       │   ├── core/                 ← 131 original patterns
│       │   │   └── *.mdx
│       │   └── schema/               ← 64 new schema patterns
│       │       ├── composition/
│       │       ├── transformations/
│       │       ├── unions/
│       │       ├── recursive/
│       │       ├── error-handling/
│       │       ├── async-validation/
│       │       ├── validating-api-responses/
│       │       ├── parsing-ai-responses/
│       │       ├── defining-ai-output-schemas/
│       │       ├── web-standards-validation/
│       │       ├── form-validation/
│       │       ├── json-file-validation/
│       │       ├── json-db-validation/
│       │       └── environment-config/
│       ├── rules/                    ← GENERATED (6 formats)
│       │   ├── rules.md
│       │   ├── rules-compact.md
│       │   ├── rules.json
│       │   ├── by-use-case/
│       │   ├── cursor/
│       │   └── windsurf/
│       └── skills/                   ← GENERATED (3 AI platforms)
│           ├── claude/
│           ├── gemini/
│           └── openai/
├── scripts/publish/
│   ├── pipeline.ts                   ← Main orchestrator
│   ├── test-improved.ts              ← Step 1: Type check
│   ├── publish.ts                    ← Step 2: Embed code
│   ├── validate-improved.ts          ← Step 3: Validate structure
│   ├── generate.ts                   ← Step 4: Generate README
│   ├── rules-improved.ts             ← Step 5: Generate rules
│   ├── validate-pipeline-integrity.ts ← Prevention layer 2
│   └── move-to-published.ts          ← Finalization step
├── .git/hooks/
│   └── pre-commit                    ← Prevention layer 1
├── PIPELINE.md                       ← This file
├── PIPELINE-REVIEW.md                ← Code review checklist
├── CONTRIBUTING.md                   ← Contributor guidelines
├── ARCHITECTURE.md                   ← System design
└── README.md                         ← GENERATED (do not edit)
```

## Publishing Pipeline (5 Steps)

### Stage 1: Source Creation

**User creates patterns in `content/new/`:**

```bash
mkdir -p content/new/src
touch content/new/src/my-pattern.ts
touch content/new/my-pattern.mdx
```

### Stage 2: Pipeline Execution

**Command:** `bun run pipeline`

#### Step 1: Type Check TypeScript Examples
- **Input:** `content/new/src/*.ts`
- **Validation:** TypeScript compilation (syntax & imports)
- **Output:** Pass/fail count
- **Failure:** Stops pipeline with error details

#### Step 2: Publish MDX Files
- **Input:** `content/new/processed/*.mdx` + `content/new/src/*.ts`
- **Transformation:** Embeds TypeScript code into MDX
- **Output:** `content/new/published/*.mdx`
- **Failure:** Stops pipeline with file/parsing errors

#### Step 3: Validate Published Files
- **Input:** `content/new/published/*.mdx`
- **Checks:** Required frontmatter fields, sections, use case normalization
- **Output:** Validation report
- **Failure:** Stops pipeline with specific violations

#### Step 4: Generate README
- **Input:** `content/published/patterns/` (finalized patterns only)
- **Output:** `README.md` with 26-category structure
- **Structure:** 12 core + 14 schema categories

#### Step 5: Generate AI Coding Rules
- **Input:** `content/published/patterns/` (rule.description from frontmatter)
- **Outputs (6 formats):**
  - `rules.md` / `rules-compact.md` / `rules.json`
  - `by-use-case/{category}.md`
  - `cursor/*.mdc` / `windsurf/*.mdc`

### Stage 3: Finalization

**Command:** `bun run scripts/publish/move-to-published.ts`

- Moves: `content/new/published/*.mdx` → `content/published/patterns/`
- Cleans: Temporary directories
- Updates: Pipeline state metadata
- Result: Patterns visible on website, README reflects new patterns

## Atomic Prevention System

### Layer 1: Pre-commit Hook
**File:** `.git/hooks/pre-commit`

Blocks commits to forbidden directories:
- `patterns/`, `rules/`
- `.claude/skills/`, `.gemini/skills/`, `.openai/skills/`

### Layer 2: Pipeline Validation
**File:** `scripts/publish/validate-pipeline-integrity.ts`

Runs at pipeline start to detect unauthorized files.

### Layer 3: Documentation
**Files:** `CONTRIBUTING.md`, `ARCHITECTURE.md`, `PIPELINE.md`

Clear workflow prevents confusion.

## Typical Workflow

```bash
# 1. Create pattern files in content/new/
mkdir -p content/new/src
touch content/new/src/my-pattern.ts
touch content/new/my-pattern.mdx

# 2. Run complete pipeline
bun run pipeline

# 3. Finalize to publish
bun run scripts/publish/move-to-published.ts

# 4. Next pipeline run updates README and rules
bun run pipeline

# 5. Commit everything
git add -A
git commit -m "feat: add my pattern"
```

## Critical Details

### README Generation
- Reads from `content/published/` (finalized patterns only)
- Does NOT include patterns from `content/new/published/`
- **To see new patterns in README:** Finalize first, then run pipeline again

### Test Scope
- Type checking only (syntax & TypeScript errors)
- No runtime behavior testing
- Use `bun run test:behavioral` for behavior validation

### Skills Generation
- Part of pipeline Step 5
- Outputs to: `content/published/skills/{claude,gemini,openai}/`

## Prevention: The Schema Pattern Incident

**Dec 17, 2025:** 60 schema patterns were generated directly to `patterns/schema/` instead of following the pipeline, breaking:
- Output structure
- Validation chain
- Rule generation
- Repository integrity

**Prevention:** Three-layer atomic system now makes this impossible.

See `CONTRIBUTING.md` for full incident details.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| README not updating | Run `move-to-published.ts` to finalize patterns first |
| Type check failures | Fix syntax/import errors in .ts files |
| Validation failures | Check console for missing sections/invalid frontmatter |
| Rules not generating | Add `rule.description` to pattern YAML |
| Pre-commit hook blocks | Let pipeline handle generation (don't commit to forbidden dirs) |

## See Also

- `PIPELINE-REVIEW.md` - Code review checklist for pipeline changes
- `CONTRIBUTING.md` - How to contribute patterns
- `ARCHITECTURE.md` - System design and rationale
