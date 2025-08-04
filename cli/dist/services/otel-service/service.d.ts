import type { Span, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { Effect } from 'effect';
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
declare const OtelService_base: Effect.Service.Class<OtelService, "OtelService", {
    readonly scoped: Effect.Effect<{
        initOtelSDK: (config?: OtelConfig) => Effect.Effect<void, never, never>;
        shutdown: () => Effect.Effect<any, never, never>;
        startSpan: (name: string, options?: SpanOptions) => Effect.Effect<Span, never, never>;
        endSpan: (span: Span, status?: SpanStatus) => Effect.Effect<void, never, never>;
        addEvent: (span: Span, name: string, attributes?: Record<string, any>) => Effect.Effect<void, never, never>;
        recordException: (span: Span, exception: Error, attributes?: Record<string, any>) => Effect.Effect<void, never, never>;
        recordCounter: (name: string, value: number, attributes?: Record<string, any>) => Effect.Effect<void, never, never>;
        recordHistogram: (name: string, value: number, attributes?: Record<string, any>) => Effect.Effect<void, never, never>;
        recordGauge: (name: string, value: number, attributes?: Record<string, any>) => Effect.Effect<void, never, never>;
        traceSpan: <A>(name: string, fn: () => Promise<A>, options?: SpanOptions) => Effect.Effect<A, never, never>;
        traceSpanSync: <A>(name: string, fn: () => A, options?: SpanOptions) => Effect.Effect<A, never, never>;
        getTracer: () => import("@opentelemetry/api").Tracer;
        getMeter: () => import("@opentelemetry/api").Meter;
        getLogger: () => Console;
    }, never, never>;
}>;
export declare class OtelService extends OtelService_base {
}
export {};
