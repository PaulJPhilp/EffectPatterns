/**
 * OpenTelemetry SDK Initialization
 *
 * Initializes the NodeSDK with OTLP HTTP trace exporter.
 * Safe for stdio transport (exports via HTTP, not stdout).
 *
 * Call initOtel() before constructing Effect layers.
 * Call sdk.shutdown() on graceful exit.
 */

import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

export interface OtelConfig {
  readonly serviceName: string;
  readonly serviceVersion: string;
  readonly otlpEndpoint: string;
  readonly otlpHeaders: Record<string, string>;
  readonly enabled: boolean;
}

function loadOtelConfig(): OtelConfig {
  const enabled = process.env.OTEL_ENABLED !== "false";
  const serviceName =
    process.env.SERVICE_NAME || "effect-patterns-mcp-transport";
  const serviceVersion = process.env.SERVICE_VERSION || "0.7.7";
  const otlpEndpoint =
    process.env.OTLP_ENDPOINT || "http://localhost:4318/v1/traces";

  const otlpHeaders: Record<string, string> = {};
  const headersRaw = process.env.OTLP_HEADERS || "";
  if (headersRaw.trim()) {
    for (const pair of headersRaw.split(",")) {
      const [key, value] = pair.split("=").map((s) => s.trim());
      if (key && value) {
        otlpHeaders[key] = value;
      }
    }
  }

  return { serviceName, serviceVersion, otlpEndpoint, otlpHeaders, enabled };
}

/**
 * Initialize OpenTelemetry NodeSDK with OTLP HTTP exporter.
 *
 * Returns the SDK instance for graceful shutdown.
 * If OTEL_ENABLED=false, returns null (no-op).
 */
export function initOtel(): NodeSDK | null {
  const config = loadOtelConfig();

  if (!config.enabled) {
    console.error("[OTEL] Tracing disabled (OTEL_ENABLED=false)");
    return null;
  }

  const exporter = new OTLPTraceExporter({
    url: config.otlpEndpoint,
    headers: config.otlpHeaders,
  });

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_VERSION]: config.serviceVersion,
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter: exporter,
  });

  sdk.start();

  console.error(
    `[OTEL] Tracing enabled: ${config.serviceName} -> ${config.otlpEndpoint}`
  );

  return sdk;
}
