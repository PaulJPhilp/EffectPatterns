/**
 * Shared API Fetch Logic
 *
 * Extracted from mcp-stdio.ts and mcp-streamable-http.ts.
 * Both entry points share near-identical callApi implementations;
 * this module deduplicates that logic.
 */

import { BoundedCache } from "../utils/cache.js";
import type { ApiResult } from "../tools/tool-types.js";

/**
 * Configuration for API calls
 */
export interface ApiCallConfig {
  readonly apiBaseUrl: string;
  readonly apiKey: string | undefined;
  readonly requestTimeoutMs: number;
  readonly extraHeaders?: Record<string, string>;
  /** Node.js HTTP/HTTPS agent for connection pooling (non-standard fetch option) */
  readonly httpAgent?: unknown;
  readonly httpsAgent?: unknown;
  readonly logFn: (message: string, data?: unknown) => void;
}

/**
 * Shared state for request deduplication and caching
 */
export interface ApiCallState {
  readonly patternsCache: BoundedCache<ApiResult<unknown>>;
  readonly inFlightRequests: Map<
    string,
    { promise: Promise<ApiResult<unknown>>; createdAt: number }
  >;
  readonly patternsSearchCacheTtlMs: number;
  readonly patternsDetailCacheTtlMs: number;
  readonly dedupTimeoutMs: number;
}

function getRequestKey(
  endpoint: string,
  method: "GET" | "POST",
  data?: unknown,
): string {
  const dataStr = data ? JSON.stringify(data) : "";
  return `${method}:${endpoint}:${dataStr}`;
}

/**
 * Perform an API call with caching, deduplication, timeout, and error classification.
 *
 * This is the shared core extracted from both entry points.
 */
export async function performApiCall(
  config: ApiCallConfig,
  state: ApiCallState,
  endpoint: string,
  method: "GET" | "POST" = "GET",
  data?: unknown,
): Promise<ApiResult<unknown>> {
  const { apiBaseUrl, apiKey, requestTimeoutMs, extraHeaders, logFn } = config;
  const {
    patternsCache,
    inFlightRequests,
    patternsSearchCacheTtlMs,
    patternsDetailCacheTtlMs,
    dedupTimeoutMs,
  } = state;

  const url = `${apiBaseUrl}/api${endpoint}`;
  const requestKey = getRequestKey(endpoint, method, data);
  const isPatternsGet = method === "GET" && endpoint.startsWith("/patterns");
  const isPatternDetail = isPatternsGet && endpoint.startsWith("/patterns/");

  // Extract API host for diagnostics (safe, no secrets)
  let apiHost = "<invalid>";
  try {
    apiHost = new URL(apiBaseUrl).host;
  } catch {
    // URL parsing failed
  }

  // Check pattern cache
  if (isPatternsGet) {
    const cached = patternsCache.get(requestKey);
    if (cached) {
      logFn(`Cache hit (patterns): ${requestKey}`);
      return cached;
    }
  }

  // Check for in-flight request (dedupe)
  const inFlight = inFlightRequests.get(requestKey);
  const now = Date.now();

  if (inFlight && now - inFlight.createdAt < dedupTimeoutMs) {
    logFn(
      `API Dedupe Hit: ${requestKey} (age: ${now - inFlight.createdAt}ms)`
    );
    return inFlight.promise;
  } else if (inFlight) {
    logFn(
      `Dedup timeout expired (age: ${now - inFlight.createdAt}ms), removing stale entry`
    );
    inFlightRequests.delete(requestKey);
  }

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, requestTimeoutMs);

  // Select agent based on protocol
  const isHttps = url.startsWith("https");
  const agentOption = isHttps ? config.httpsAgent : config.httpAgent;

  const options: RequestInit & { agent?: unknown } = {
    method,
    headers,
    signal: controller.signal,
    // Node.js fetch (undici) supports agent option for connection pooling
    ...(agentOption ? { agent: agentOption } : {}),
  };

  if (data && method === "POST") {
    options.body = JSON.stringify(data);
  }

  logFn(`API ${method} ${endpoint}`);

  // Create promise for this request
  const requestPromise = (async (): Promise<ApiResult<unknown>> => {
    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        logFn(`API Error: HTTP ${response.status}`);
        return {
          ok: false,
          error: errorBody || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      const result: unknown = await response.json();
      const unwrapped =
        result && typeof result === "object" && "data" in result
          ? (result as Record<string, unknown>).data
          : result;
      const apiResult: ApiResult<unknown> = { ok: true, data: unwrapped };

      if (isPatternsGet) {
        const ttl = isPatternDetail
          ? patternsDetailCacheTtlMs
          : patternsSearchCacheTtlMs;
        patternsCache.set(requestKey, apiResult, ttl);
      }
      return apiResult;
    } catch (error) {
      clearTimeout(timeoutId);

      const errorName = error instanceof Error ? error.name : "Unknown";
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const cause =
        error instanceof Error &&
        "cause" in error &&
        error.cause instanceof Error
          ? error.cause.message
          : undefined;

      // Check timeout
      if (errorName === "AbortError") {
        const msg = `Request timeout after ${requestTimeoutMs}ms`;
        logFn(`API Error: ${msg}`);
        return {
          ok: false,
          error: msg,
          details: {
            errorName: "AbortError",
            errorType: "timeout",
            errorMessage: msg,
            retryable: true,
            apiHost,
            hasApiKey: !!apiKey,
          },
        };
      }

      // Classify error type
      let errorType = "network";
      let retryable = true;

      if (errorName === "TypeError" && errorMessage.includes("fetch")) {
        errorType = "fetch_error";
      } else if (cause?.includes("ECONNREFUSED")) {
        errorType = "connection_refused";
      } else if (cause?.includes("ENOTFOUND")) {
        errorType = "dns_error";
      } else if (
        cause?.includes("ETIMEDOUT") ||
        cause?.includes("timeout")
      ) {
        errorType = "timeout";
      } else if (cause?.includes("ECONNRESET")) {
        errorType = "connection_reset";
      } else if (
        cause?.includes("CERT") ||
        cause?.includes("SSL") ||
        cause?.includes("TLS")
      ) {
        errorType = "tls_error";
        retryable = false;
      }

      logFn(`API Error: ${errorName}: ${errorMessage}`, {
        cause,
        errorType,
        retryable,
        apiHost,
        hasApiKey: !!apiKey,
      });

      return {
        ok: false,
        error: errorMessage,
        details: {
          errorName,
          errorType,
          errorMessage,
          cause,
          retryable,
          apiHost,
          hasApiKey: !!apiKey,
        },
      };
    } finally {
      inFlightRequests.delete(requestKey);
    }
  })();

  // Store in-flight request (GET only, to avoid side-effects)
  if (method === "GET") {
    if (inFlightRequests.size >= 500) {
      const oldestKey = inFlightRequests.keys().next().value;
      if (oldestKey) {
        logFn(`In-flight limit reached (500), removing oldest: ${oldestKey}`);
        inFlightRequests.delete(oldestKey);
      }
    }

    inFlightRequests.set(requestKey, {
      promise: requestPromise,
      createdAt: Date.now(),
    });

    // Periodic cleanup of stale in-flight entries
    if (inFlightRequests.size % 100 === 0) {
      const cleanupNow = Date.now();
      for (const [key, value] of inFlightRequests) {
        if (cleanupNow - value.createdAt > dedupTimeoutMs * 10) {
          inFlightRequests.delete(key);
        }
      }
    }
  }

  return requestPromise;
}
