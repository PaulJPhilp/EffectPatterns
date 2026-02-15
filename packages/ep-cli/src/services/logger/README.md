# Logger Service

`ep-cli` uses the shared logger from `@effect-patterns/ep-shared-services`.

## Source of Truth

- Runtime implementation: `packages/ep-shared-services/src/logger`
- `ep-cli` import surface: `packages/ep-cli/src/services/logger/index.ts`

The local `index.ts` file intentionally re-exports the shared logger API to keep
existing `ep-cli` imports stable.
