# Release Notes - v0.7.0

**Release Date:** December 5, 2025

## 🎉 Major Features

### OpenTelemetry Integration for MCP Server

The MCP server now includes production-ready OpenTelemetry tracing with automatic span creation. All API handlers use `Effect.fn` for automatic instrumentation without manual span wrapping.

**Key Improvements:**

- Automatic span creation via `Effect.fn` for all API endpoints
- Span metadata annotations with `Effect.annotateCurrentSpan()`
- Full OpenTelemetry integration with OTLP HTTP exporter
- Proper trace propagation and context management
- Stack trace location details captured automatically

**Endpoints Instrumented:**

- `GET /api/patterns/search` - span: "search-patterns"
- `GET /api/patterns/{id}` - span: "get-pattern"
- `POST /api/generate` - span: "generate-snippet"
- `GET /api/health` - span: "health-check"
- `GET /api/trace-wiring` - span: "trace-wiring"

## 🐛 Bug Fixes

- **#123**: Fixed observability-effect-fn pattern documentation - code example now correctly uses `Effect.fn` without manual span wrapping
- Fixed API response handling in MCP server tests - updated to use wrapped response format
- Corrected tracing implementation to leverage Effect's built-in observability capabilities

## 📚 Documentation

- Updated `observability-effect-fn` pattern with correct, production-ready code examples
- Added modern best practices for using `Effect.fn` with OpenTelemetry
- Regenerated AI tool rules (Claude, Cursor, Windsurf, etc.) reflecting pattern updates

## 🔧 Technical Changes

- Added `@effect/opentelemetry` package (v0.59.2) for proper OpenTelemetry integration
- Refactored all MCP server handlers to use `Effect.fn` for automatic span creation
- Simplified tracing layer by removing unnecessary manual span wrapping
- Updated OpenTelemetry layer initialization to use `NodeSdk.layer()`

## Pattern Updates

### observability-effect-fn

**Before (Incorrect):**

```typescript
const handler = Effect.fn("operation")(fn).pipe(
  Effect.withSpan("operation", { ... }) // Manual wrapping - didn't work
)
```

**After (Correct):**

```typescript
const handler = Effect.fn("operation")(function* () {
  yield* Effect.annotateCurrentSpan({
    /* metadata */
  });
  // Spans created automatically - no manual wrapping needed
});
```

## 🎯 What This Means

- **Better Observability**: All API calls are now automatically traced with proper OpenTelemetry integration
- **Production Ready**: Distributed tracing works correctly and can be exported to OTLP endpoints
- **Better Examples**: Users now see correct patterns for instrumenting their own code
- **Consistency**: Documentation matches implementation - we practice what we preach

## Upgrade Guide

No breaking changes. Update to v0.7.0 to get:

- Automatic OpenTelemetry tracing on all API endpoints
- Correct pattern examples for observability
- Better debugging with proper trace context

## Testing

All tests pass with the new implementation:

- ✅ 33 MCP server tests passing
- ✅ TypeScript compilation successful
- ✅ Next.js build successful
- ✅ All pattern rules regenerated (276 files across all AI tools)

## Known Issues

None at this time.

## Links

- [GitHub Release](https://github.com/PaulJPhilp/Effect-Patterns/releases/tag/v0.7.0)
- [Effect Documentation](https://effect.website/)
- [OpenTelemetry Documentation](https://opentelemetry.io/)

---

**Contributors:** Claude Code, Paul Philp
