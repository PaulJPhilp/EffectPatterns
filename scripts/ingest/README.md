# Ingest Pipeline

This folder contains scripts that turn a complete pattern article
(MDX with embedded TypeScript examples) into validated, high-quality
content ready for QA and publishing.

The pipeline extracts example code into `src/`, replaces embedded code
with `<Example />` tags, enforces project rules, re-embeds verified code
for publication, and finally runs LLM QA.

After ingestion, the content will be QA'd and ready for publishing.

## Goals

- Ensure examples compile, run, and follow all project rules.
- Keep MDX and `src/` in strict sync (no drift).
- Produce MDX with embedded code for review and QA.
- Provide clear, actionable error reports at each gate.

## Directory Layout

- `content/new/` — New patterns (MDX starts with embedded code blocks)
- `content/new/src/` — Extracted TypeScript examples
- `content/raw/` — MDX with `<Example path="./src/..." />` tags
- `content/published/` — MDX with code re-embedded (for review + QA)
- `content/qa/results/` — LLM QA outputs (JSON per pattern)

## End-to-End Flow

```mermaid
flowchart TD
  A[content/new/\nMDX with embedded code] --> B

  subgraph EXTRACT
    B[process_patterns.ts\n- Extract TS to content/new/src/*.ts\n- Replace code with <Example path>\n- Emit MDX to content/raw/]
  end

  B --> C

  subgraph BUILD_RUN
    C[check-examples.ts\n- Typecheck\n- Execute main examples\n- Fail fast on errors]
    C -->|pass| D
    C -->|fail| CX[Fix code in\ncontent/new/src/*]
  end

  subgraph RULES_QA
    D[rules.ts on raw+src\n- Direct named imports\n- Effect.Service pattern\n- DI via Effect.gen + .Default\n- No adaptor _ param\n- No provider switch\n- Scoped resources\n- Data.TaggedError for services\n- ≤ 80-char lines]
    D -->|pass| E
    D -->|fail| DX[Fix rule issues\nin src/ or MDX]
  end

  subgraph PUBLISH
    E[publish-patterns.ts\n- Re-embed code into MDX\n- Emit content/published/]
  end

  E --> F

  subgraph CONSISTENCY
    F[pattern-validator.ts\n- Published MDX code blocks\n  match content/new/src/*.ts]
    F -->|pass| G
    F -->|fail| FX[Fix mismatch\n(src vs MDX)]
  end

  subgraph LLM_QA
    G[qa-process.sh\n- Input: content/published/\n- Output: content/qa/results/*.json\n- CLI generate --output-format json]
    G --> H{Passed?}
    H -->|yes| I[Summaries\nqa-report.ts / qa-status.ts]
    H -->|no| J[Optionally repair\nqa-repair.ts then re-run\nValidate + Rules + QA]
  end
```

## Scripts

- `scripts/publish/process_patterns.ts`
  - Input: `--input content/new`  
    Output: `--output content/raw`  
    Source: `--source content/new/src`
  - Extracts TypeScript blocks to `src/` and replaces blocks with
    `<Example path="./src/<name>.ts" />`.

- `scripts/publish/publish-patterns.ts`
  - Input: `--input content/raw`  
    Output: `--output content/published`  
    Source: `--source content/new/src`
  - Re-embeds code from `src/` back into MDX.

- `scripts/publish/pattern-validator.ts`
  - Validates that “Good Example” blocks in `content/published/`
    exactly match their `src/` files.

- `scripts/publish/validate_and_generate.ts`
  - Combines validation and README generation.

- `scripts/publish/rules.ts`
  - Enforces our conventions on examples and referenced code:
    - Use direct named imports for Effect/platform libraries.
    - Prefer `Effect.Service` over legacy tags or classes.
    - Access dependencies in `effect: Effect.gen(function* () {})`.
    - Use `.Default` for provisioning; avoid service self-provide hacks.
    - Do not use adaptor `_` param in `Effect.gen`.
    - Avoid provider-specific layer switches; compose via helpers.
    - Use scoped resource patterns appropriately.
    - Use `Data.TaggedError` for service errors.
    - Respect 80-char line width in examples.

- `scripts/qa/qa-process.sh`
  - Runs LLM-based QA on `content/published/` and writes structured
    JSON results to `content/qa/results/`.

## Typical Commands

```bash
# 1) Extract to raw
npx tsx scripts/publish/process_patterns.ts \
  --input content/new \
  --output content/raw \
  --source content/new/src

# 2) Rules QA
npx tsx scripts/publish/rules.ts \
  --input content/raw \
  --source content/new/src

# 4) Publish (re-embed code)
npx tsx scripts/publish/publish-patterns.ts \
  --input content/raw \
  --output content/published \
  --source content/new/src

# 5) Consistency validation
npx tsx scripts/publish/pattern-validator.ts \
  --input content/published \
  --source content/new/src

# 6) LLM QA on published MDX
./scripts/qa/qa-process.sh --debug
./scripts/qa/qa-process.sh
```

## Testing and Services

- Tests should use real services for integration (no mocks).
- Do not modify the production runtime without explicit approval.
- When platform services are needed, use appropriate layers in tests.

## Failure Modes and Actions

- Extraction fails: fix MDX code fences or naming; re-run.
- Compile/run fails: fix TypeScript or example main; re-run.
- Rules fail: address violations (imports, services, patterns);
  re-run `rules.ts`.
- Consistency fails: ensure `src/` matches published MDX; re-run.
- LLM QA fails: review `content/qa/results/*.json`, apply fixes,
  optionally run repair tooling, then re-run validation + QA.

## Notes

- Keep `content/new/` as the source of truth for new content.
- `content/published/` is the canonical input for review and QA.
- Each stage is idempotent and can be re-run independently.
