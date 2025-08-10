import { Effect } from "effect";
import type { Tracer, Meter, AttributeValue } from "@opentelemetry/api";
import { SpanOptions, Span, SpanStatus } from "effect/Tracer";
import { OtelConfig } from "./types.js";

// Enhanced OTel Service API
export interface OtelServiceApi {
	readonly initOtelSDK: (config?: OtelConfig) => Effect.Effect<void>;
	readonly shutdown: () => Effect.Effect<void>;
	readonly startSpan: (name: string, options?: SpanOptions) => Effect.Effect<Span>;
	readonly endSpan: (span: Span, status?: SpanStatus) => Effect.Effect<void>;
	readonly addEvent: (span: Span, name: string, attributes?: Record<string, AttributeValue>) => Effect.Effect<void>;
	readonly recordException: (span: Span, exception: Error, attributes?: Record<string, AttributeValue>) => Effect.Effect<void>;
	readonly recordCounter: (name: string, value: number, attributes?: Record<string, AttributeValue>) => Effect.Effect<void>;
	readonly recordHistogram: (name: string, value: number, attributes?: Record<string, AttributeValue>) => Effect.Effect<void>;
	readonly recordGauge: (name: string, value: number, attributes?: Record<string, AttributeValue>) => Effect.Effect<void>;
	readonly trace: <A>(name: string, fn: () => Promise<A>, options?: SpanOptions) => Effect.Effect<A>;
	readonly traceSync: <A>(name: string, fn: () => A, options?: SpanOptions) => Effect.Effect<A>;
	readonly getTracer: () => Effect.Effect<Tracer>;
	readonly getMeter: () => Effect.Effect<Meter>;
	readonly getLogger: () => Effect.Effect<globalThis.Console>;
}