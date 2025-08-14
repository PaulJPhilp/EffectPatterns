import {
  SpanStatusCode,
  SpanKind,
  type AttributeValue,
  type Link
} from "@opentelemetry/api";

// Enhanced configuration types
export interface OtelConfig {
  readonly serviceName?: string;
  readonly serviceVersion?: string;
  readonly endpoint?: string;
  readonly enableConsole?: boolean;
  readonly enableTracing?: boolean;
  readonly enableMetrics?: boolean;
  readonly enableLogs?: boolean;
  readonly resourceAttributes?: Record<string, AttributeValue>;
  readonly samplingRatio?: number;
  readonly batchSize?: number;
  readonly exportIntervalMillis?: number;
}

export interface SpanOptions {
  readonly attributes?: Record<string, AttributeValue>;
  readonly kind?: SpanKind;
  readonly links?: Array<Link>;
}

export interface SpanStatus {
  readonly code: SpanStatusCode;
  readonly message?: string;
}