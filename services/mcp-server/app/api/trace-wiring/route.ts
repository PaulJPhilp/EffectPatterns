/**
 * Trace Wiring Examples Endpoint
 *
 * GET /api/trace-wiring
 * Returns example code for integrating trace IDs across platforms
 */

import { Effect } from 'effect';
import { type NextRequest, NextResponse } from 'next/server';
import {
  isAuthenticationError,
  validateApiKey,
} from '../../../src/auth/apiKey';
import { runWithRuntime } from '../../../src/server/init';
import { TracingService } from '../../../src/tracing/otlpLayer';

const EFFECT_NODE_SDK_EXAMPLE = `
// Effect + OpenTelemetry Node SDK Example
import { Effect } from "effect";
import * as api from "@opentelemetry/api";

const getTraceId = (): string | undefined => {
  const span = api.trace.getActiveSpan();
  return span?.spanContext().traceId;
};

const myEffect = Effect.gen(function* () {
  const traceId = getTraceId();
  console.log("Trace ID:", traceId);

  // Your Effect logic here
  return { traceId };
});
`.trim();

const EFFECT_WITH_SPAN_EXAMPLE = `
// Effect withSpan Helper Example
import { Effect } from "effect";
import { TracingService } from "./tracing/otlpLayer.js";

const myOperation = Effect.gen(function* () {
  const tracing = yield* TracingService;

  // Wrap Effect in a span
  const result = yield* tracing.withSpan(
    "my-operation",
    () => Effect.succeed("result"),
    { userId: "123", operation: "fetch" }
  );

  const traceId = tracing.getTraceId();
  return { result, traceId };
});
`.trim();

const LANGGRAPH_PYTHON_EXAMPLE = `
# LangGraph + OpenTelemetry Python Example
from opentelemetry import trace
from langgraph.graph import Graph

tracer = trace.get_tracer(__name__)

def my_node(state):
    # Get current trace context
    span = trace.get_current_span()
    trace_id = format(span.get_span_context().trace_id, '032x')

    # Call external API with trace ID
    response = requests.post(
        "https://api.example.com/generate",
        headers={"x-trace-id": trace_id},
        json=state
    )

    return {"trace_id": trace_id, "result": response.json()}

# Build graph
graph = Graph()
graph.add_node("process", my_node)
`.trim();

const NOTES = `
Trace Wiring Best Practices:

1. **Propagate Trace IDs**: Always pass trace IDs in headers
   (x-trace-id) when calling external services.

2. **Link Spans**: Use OpenTelemetry's span linking to connect
   distributed traces across services.

3. **Consistent Format**: Use W3C Trace Context format for
   trace IDs (32-character hex string).

4. **Log Correlation**: Include trace IDs in structured logs
   for easy correlation with traces.

5. **Error Handling**: Ensure trace IDs are captured even
   when errors occur.
`.trim();

export async function GET(request: NextRequest) {
  const traceWiringEffect = Effect.gen(function* () {
    const tracing = yield* TracingService;

    // Validate API key
    yield* validateApiKey(request);

    const traceId = tracing.getTraceId();

    return {
      effectNodeSdk: EFFECT_NODE_SDK_EXAMPLE,
      effectWithSpan: EFFECT_WITH_SPAN_EXAMPLE,
      langgraphPython: LANGGRAPH_PYTHON_EXAMPLE,
      notes: NOTES,
      traceId,
    };
  });

  try {
    const result = await runWithRuntime(traceWiringEffect);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'x-trace-id': result.traceId || '',
      },
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: String(error),
      },
      { status: 500 },
    );
  }
}
