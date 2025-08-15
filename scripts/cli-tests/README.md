# CLI Test Suite

This folder contains tiered, runnable scripts that exercise the
`effect-ai` CLI end-to-end using real commands (no mocks).

## Usage

- Default: run safe, non-network tiers
  ```bash
  bash scripts/cli-tests/00-basics.sh
  bash scripts/cli-tests/01-auth.sh
  bash scripts/cli-tests/04-metrics.sh
  bash scripts/cli-tests/05-trace-run.sh
  bash scripts/cli-tests/06-system-prompt.sh
  bash scripts/cli-tests/99-error-handling.sh
  ```

- Run everything (including network/provider calls):
  ```bash
  RUN_NETWORK=1 bash scripts/cli-tests/02-health.sh
  RUN_NETWORK=1 bash scripts/cli-tests/03-generate.sh
  ```

- Or run all tiers at once:
  ```bash
  bash scripts/cli-tests/run-all.sh
  # add RUN_NETWORK=1 to include health/generate
  ```

## Environment

- Ensure `.env` has provider keys if you run network tiers:
  - `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`
- Optional: populate the CLI auth store so `auth list/show` reflect providers:
  ```bash
  npx effect-ai auth set openai "$OPENAI_API_KEY"
  npx effect-ai auth set anthropic "$ANTHROPIC_API_KEY"
  npx effect-ai auth set google "$GOOGLE_API_KEY"
  ```

## Flags

- `RUN_NETWORK=1` — enable network/provider calls (health, generate)
- `RUN_ALL_PROVIDERS=1` — include anthropic and google alongside openai

## Notes

- Metrics JSON file is written to `metrics.json` in repo root when using
  the metrics report script.
- The error-handling script triggers intentional invalid invocations to
  validate graceful CLI errors.
