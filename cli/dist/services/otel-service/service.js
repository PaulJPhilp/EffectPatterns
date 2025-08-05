import { metrics, trace, context } from '@opentelemetry/api';
import { Effect, Console } from 'effect';
export class OtelService extends Effect.Service()("OtelService", {
    scoped: Effect.gen(function* () {
        let isInitialized = false;
        const initOtelSDK = (config = {}) => Effect.gen(function* () {
            const serviceName = config.serviceName || "effect-patterns-cli";
            const endpoint = config.endpoint || "http://localhost:4317";
            yield* Console.info(`[OTEL] Initializing OpenTelemetry for ${serviceName} at ${endpoint}`);
            isInitialized = true;
        });
        const shutdown = () => Effect.gen(function* () {
            if (isInitialized) {
                yield* Console.info("[OTEL] Shutting down OpenTelemetry");
                isInitialized = false;
            }
            return undefined;
        });
        const getTracer = () => trace.getTracer('effect-patterns-cli');
        const getMeter = () => metrics.getMeter('effect-patterns-cli');
        const getLogger = () => console; // Use console as logger
        const startSpan = (name, options) => Effect.sync(() => {
            const tracer = trace.getTracer('effect-patterns-cli');
            return tracer.startSpan(name, {
                attributes: options?.attributes,
                kind: options?.kind,
                links: options?.links,
            });
        });
        const endSpan = (span, status) => Effect.gen(function* () {
            if (status) {
                span.setStatus({ code: status.code, message: status.message });
            }
            span.end();
        });
        const addEvent = (span, name, attributes) => Effect.sync(() => {
            span.addEvent(name, attributes);
        });
        const recordException = (span, exception, attributes) => Effect.sync(() => {
            span.recordException(exception);
            if (attributes) {
                span.setAttributes(attributes);
            }
        });
        const recordCounter = (name, value, attributes) => Effect.sync(() => {
            const meter = metrics.getMeter('effect-patterns-cli');
            const counter = meter.createCounter(name);
            counter.add(value, attributes);
        });
        const recordHistogram = (name, value, attributes) => Effect.sync(() => {
            const meter = metrics.getMeter('effect-patterns-cli');
            const histogram = meter.createHistogram(name);
            histogram.record(value, attributes);
        });
        const recordGauge = (name, value, attributes) => Effect.sync(() => {
            const meter = metrics.getMeter('effect-patterns-cli');
            const gauge = meter.createGauge(name);
            gauge.record(value, attributes);
        });
        const traceSpan = (name, fn, options) => Effect.promise(() => {
            const tracer = trace.getTracer('effect-patterns-cli');
            return context.with(trace.setSpan(context.active(), tracer.startSpan(name, options)), fn);
        });
        const traceSpanSync = (name, fn, options) => Effect.sync(() => {
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
}) {
}
