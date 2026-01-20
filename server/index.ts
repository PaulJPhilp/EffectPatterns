/**
 * Pattern Server - Production-Ready HTTP API Server
 *
 * A robust, production-ready Effect-based HTTP server that serves the Effect Patterns API.
 * Built using @effect/platform for HTTP handling and Effect's dependency injection.
 *
 * Production Features:
 * - Comprehensive error handling with proper HTTP status codes
 * - Structured logging with request tracing
 * - Input validation using Effect Schema
 * - Health checks and metrics
 * - Graceful shutdown handling
 * - Security headers and CORS
 * - Request/response logging
 */

import {
  FileSystem,
  HttpRouter,
  HttpServer,
  HttpServerResponse,
} from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer, Schema } from "effect";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

// Import services from their respective modules
import { HttpServerService } from "./services/http-server/service.js";
import { MetricsService } from "./services/metrics/service.js";
import { RateLimiterService } from "./services/rate-limiter/service.js";

// Import modular components
import {
  API_HEALTH,
  API_METRICS,
  API_RULES_BY_ID,
  API_RULES_LIST,
  CACHE_CONTROL_NO_CACHE,
  CACHE_CONTROL_PUBLIC,
  DEFAULT_HOST,
  DEFAULT_LOG_LEVEL,
  DEFAULT_PORT,
  ERROR_HEALTH_CHECK_FAILED,
  ERROR_RATE_LIMIT_EXCEEDED,
  HTTP_STATUS_OK,
  HTTP_STATUS_TOO_MANY_REQUESTS,
  SERVER_NAME,
  SERVER_VERSION,
} from "./constants.js";
import { readAndParseRules, readRuleById } from "./database.js";
import { ApiError } from "./errors.js";
import { RuleSchema, ServerConfigSchema } from "./schema.js";
import { ServerConfig } from "./types.js";
import {
  addSecurityHeaders,
  createApiResponse,
  createErrorResponse,
  generateRequestId,
} from "./utils.js";

// --- CONFIGURATION ---

const parsePort = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    return undefined;
  }
  if (parsed < 0 || parsed > 65535) {
    return undefined;
  }
  return parsed;
};

const resolveNodeEnv = (value: string | undefined): ServerConfig["nodeEnv"] => {
  if (value === "production" || value === "staging") {
    return value;
  }
  return "development";
};

const envPort = parsePort(process.env.PORT);

const DEFAULT_CONFIG: ServerConfig = {
  port: envPort !== undefined ? envPort : DEFAULT_PORT,
  host: DEFAULT_HOST,
  nodeEnv: resolveNodeEnv(process.env.NODE_ENV),
  logLevel:
    (process.env.LOG_LEVEL as ServerConfig["logLevel"]) || DEFAULT_LOG_LEVEL,
};

// --- ROUTE HANDLERS ---

/**
 * Enhanced health check endpoint handler
 */
export const healthHandler = Effect.gen(function* () {
  const requestId = generateRequestId();
  const startTime = Date.now();

  const metrics = yield* MetricsService;
  metrics.incrementRequestCount();
  metrics.updateHealthCheck();

  yield* Effect.logInfo("Health check requested", { requestId });

  // Check rate limit
  const rateLimiter = yield* RateLimiterService;
  const clientIP = "127.0.0.1"; // In production, extract from request headers
  const rateLimitResult = yield* rateLimiter.checkRateLimit(clientIP);

  if (!rateLimitResult.allowed) {
    const duration = Date.now() - startTime;
    metrics.incrementRateLimitHits();

    yield* Effect.logWarning("Rate limit exceeded for health check", {
      requestId,
      clientIP,
      duration: `${duration}ms`,
    });

    const apiError = ApiError.make(
      ERROR_RATE_LIMIT_EXCEEDED,
      HTTP_STATUS_TOO_MANY_REQUESTS,
      "RATE_LIMIT_EXCEEDED",
      { resetTime: rateLimitResult.resetTime },
    );
    const response = createErrorResponse(apiError, requestId);
    const httpResponse = yield* HttpServerResponse.json(response, {
      status: apiError.statusCode,
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        "X-RateLimit-Reset": rateLimitResult.resetTime?.toString() || "",
        "Retry-After": Math.ceil(
          (rateLimitResult.resetTime! - Date.now()) / 1000,
        ).toString(),
      },
    });

    return addSecurityHeaders(httpResponse);
  }

  // Perform comprehensive health checks
  const healthResult = yield* Effect.either(
    Effect.gen(function* () {
      // Check file system access
      const fs = yield* FileSystem.FileSystem;
      const rulesExist = yield* fs.exists("rules/rules.json");

      // Check memory usage
      const memUsage = process.memoryUsage();
      const memoryHealthy = memUsage.heapUsed < memUsage.heapTotal * 0.9;

      // Check uptime
      const uptime = process.uptime();

      // Check if we can read rules
      const rulesCheck = yield* Effect.either(readAndParseRules);
      const rulesHealthy = rulesCheck._tag === "Right";

      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: `${uptime.toFixed(2)}s`,
        memory: {
          used: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          total: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
          healthy: memoryHealthy,
        },
        filesystem: {
          rulesFileExists: rulesExist,
        },
        services: {
          rules: rulesHealthy,
        },
        version: SERVER_VERSION,
      };
    }),
  );

  if (healthResult._tag === "Left") {
    const error = healthResult.left;
    const duration = Date.now() - startTime;
    metrics.incrementErrorCount();

    yield* Effect.logError("Health check failed", {
      error,
      requestId,
      duration: `${duration}ms`,
    });

    const apiError = ApiError.internalServerError(ERROR_HEALTH_CHECK_FAILED);
    const response = createErrorResponse(apiError, requestId);
    const httpResponse = yield* HttpServerResponse.json(response, {
      status: apiError.statusCode,
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
    });

    return addSecurityHeaders(httpResponse);
  }

  const health = healthResult.right;
  const duration = Date.now() - startTime;

  yield* Effect.logInfo("Health check completed successfully", {
    requestId,
    duration: `${duration}ms`,
    status: health.status,
  });

  const response = createApiResponse(health, requestId);
  const httpResponse = yield* HttpServerResponse.json(response, {
    status: HTTP_STATUS_OK,
    headers: {
      "Cache-Control": CACHE_CONTROL_NO_CACHE,
      "X-Request-ID": requestId,
      "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
    },
  });

  return addSecurityHeaders(httpResponse);
});

/**
 * Metrics endpoint handler
 */
export const metricsHandler = Effect.gen(function* () {
  const requestId = generateRequestId();
  const startTime = Date.now();

  yield* Effect.logInfo("Metrics endpoint requested", { requestId });

  const metrics = yield* MetricsService;
  const serverMetrics = metrics.getMetrics();

  // Get rate limiter stats
  const rateLimiter = yield* RateLimiterService;
  // Note: In a real implementation, you'd track rate limiter metrics

  const response = createApiResponse(
    {
      server: {
        uptime: serverMetrics.uptime,
        startTime: new Date(serverMetrics.startTime).toISOString(),
        version: SERVER_VERSION,
        environment: DEFAULT_CONFIG.nodeEnv,
      },
      requests: {
        total: serverMetrics.requestCount,
        errors: serverMetrics.errorCount,
        rateLimitHits: serverMetrics.rateLimitHits,
      },
      health: {
        lastHealthCheck: new Date(serverMetrics.lastHealthCheck).toISOString(),
        healthCheckAge: serverMetrics.healthCheckAge,
      },
    },
    requestId,
  );

  const httpResponse = yield* HttpServerResponse.json(response, {
    status: HTTP_STATUS_OK,
    headers: {
      "Cache-Control": CACHE_CONTROL_NO_CACHE,
      "X-Request-ID": requestId,
      "Content-Type": "application/json",
    },
  });

  const duration = Date.now() - startTime;
  yield* Effect.logInfo("Metrics endpoint completed", {
    requestId,
    duration: `${duration}ms`,
    statusCode: HTTP_STATUS_OK,
  });

  return addSecurityHeaders(httpResponse);
});

/**
 * Rules endpoint handler
 */
export const rulesHandler = Effect.gen(function* () {
  const requestId = generateRequestId();
  const startTime = Date.now();

  const metrics = yield* MetricsService;
  metrics.incrementRequestCount();

  yield* Effect.logInfo("Rules endpoint requested", { requestId });

  // Check rate limit
  const rateLimiter = yield* RateLimiterService;
  const clientIP = "127.0.0.1"; // In production, extract from request headers
  const rateLimitResult = yield* rateLimiter.checkRateLimit(clientIP);

  if (!rateLimitResult.allowed) {
    const duration = Date.now() - startTime;
    metrics.incrementRateLimitHits();

    yield* Effect.logWarning("Rate limit exceeded", {
      requestId,
      clientIP,
      duration: `${duration}ms`,
    });

    const apiError = ApiError.make(
      ERROR_RATE_LIMIT_EXCEEDED,
      HTTP_STATUS_TOO_MANY_REQUESTS,
      "RATE_LIMIT_EXCEEDED",
      { resetTime: rateLimitResult.resetTime },
    );
    const response = createErrorResponse(apiError, requestId);
    const httpResponse = yield* HttpServerResponse.json(response, {
      status: apiError.statusCode,
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        "X-RateLimit-Reset": rateLimitResult.resetTime?.toString() || "",
        "Retry-After": Math.ceil(
          (rateLimitResult.resetTime! - Date.now()) / 1000,
        ).toString(),
      },
    });

    return addSecurityHeaders(httpResponse);
  }

  // Try to read, parse and validate rules
  const rulesResult = yield* Effect.either(
    Effect.gen(function* () {
      const rules = yield* readAndParseRules;
      const validated = yield* Schema.decodeUnknown(Schema.Array(RuleSchema))(
        rules,
      );
      return validated;
    }),
  );

  // Handle success or failure
  if (rulesResult._tag === "Left") {
    const error = rulesResult.left;
    const duration = Date.now() - startTime;
    metrics.incrementErrorCount();

    yield* Effect.logError("Failed to load and validate rules", {
      error,
      requestId,
      duration: `${duration}ms`,
    });

    const apiError =
      error._tag === "RulesDirectoryNotFoundError"
        ? ApiError.serviceUnavailable("Rules directory not found")
        : ApiError.internalServerError("Failed to load rules");

    const response = createErrorResponse(apiError, requestId);
    const httpResponse = yield* HttpServerResponse.json(response, {
      status: apiError.statusCode,
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
    });

    return addSecurityHeaders(httpResponse);
  }

  const validated = rulesResult.right;
  const duration = Date.now() - startTime;

  yield* Effect.logInfo(`Returning ${validated.length} validated rules`, {
    requestId,
    duration: `${duration}ms`,
  });

  const response = createApiResponse(validated, requestId);
  const httpResponse = yield* HttpServerResponse.json(response, {
    status: HTTP_STATUS_OK,
    headers: {
      "Cache-Control": CACHE_CONTROL_PUBLIC,
      "X-Request-ID": requestId,
      "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
    },
  });

  return addSecurityHeaders(httpResponse);
});

/**
 * Single rule endpoint handler
 */
export const singleRuleHandler = (id: string) =>
  Effect.gen(function* () {
    const requestId = generateRequestId();
    const startTime = Date.now();

    const metrics = yield* MetricsService;
    metrics.incrementRequestCount();

    yield* Effect.logInfo(`Single rule endpoint requested for ID: ${id}`, {
      requestId,
    });

    // Check rate limit
    const rateLimiter = yield* RateLimiterService;
    const clientIP = "127.0.0.1"; // In production, extract from request headers
    const rateLimitResult = yield* rateLimiter.checkRateLimit(clientIP);

    if (!rateLimitResult.allowed) {
      const duration = Date.now() - startTime;
      metrics.incrementRateLimitHits();

      yield* Effect.logWarning("Rate limit exceeded", {
        requestId,
        clientIP,
        duration: `${duration}ms`,
      });

      const apiError = ApiError.make(
        ERROR_RATE_LIMIT_EXCEEDED,
        HTTP_STATUS_TOO_MANY_REQUESTS,
        "RATE_LIMIT_EXCEEDED",
        { resetTime: rateLimitResult.resetTime },
      );
      const response = createErrorResponse(apiError, requestId);
      const httpResponse = yield* HttpServerResponse.json(response, {
        status: apiError.statusCode,
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": rateLimitResult.resetTime?.toString() || "",
          "Retry-After": Math.ceil(
            (rateLimitResult.resetTime! - Date.now()) / 1000,
          ).toString(),
        },
      });

      return addSecurityHeaders(httpResponse);
    }

    // Validate input
    if (!id || id.trim().length === 0) {
      const duration = Date.now() - startTime;
      metrics.incrementErrorCount();

      const apiError = ApiError.badRequest("Rule ID is required");

      yield* Effect.logWarning("Invalid rule ID provided", {
        requestId,
        duration: `${duration}ms`,
        ruleId: id,
      });

      const response = createErrorResponse(apiError, requestId);
      const httpResponse = yield* HttpServerResponse.json(response, {
        status: apiError.statusCode,
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      });

      return addSecurityHeaders(httpResponse);
    }

    // Try to read, parse and validate the rule
    const ruleResult = yield* Effect.either(
      Effect.gen(function* () {
        const rule = yield* readRuleById(id);
        const validated = yield* Schema.decodeUnknown(RuleSchema)(rule);
        return validated;
      }),
    );

    // Handle success or failure
    if (ruleResult._tag === "Left") {
      const error = ruleResult.left;
      const duration = Date.now() - startTime;
      metrics.incrementErrorCount();

      yield* Effect.logError("Failed to load and validate rule", {
        error,
        requestId,
        duration: `${duration}ms`,
      });

      const apiError =
        error._tag === "RuleNotFoundError"
          ? ApiError.notFound(`Rule with ID '${id}' not found`)
          : ApiError.internalServerError("Failed to load rule");

      const response = createErrorResponse(apiError, requestId);
      const httpResponse = yield* HttpServerResponse.json(response, {
        status: apiError.statusCode,
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      });

      return addSecurityHeaders(httpResponse);
    }

    const validated = ruleResult.right;
    const duration = Date.now() - startTime;

    yield* Effect.logInfo(`Returning rule: ${id}`, {
      requestId,
      duration: `${duration}ms`,
    });

    const response = createApiResponse(validated, requestId);
    const httpResponse = yield* HttpServerResponse.json(response, {
      status: HTTP_STATUS_OK,
      headers: {
        "Cache-Control": CACHE_CONTROL_PUBLIC,
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
    });

    return addSecurityHeaders(httpResponse);
  });

// --- ROUTER ---

/**
 * HTTP Router with all application routes
 */
const router = HttpRouter.empty.pipe(
  HttpRouter.get(API_HEALTH, healthHandler),
  HttpRouter.get(API_METRICS, metricsHandler),
  HttpRouter.get(API_RULES_LIST, rulesHandler),
  HttpRouter.get(
    API_RULES_BY_ID,
    Effect.gen(function* () {
      const params = yield* HttpRouter.params;
      const id = params.id;
      if (!id) {
        const requestId = generateRequestId();
        const apiError = ApiError.badRequest("Rule ID is required");
        const response = createErrorResponse(apiError, requestId);
        return yield* HttpServerResponse.json(response, {
          status: apiError.statusCode,
          headers: { "X-Request-ID": requestId },
        });
      }
      return yield* singleRuleHandler(id);
    }),
  ),
);

// --- HTTP SERVER LAYER ---

/**
 * Create the HTTP server layer using Node's built-in HTTP server
 */
const ServerLive = NodeHttpServer.layer(() => createServer(), {
  port: DEFAULT_CONFIG.port,
});

/**
 * Main HTTP application layer
 */
const HttpLive = HttpServer.serve(router).pipe(Layer.provide(ServerLive));

// --- MAIN PROGRAM ---

/**
 * Main server program
 * - Logs startup message
 * - Launches the HTTP server
 * - Handles graceful shutdown
 */
const program = Effect.gen(function* () {
  yield* Effect.logInfo(
    `🚀 ${SERVER_NAME} starting on http://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}`,
  );
  yield* Effect.logInfo(
    `📍 Health check: http://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}${API_HEALTH}`,
  );
  yield* Effect.logInfo(`🌍 Environment: ${DEFAULT_CONFIG.nodeEnv}`);
  yield* Effect.logInfo(`📊 Log level: ${DEFAULT_CONFIG.logLevel}`);

  yield* Effect.scoped(
    Effect.gen(function* () {
      yield* Layer.launch(HttpLive);
      yield* Effect.logInfo("✨ Server is ready to accept requests");
      yield* Effect.never;
    }),
  );
}).pipe(
  Effect.provide(RateLimiterService.Default),
  Effect.provide(MetricsService.Default),
  Effect.provide(HttpServerService.Default),
);

// --- RUNTIME EXECUTION ---

/**
 * Run the server using NodeRuntime.runMain
 * This handles graceful shutdown on SIGINT/SIGTERM
 */
const isMainModule = (() => {
  const meta = import.meta as { main?: boolean };
  if (typeof meta.main === "boolean") {
    return meta.main;
  }

  const entrypoint = process.argv[1];
  if (!entrypoint) {
    return false;
  }

  try {
    return (
      import.meta.url === pathToFileURL(entrypoint).href ||
      import.meta.url.endsWith(entrypoint)
    );
  } catch {
    return false;
  }
})();

if (isMainModule) {
  NodeRuntime.runMain(program);
}

export { DEFAULT_CONFIG, program, ServerConfigSchema };
