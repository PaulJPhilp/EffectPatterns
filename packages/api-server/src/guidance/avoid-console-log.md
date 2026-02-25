# Pattern Guidance: Avoid console.log (Observability)

**Goal: Structured, correlated, and control-flow aware logging.**

## Use when
- Never in production code.
- Only for temporary local debugging that will be deleted before commit.

## Avoid when
- Logging errors (use `Effect.logError` or `Effect.fail`).
- Logging usage metrics / traces (use `Effect.log` or spans).
- Logging sensitive data (use Redacted types).

## Decision rule
- `console.log` → Unstructured text, invisible to Effect runtime context (spans, fiber IDs).
- `Effect.log` → Structured event, automatically enriched with Fiber ID, Log Level, and Spans.

## Simplifier
Logs are part of your production UI. Don't use `console.log`.

## Implementation prompt
"Implement the Fix Plan for this finding: Replace `console.log` with `Effect.log` (or `logInfo`, `logDebug`, `logError`). Ensure the message is clear and context is passed as structured data if needed."
