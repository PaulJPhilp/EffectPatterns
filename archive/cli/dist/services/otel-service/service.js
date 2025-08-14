import { metrics, trace, context } from '@opentelemetry/api';
import { Effect, Console } from 'effect';
export class OtelService extends Effect.Service()("OtelService", {
    scoped: Effect.gen(function* () {
        let isInitialized = false;
        // Track the service name to avoid hard-coded branding and allow overrides
        let currentServiceName = process.env.OTEL_SERVICE_NAME || "effect-ai-cli";
        const initOtelSDK = (config = {}) => Effect.gen(function* () {
            const serviceName = config.serviceName || currentServiceName;
            const endpoint = config.endpoint || "http://localhost:4317";
            yield* Console.info(`[OTEL] Initializing OpenTelemetry for ${serviceName} at ${endpoint}`);
            currentServiceName = serviceName;
            isInitialized = true;
        });
        const shutdown = () => Effect.gen(function* () {
            if (isInitialized) {
                yield* Console.info("[OTEL] Shutting down OpenTelemetry");
                isInitialized = false;
            }
            return undefined;
        });
        const getTracer = () => trace.getTracer(currentServiceName);
        const getMeter = () => metrics.getMeter(currentServiceName);
        const getLogger = () => console; // Use console as logger
        const startSpan = (name, options) => Effect.sync(() => {
            const tracer = trace.getTracer(currentServiceName);
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
            const meter = metrics.getMeter(currentServiceName);
            const counter = meter.createCounter(name);
            counter.add(value, attributes);
        });
        const recordHistogram = (name, value, attributes) => Effect.sync(() => {
            const meter = metrics.getMeter(currentServiceName);
            const histogram = meter.createHistogram(name);
            histogram.record(value, attributes);
        });
        const recordGauge = (name, value, attributes) => Effect.sync(() => {
            const meter = metrics.getMeter(currentServiceName);
            const gauge = meter.createGauge(name);
            gauge.record(value, attributes);
        });
        const traceSpan = (name, fn, options) => Effect.promise(() => {
            const tracer = trace.getTracer(currentServiceName);
            return context.with(trace.setSpan(context.active(), tracer.startSpan(name, options)), fn);
        });
        const traceSpanSync = (name, fn, options) => Effect.sync(() => {
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
}) {
}
//# sourceMappingURL=service.js.map