import { SpanStatusCode, SpanKind } from "@opentelemetry/api";
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
