# OpenTelemetry Patterns

## Integrate Effect Tracing with OpenTelemetry

Integrate Effect.withSpan with OpenTelemetry to export traces and visualize request flows across services.

### Example

```typescript
import { Effect } from "effect";
// Pseudocode: Replace with actual OpenTelemetry integration for your stack
import { trace, context, SpanStatusCode } from "@opentelemetry/api";

// Wrap an Effect.withSpan to export to OpenTelemetry
function withOtelSpan<T>(name: string, effect: Effect.Effect<unknown, T, unknown>) {
  return Effect.gen(function* () {
    const otelSpan = trace.getTracer("default").startSpan(name);
    try {
      const result = yield* effect;
      otelSpan.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      otelSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      throw err;
    } finally {
      otelSpan.end();
    }
  });
}

// Usage
const program = withOtelSpan("fetchUser", Effect.sync(() => {
  // ...fetch user logic
  return { id: 1, name: "Alice" };
}));
```

**Explanation:**  
- Start an OpenTelemetry span when entering an Effectful operation.
- Set status and attributes as needed.
- End the span when the operation completes or fails.
- This enables full distributed tracing and visualization in your observability platform.

---

