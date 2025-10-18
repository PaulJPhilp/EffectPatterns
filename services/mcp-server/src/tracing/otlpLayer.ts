/**
 * OTLP Tracing Layer - Effect-based OpenTelemetry Integration
 *
 * Implements a proper Effect Layer for OpenTelemetry tracing with
 * OTLP HTTP exporter. Uses acquire/release pattern for resource
 * management and provides Effect-based tracing helpers.
 *
 * This is a thin Effect wrapper around the OpenTelemetry Node SDK,
 * as a direct Effect-to-OTLP binding may not be available.
 */

import { Effect, Layer, Context } from "effect";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import * as api from "@opentelemetry/api";

/**
 * Tracing configuration from environment variables
 */
export interface TracingConfig {
  readonly otlpEndpoint: string;
  readonly otlpHeaders: Record<string, string>;
  readonly serviceName: string;
  readonly serviceVersion: string;
}

/**
 * Tracing service tag for Effect Context
 */
export class TracingService extends Context.Tag("TracingService")<
  TracingService,
  {
    readonly getTraceId: () => string | undefined;
    readonly startSpan: <A, E, R>(
      name: string,
      attributes?: Record<string, string | number | boolean>
    ) => (effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
    readonly withSpan: <A, E, R>(
      name: string,
      fn: () => Effect.Effect<A, E, R>,
      attributes?: Record<string, string | number | boolean>
    ) => Effect.Effect<A, E, R>;
  }
>() {}

/**
 * Parse OTLP headers from environment variable
 * Format: "key1=value1,key2=value2"
 */
function parseOtlpHeaders(headersString: string): Record<string, string> {
  if (!headersString || !headersString.trim()) {
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
 * Load tracing configuration from environment
 */
const loadTracingConfig = Effect.sync((): TracingConfig => {
  const otlpEndpoint =
    process.env.OTLP_ENDPOINT || "http://localhost:4318/v1/traces";
  const otlpHeadersRaw = process.env.OTLP_HEADERS || "";
  const serviceName =
    process.env.SERVICE_NAME || "effect-patterns-mcp-server";
  const serviceVersion = process.env.SERVICE_VERSION || "0.1.0";

  return {
    otlpEndpoint,
    otlpHeaders: parseOtlpHeaders(otlpHeadersRaw),
    serviceName,
    serviceVersion,
  };
});

/**
 * Initialize OpenTelemetry SDK
 *
 * This is the "acquire" phase - sets up OTLP exporter and SDK
 */
const initializeTracing = (config: TracingConfig): Effect.Effect<NodeSDK> =>
  Effect.sync(() => {
    // Create OTLP HTTP exporter
    const traceExporter = new OTLPTraceExporter({
      url: config.otlpEndpoint,
      headers: config.otlpHeaders,
    });

    // Create resource with service metadata
    const resource = Resource.default().merge(
      new Resource({
        [ATTR_SERVICE_NAME]: config.serviceName,
        [ATTR_SERVICE_VERSION]: config.serviceVersion,
      })
    );

    // Initialize SDK
    const sdk = new NodeSDK({
      resource,
      traceExporter,
    });

    sdk.start();

    console.log(
      `[Tracing] OTLP initialized: ${config.serviceName} -> ${config.otlpEndpoint}`
    );

    return sdk;
  });

/**
 * Shutdown OpenTelemetry SDK
 *
 * This is the "release" phase - ensures graceful shutdown
 */
const shutdownTracing = (sdk: NodeSDK): Effect.Effect<void> =>
  Effect.promise(() =>
    sdk.shutdown().then(() => {
      console.log("[Tracing] OTLP SDK shutdown complete");
    })
  );

/**
 * Get current trace ID from active span context
 */
const getTraceId = (): string | undefined => {
  const span = api.trace.getActiveSpan();
  if (!span) return undefined;

  const spanContext = span.spanContext();
  return spanContext.traceId;
};

/**
 * Start a span and run an effect within it
 *
 * @param name - Span name
 * @param attributes - Span attributes
 */
const startSpan =
  <A, E, R>(
    name: string,
    attributes?: Record<string, string | number | boolean>
  ) =>
  (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.gen(function* () {
      const tracer = api.trace.getTracer("effect-patterns-mcp");

      return yield* Effect.promise(() =>
        tracer.startActiveSpan(name, (span) => {
          // Set attributes if provided
          if (attributes) {
            Object.entries(attributes).forEach(([key, value]) => {
              span.setAttribute(key, value);
            });
          }

          // Run the effect and capture result/error
          return Effect.runPromise(effect)
            .then((result) => {
              span.setStatus({ code: api.SpanStatusCode.OK });
              span.end();
              return result;
            })
            .catch((error) => {
              span.setStatus({
                code: api.SpanStatusCode.ERROR,
                message: String(error),
              });
              span.recordException(error as Error);
              span.end();
              throw error;
            });
        })
      );
    });

/**
 * Convenience wrapper for withSpan
 */
const withSpan = <A, E, R>(
  name: string,
  fn: () => Effect.Effect<A, E, R>,
  attributes?: Record<string, string | number | boolean>
): Effect.Effect<A, E, R> => startSpan(name, attributes)(fn());

/**
 * Create the tracing service implementation
 */
const makeTracingService = Effect.succeed({
  getTraceId,
  startSpan,
  withSpan,
});

/**
 * Tracing Layer - Manages OTLP SDK lifecycle
 *
 * This layer uses Effect.acquireRelease to ensure proper
 * initialization and cleanup of the OpenTelemetry SDK.
 */
export const TracingLayer = Layer.scoped(
  TracingService,
  Effect.gen(function* () {
    const config = yield* loadTracingConfig;

    // Acquire: Initialize SDK
    const sdk = yield* Effect.acquireRelease(
      initializeTracing(config),
      shutdownTracing
    );

    // Return tracing service
    return yield* makeTracingService;
  })
);

/**
 * Live Tracing Layer - Ready to use in production
 */
export const TracingLayerLive = TracingLayer;
