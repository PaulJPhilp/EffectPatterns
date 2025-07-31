import type { Span, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { metrics, trace, context } from '@opentelemetry/api';
import { Effect, Console } from 'effect';

// Enhanced OTel Service API
export interface OtelServiceApi {
  readonly initOtelSDK: (config?: OtelConfig) => Effect.Effect<void>;
  readonly shutdown: () => Effect.Effect<void>;
  readonly startSpan: (name: string, options?: SpanOptions) => Effect.Effect<Span>;
  readonly endSpan: (span: Span, status?: SpanStatus) => Effect.Effect<void>;
  readonly addEvent: (span: Span, name: string, attributes?: Record<string, any>) => Effect.Effect<void>;
  readonly recordException: (span: Span, exception: Error, attributes?: Record<string, any>) => Effect.Effect<void>;
  readonly recordCounter: (name: string, value: number, attributes?: Record<string, any>) => Effect.Effect<void>;
  readonly recordHistogram: (name: string, value: number, attributes?: Record<string, any>) => Effect.Effect<void>;
  readonly recordGauge: (name: string, value: number, attributes?: Record<string, any>) => Effect.Effect<void>;
  readonly trace: <A>(name: string, fn: () => Promise<A>, options?: SpanOptions) => Effect.Effect<A>;
  readonly traceSync: <A>(name: string, fn: () => A, options?: SpanOptions) => Effect.Effect<A>;
  readonly getTracer: () => Effect.Effect<any>;
  readonly getMeter: () => Effect.Effect<any>;
  readonly getLogger: () => Effect.Effect<any>;
}

// Enhanced configuration types
export interface OtelConfig {
  readonly serviceName?: string;
  readonly serviceVersion?: string;
  readonly endpoint?: string;
  readonly enableConsole?: boolean;
  readonly enableTracing?: boolean;
  readonly enableMetrics?: boolean;
  readonly enableLogs?: boolean;
  readonly resourceAttributes?: Record<string, any>;
  readonly samplingRatio?: number;
  readonly batchSize?: number;
  readonly exportIntervalMillis?: number;
}

export interface SpanOptions {
  readonly attributes?: Record<string, any>;
  readonly kind?: SpanKind;
  readonly links?: Array<any>;
}

export interface SpanStatus {
  readonly code: SpanStatusCode;
  readonly message?: string;
}

export class OtelService extends Effect.Service<OtelService>()("OtelService", {
  scoped: Effect.gen(function* () {
    let isInitialized = false;

    const initOtelSDK = (config: OtelConfig = {}) =>
      Effect.gen(function* () {
        const serviceName = config.serviceName || "effect-patterns-cli";
        const endpoint = config.endpoint || "http://localhost:4317";
        
        yield* Console.info(`[OTEL] Initializing OpenTelemetry for ${serviceName} at ${endpoint}`);
        isInitialized = true;
      });

    const shutdown = () =>
      Effect.gen(function* () {
        if (isInitialized) {
          yield* Console.info("[OTEL] Shutting down OpenTelemetry");
          isInitialized = false;
        }
        return undefined;
      });

    const getTracer = () => trace.getTracer('effect-patterns-cli');
    const getMeter = () => metrics.getMeter('effect-patterns-cli');
    const getLogger = () => console; // Use console as logger

    const startSpan = (name: string, options?: SpanOptions) =>
      Effect.sync(() => {
        const tracer = trace.getTracer('effect-patterns-cli');
        return tracer.startSpan(name, {
          attributes: options?.attributes,
          kind: options?.kind,
          links: options?.links,
        });
      });

    const endSpan = (span: Span, status?: SpanStatus) =>
      Effect.gen(function* () {
        if (status) {
          span.setStatus({ code: status.code, message: status.message });
        }
        span.end();
      });

    const addEvent = (span: Span, name: string, attributes?: Record<string, any>) =>
      Effect.sync(() => {
        span.addEvent(name, attributes);
      });

    const recordException = (span: Span, exception: Error, attributes?: Record<string, any>) =>
      Effect.sync(() => {
        span.recordException(exception);
        if (attributes) {
          span.setAttributes(attributes);
        }
      });

    const recordCounter = (name: string, value: number, attributes?: Record<string, any>) =>
      Effect.sync(() => {
        const meter = metrics.getMeter('effect-patterns-cli');
        const counter = meter.createCounter(name);
        counter.add(value, attributes);
      });

    const recordHistogram = (name: string, value: number, attributes?: Record<string, any>) =>
      Effect.sync(() => {
        const meter = metrics.getMeter('effect-patterns-cli');
        const histogram = meter.createHistogram(name);
        histogram.record(value, attributes);
      });

    const recordGauge = (name: string, value: number, attributes?: Record<string, any>) =>
      Effect.sync(() => {
        const meter = metrics.getMeter('effect-patterns-cli');
        const gauge = meter.createGauge(name);
        gauge.record(value, attributes);
      });

    const traceSpan = <A>(name: string, fn: () => Promise<A>, options?: SpanOptions) =>
      Effect.promise(() => {
        const tracer = trace.getTracer('effect-patterns-cli');
        return context.with(trace.setSpan(context.active(), tracer.startSpan(name, options)), fn);
      });

    const traceSpanSync = <A>(name: string, fn: () => A, options?: SpanOptions) =>
      Effect.sync(() => {
        const tracer = trace.getTracer('effect-patterns-cli');
        return context.with(trace.setSpan(context.active(), tracer.startSpan(name, options)), fn);
      });

    return {
      initOtelSDK,
      shutdown,
      startSpan,
      endSpan,
      addEvent,
      recordException,
      recordCounter,
      recordHistogram,
      recordGauge,
      traceSpan,
      traceSpanSync,
      getTracer,
      getMeter,
      getLogger,
    };
  })
}) { }
