# Pattern Guidance: Configuration Handling

**Goal: Typed, validated, and environmentally-aware configuration.**

## Use when
- Reading environment variables (API keys, URLs, ports).
- Defining app settings that change between dev/prod.

## Avoid when
- Using `process.env.MY_VAR` directly in code.
- Hardcoding sensitive strings or magic numbers.

## Decision rule
All external inputs are `Config`. `Config` values are typed and validated on startup.
- `process.env` = Stringly typed chaos.
- `Effect.Config` = Typed reliability.

## Simplifier
Don't guess what the environment holds. Ask `Effect.Config`.

## Implementation prompt
"Implement the Fix Plan for this finding: Replace direct `process.env` access with `Effect.config` (e.g., `Config.string(...)`). Load the config via `yield*` or `Effect.config`."
