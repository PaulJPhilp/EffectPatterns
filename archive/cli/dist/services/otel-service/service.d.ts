import type { Span, AttributeValue, Tracer, Meter } from '@opentelemetry/api';
import { Effect } from 'effect';
import { OtelConfig, SpanOptions, SpanStatus } from './types.js';
declare const OtelService_base: Effect.Service.Class<OtelService, "OtelService", {
    readonly scoped: Effect.Effect<{
        initOtelSDK: (config?: OtelConfig) => Effect.Effect<void, never, never>;
        shutdown: () => Effect.Effect<any, never, never>;
        startSpan: (name: string, options?: SpanOptions) => Effect.Effect<Span, never, never>;
        endSpan: (span: Span, status?: SpanStatus) => Effect.Effect<void, never, never>;
        addEvent: (span: Span, name: string, attributes?: Record<string, AttributeValue>) => Effect.Effect<void, never, never>;
        recordException: (span: Span, exception: Error, attributes?: Record<string, AttributeValue>) => Effect.Effect<void, never, never>;
        recordCounter: (name: string, value: number, attributes?: Record<string, AttributeValue>) => Effect.Effect<void, never, never>;
        recordHistogram: (name: string, value: number, attributes?: Record<string, AttributeValue>) => Effect.Effect<void, never, never>;
        recordGauge: (name: string, value: number, attributes?: Record<string, AttributeValue>) => Effect.Effect<void, never, never>;
        traceSpan: <A>(name: string, fn: () => Promise<A>, options?: SpanOptions) => Effect.Effect<A, never, never>;
        traceSpanSync: <A>(name: string, fn: () => A, options?: SpanOptions) => Effect.Effect<A, never, never>;
        getTracer: () => Tracer;
        getMeter: () => Meter;
        getLogger: () => typeof console;
    }, never, never>;
}>;
export declare class OtelService extends OtelService_base {
}
export {};
//# sourceMappingURL=service.d.ts.map