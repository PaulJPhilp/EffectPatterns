/**
 * MCP API Service - Effect-based API client
 *
 * Wraps performApiCall in an Effect.Service with OTEL tracing.
 * Each callApi invocation creates an OTEL span automatically.
 */

import { BoundedCache } from "@/utils/cache.js";
import type { ApiResult } from "@/tools/tool-types.js";
import { Effect, Layer } from "effect";
import {
  type ApiCallConfig,
  type ApiCallState,
  performApiCall,
} from "./api-fetch.js";

/**
 * Configuration for creating an MCPApiService layer
 */
export interface MCPApiConfig {
  readonly apiBaseUrl: string;
  readonly apiKey: string | undefined;
  readonly requestTimeoutMs: number;
  readonly extraHeaders?: Record<string, string>;
  readonly httpAgent?: unknown;
  readonly httpsAgent?: unknown;
  readonly patternsCacheMaxEntries?: number;
  readonly patternsSearchCacheTtlMs?: number;
  readonly patternsDetailCacheTtlMs?: number;
  readonly dedupTimeoutMs?: number;
}

export class MCPApiService extends Effect.Service<MCPApiService>()(
  "MCPApiService",
  {
    // Default implementation — overridden by makeMCPApiLayer
    effect: Effect.succeed({
      callApi: (
        _endpoint: string,
        _method: "GET" | "POST" = "GET",
        _data?: unknown,
      ): Effect.Effect<ApiResult<unknown>> =>
        Effect.succeed({
          ok: false as const,
          error: "MCPApiService not configured — use makeMCPApiLayer",
        }),
    }),
  }
) {}

/**
 * Create an MCPApiService layer with the given configuration.
 *
 * Internally creates BoundedCache and in-flight map,
 * then exposes callApi with OTEL span annotations.
 */
export function makeMCPApiLayer(
  apiConfig: MCPApiConfig
): Layer.Layer<MCPApiService> {
  return Layer.effect(
    MCPApiService,
    Effect.gen(function* () {
      const debug = process.env.MCP_DEBUG === "true";
      const logFn = (message: string, data?: unknown) => {
        if (debug) {
          console.error(
            `[MCP] ${message}`,
            data ? JSON.stringify(data, null, 2) : ""
          );
        }
      };

      const config: ApiCallConfig = {
        apiBaseUrl: apiConfig.apiBaseUrl,
        apiKey: apiConfig.apiKey,
        requestTimeoutMs: apiConfig.requestTimeoutMs,
        extraHeaders: apiConfig.extraHeaders,
        httpAgent: apiConfig.httpAgent,
        httpsAgent: apiConfig.httpsAgent,
        logFn,
      };

      const state: ApiCallState = {
        patternsCache: new BoundedCache<ApiResult<unknown>>(
          apiConfig.patternsCacheMaxEntries ?? 100
        ),
        inFlightRequests: new Map(),
        patternsSearchCacheTtlMs: apiConfig.patternsSearchCacheTtlMs ?? 5_000,
        patternsDetailCacheTtlMs: apiConfig.patternsDetailCacheTtlMs ?? 2_000,
        dedupTimeoutMs: apiConfig.dedupTimeoutMs ?? 500,
      };

      return {
        callApi: (
          endpoint: string,
          method: "GET" | "POST" = "GET",
          data?: unknown,
        ): Effect.Effect<ApiResult<unknown>> =>
          Effect.gen(function* () {
            yield* Effect.annotateCurrentSpan({
              "mcp.api.endpoint": endpoint,
              "mcp.api.method": method,
            });

            const result = yield* Effect.tryPromise({
              try: () =>
                performApiCall(config, state, endpoint, method, data),
              catch: (error) =>
                new Error(
                  `API call failed: ${error instanceof Error ? error.message : String(error)}`
                ),
            }).pipe(Effect.orDie);

            if (!result.ok) {
              yield* Effect.annotateCurrentSpan({
                "mcp.api.error": result.error,
                ...(result.status
                  ? { "mcp.api.status": result.status }
                  : {}),
              });
            }

            return result;
          }).pipe(Effect.withSpan("mcp.callApi")),
      } as MCPApiService;
    })
  );
}
