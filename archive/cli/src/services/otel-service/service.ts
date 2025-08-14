import type { Span, SpanStatusCode, SpanKind, AttributeValue, Tracer, Meter } from '@opentelemetry/api';
import { metrics, trace, context } from '@opentelemetry/api';
import { Effect, Console } from 'effect';
import { OtelConfig, SpanOptions, SpanStatus } from './types.js';

export class OtelService extends Effect.Service<OtelService>()("OtelService", {
  scoped: Effect.gen(function* () {
    let isInitialized = false;
    // Track the service name to avoid hard-coded branding and allow overrides
    let currentServiceName = process.env.OTEL_SERVICE_NAME || "effect-ai-cli";

    const initOtelSDK = (config: OtelConfig = {}) =>
      Effect.gen(function* () {
        const serviceName = config.serviceName || currentServiceName;
        const endpoint = config.endpoint || "http://localhost:4317";
        
        yield* Console.info(`[OTEL] Initializing OpenTelemetry for ${serviceName} at ${endpoint}`);
        currentServiceName = serviceName;
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

    const getTracer = (): Tracer => trace.getTracer(currentServiceName);
    const getMeter = (): Meter => metrics.getMeter(currentServiceName);
    const getLogger = (): typeof console => console; // Use console as logger

    const startSpan = (name: string, options?: SpanOptions) =>
      Effect.sync(() => {
        const tracer = trace.getTracer(currentServiceName);
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

    const addEvent = (span: Span, name: string, attributes?: Record<string, AttributeValue>) =>
      Effect.sync(() => {
        span.addEvent(name, attributes);
      });

    const recordException = (span: Span, exception: Error, attributes?: Record<string, AttributeValue>) =>
      Effect.sync(() => {
        span.recordException(exception);
        if (attributes) {
          span.setAttributes(attributes);
        }
      });

    const recordCounter = (name: string, value: number, attributes?: Record<string, AttributeValue>) =>
      Effect.sync(() => {
        const meter = metrics.getMeter(currentServiceName);
        const counter = meter.createCounter(name);
        counter.add(value, attributes);
      });

    const recordHistogram = (name: string, value: number, attributes?: Record<string, AttributeValue>) =>
      Effect.sync(() => {
        const meter = metrics.getMeter(currentServiceName);
        const histogram = meter.createHistogram(name);
        histogram.record(value, attributes);
      });

    const recordGauge = (name: string, value: number, attributes?: Record<string, AttributeValue>) =>
      Effect.sync(() => {
        const meter = metrics.getMeter(currentServiceName);
        const gauge = meter.createGauge(name);
        gauge.record(value, attributes);
      });

    const traceSpan = <A>(name: string, fn: () => Promise<A>, options?: SpanOptions) =>
      Effect.promise(() => {
        const tracer = trace.getTracer(currentServiceName);
        return context.with(trace.setSpan(context.active(), tracer.startSpan(name, options)), fn);
      });

    const traceSpanSync = <A>(name: string, fn: () => A, options?: SpanOptions) =>
      Effect.sync(() => {
        const tracer = trace.getTracer(currentServiceName);
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
