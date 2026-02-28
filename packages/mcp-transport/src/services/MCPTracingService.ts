/**
 * MCP Tracing Service - Effect-based OpenTelemetry Integration
 *
 * Adapted from api-server/src/tracing/otlpLayer.ts.
 * Provides trace context access via Effect.Service pattern.
 * Spans are created automatically via Effect.fn.
 */

import * as api from "@opentelemetry/api";
import { Effect } from "effect";

/**
 * Parse OTLP headers from environment variable
 * Format: "key1=value1,key2=value2"
 */
function parseOtlpHeaders(headersString: string): Record<string, string> {
  if (!headersString?.trim()) {
    return {};
  }

  const headers: Record<string, string> = {};
  const pairs = headersString.split(",");

  for (const pair of pairs) {
    const [key, value] = pair.split("=").map((s) => s.trim());
    if (key && value) {
      headers[key] = value;
    }
  }

  return headers;
}

/**
 * Get current trace ID from OpenTelemetry context
 */
const getTraceId = (): string | undefined => {
  const span = api.trace.getActiveSpan();
  if (!span) return undefined;
  return span.spanContext().traceId;
};

/**
 * Tracing service for accessing trace context.
 *
 * With @effect/opentelemetry, spans are created automatically
 * via Effect.fn. This service provides utilities for accessing
 * trace context when needed.
 */
export class MCPTracingService extends Effect.Service<MCPTracingService>()(
  "MCPTracingService",
  {
    effect: Effect.gen(function* () {
      const otlpEndpoint =
        process.env.OTLP_ENDPOINT || "http://localhost:4318/v1/traces";
      const serviceName =
        process.env.SERVICE_NAME || "effect-patterns-mcp-transport";
      const serviceVersion = process.env.SERVICE_VERSION || "0.7.7";

      yield* Effect.logInfo(
        `[Tracing] OTLP initialized: ${serviceName} -> ${otlpEndpoint}`
      );

      return {
        getTraceId: (): string | undefined => getTraceId(),
        config: {
          otlpEndpoint,
          otlpHeaders: parseOtlpHeaders(process.env.OTLP_HEADERS || ""),
          serviceName,
          serviceVersion,
        },
      };
    }),
  }
) {}

export const MCPTracingLayerLive = MCPTracingService.Default;
