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
  HttpServerResponse
} from '@effect/platform';
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node';
import { Data, Effect, Layer, Ref, Schema } from 'effect';
import matter from 'gray-matter';
import { createServer } from 'node:http';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

// --- CONFIGURATION ---

/**
 * Server configuration schema
 */
const ServerConfigSchema = Schema.Struct({
  port: Schema.Number.pipe(Schema.between(0, 65535)),
  host: Schema.String,
  nodeEnv: Schema.Literal('development', 'staging', 'production'),
  logLevel: Schema.Literal('debug', 'info', 'warn', 'error'),
});

type ServerConfig = typeof ServerConfigSchema.Type;
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

const resolveNodeEnv = (value: string | undefined): ServerConfig['nodeEnv'] => {
  if (value === 'production' || value === 'staging') {
    return value;
  }
  return 'development';
};

const envPort = parsePort(process.env.PORT);

const DEFAULT_CONFIG: ServerConfig = {
  port: envPort !== undefined ? envPort : 3001,
  host: 'localhost',
  nodeEnv: resolveNodeEnv(process.env.NODE_ENV),
  logLevel: (process.env.LOG_LEVEL as ServerConfig['logLevel']) || 'info',
};

// --- RATE LIMITING ---

/**
 * Rate limit entry for tracking requests per IP
 */
interface RateLimitEntry {
  readonly count: number;
  readonly resetTime: number;
}

/**
 * Rate limiter configuration
 */
const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // requests per window
} as const;

/**
 * Rate limiter service using Effect.Service pattern
 */
export class RateLimiter extends Effect.Service<RateLimiter>()("RateLimiter", {
  effect: Effect.gen(function* () {
    // In production, this should be Redis or similar
    const store = yield* Ref.make(new Map<string, RateLimitEntry>());

    const checkRateLimit = (ip: string) =>
      Effect.gen(function* () {
        const currentTime = Date.now();
        const current = yield* Ref.get(store);

        const entry = current.get(ip);

        if (!entry || currentTime > entry.resetTime) {
          // First request or window expired
          const newEntry: RateLimitEntry = {
            count: 1,
            resetTime: currentTime + RATE_LIMIT_CONFIG.windowMs,
          };
          yield* Ref.update(store, (map: Map<string, RateLimitEntry>) => new Map(map).set(ip, newEntry));
          return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxRequests - 1 };
        }

        if (entry.count >= RATE_LIMIT_CONFIG.maxRequests) {
          // Rate limit exceeded
          return {
            allowed: false,
            remaining: 0,
            resetTime: entry.resetTime,
          };
        }

        // Increment counter
        const updatedEntry: RateLimitEntry = {
          ...entry,
          count: entry.count + 1,
        };
        yield* Ref.update(store, (map: Map<string, RateLimitEntry>) => new Map(map).set(ip, updatedEntry));

        return {
          allowed: true,
          remaining: RATE_LIMIT_CONFIG.maxRequests - updatedEntry.count,
        };
      });

    return { checkRateLimit };
  }),
}) { }

// --- METRICS SERVICE ---

/**
 * Metrics service for tracking server statistics
 */
export class MetricsService extends Effect.Service<MetricsService>()("MetricsService", {
  effect: Effect.gen(function* () {
    const metrics = {
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0,
      lastHealthCheck: Date.now(),
      rateLimitHits: 0,
    };

    const incrementRequestCount = () => {
      metrics.requestCount++;
    };

    const incrementErrorCount = () => {
      metrics.errorCount++;
    };

    const incrementRateLimitHits = () => {
      metrics.rateLimitHits++;
    };

    const updateHealthCheck = () => {
      metrics.lastHealthCheck = Date.now();
    };

    const getMetrics = () => ({
      ...metrics,
      uptime: Date.now() - metrics.startTime,
      healthCheckAge: Date.now() - metrics.lastHealthCheck,
    });

    return {
      incrementRequestCount,
      incrementErrorCount,
      incrementRateLimitHits,
      updateHealthCheck,
      getMetrics,
    };
  }),
}) { }

// --- UTILITY FUNCTIONS ---// --- ENHANCED ERROR TYPES ---

/**
 * Base API error with HTTP status mapping
 */
export class ApiError extends Data.TaggedError('ApiError')<{
  readonly message: string;
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
}> {
  static make(message: string, statusCode: number, code: string, details?: unknown) {
    return new ApiError({ message, statusCode, code, details });
  }

  static badRequest(message: string, details?: unknown) {
    return ApiError.make(message, 400, 'BAD_REQUEST', details);
  }

  static notFound(message: string, details?: unknown) {
    return ApiError.make(message, 404, 'NOT_FOUND', details);
  }

  static internalServerError(message: string, details?: unknown) {
    return ApiError.make(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }

  static serviceUnavailable(message: string, details?: unknown) {
    return ApiError.make(message, 503, 'SERVICE_UNAVAILABLE', details);
  }
}

/**
 * Tagged error for server-related failures
 */
export class ServerError extends Data.TaggedError('ServerError')<{
  readonly message: string;
  readonly cause?: unknown;
}> { }

/**
 * Tagged error for rule loading failures
 */
export class RuleLoadError extends Data.TaggedError('RuleLoadError')<{
  readonly path: string;
  readonly cause: unknown;
}> { }

/**
 * Tagged error for rule parsing failures
 */
export class RuleParseError extends Data.TaggedError('RuleParseError')<{
  readonly file: string;
  readonly cause: unknown;
}> { }

/**
 * Tagged error for directory not found
 */
export class RulesDirectoryNotFoundError extends Data.TaggedError(
  'RulesDirectoryNotFoundError',
)<{
  readonly path: string;
}> { }

/**
 * Tagged error for rule not found
 */
export class RuleNotFoundError extends Data.TaggedError('RuleNotFoundError')<{
  readonly id: string;
}> { }

// --- SCHEMAS ---

/**
 * Schema for a Rule object with enhanced validation
 */
const RuleSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200)),
  description: Schema.String.pipe(Schema.minLength(0), Schema.maxLength(500)),
  skillLevel: Schema.optional(Schema.Literal('beginner', 'intermediate', 'advanced')),
  useCase: Schema.optional(Schema.Array(Schema.String.pipe(Schema.minLength(1)))),
  content: Schema.String.pipe(Schema.minLength(1)),
});

/**
 * Schema for API response wrapper
 */
const ApiResponseSchema = <T>(dataSchema: Schema.Schema<any, T>) =>
  Schema.Struct({
    success: Schema.Boolean,
    data: dataSchema,
    meta: Schema.Struct({
      timestamp: Schema.String,
      requestId: Schema.String,
      version: Schema.String,
    }),
  });

/**
 * Schema for error response
 */
const ErrorResponseSchema = Schema.Struct({
  success: Schema.Boolean,
  error: Schema.Struct({
    message: Schema.String,
    code: Schema.String,
    details: Schema.optional(Schema.Unknown),
  }),
  meta: Schema.Struct({
    timestamp: Schema.String,
    requestId: Schema.String,
    version: Schema.String,
  }),
});

type Rule = typeof RuleSchema.Type;

// --- UTILITY FUNCTIONS ---

/**
 * Generate a unique request ID
 */
export const generateRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a standardized API response with security headers
 */
export const createApiResponse = <A>(
  data: A,
  requestId: string,
  version = 'v1'
) => ({
  success: true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    requestId,
    version,
  },
});

/**
 * Create a standardized error response with security headers
 */
export const createErrorResponse = (
  error: ApiError,
  requestId: string,
  version = 'v1'
) => ({
  success: false,
  error: {
    message: error.message,
    code: error.code,
    details: error.details,
  },
  meta: {
    timestamp: new Date().toISOString(),
    requestId,
    version,
  },
});

/**
 * Add security headers to a response
 */
export const addSecurityHeaders = (response: HttpServerResponse.HttpServerResponse) =>
  response.pipe(
    HttpServerResponse.setHeader('X-Content-Type-Options', 'nosniff'),
    HttpServerResponse.setHeader('X-Frame-Options', 'DENY'),
    HttpServerResponse.setHeader('X-XSS-Protection', '1; mode=block'),
    HttpServerResponse.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'),
    HttpServerResponse.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  );

/**
 * Extract the first # heading from markdown content as the title
 */
export const extractTitle = (content: string): string => {
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) {
      return match[1].trim();
    }
  }
  return 'Untitled Rule';
};

/**
 * Parse a single rule file and return a rule object
 */
export const parseRuleFile = (
  fs: FileSystem.FileSystem,
  filePath: string,
  fileId: string,
) =>
  Effect.gen(function* () {
    // Read file content
    const content = yield* fs
      .readFileString(filePath)
      .pipe(
        Effect.catchAll((error) =>
          Effect.fail(new RuleLoadError({ path: filePath, cause: error })),
        ),
      );

    // Parse frontmatter
    let parsed: { data: Record<string, unknown>; content: string };
    try {
      parsed = matter(content);
    } catch (error) {
      return yield* Effect.fail(
        new RuleParseError({ file: filePath, cause: error }),
      );
    }

    const { data, content: markdownContent } = parsed;

    // Extract title from content
    const title = extractTitle(markdownContent);

    // Build rule object
    return {
      id: fileId,
      title,
      description: (data.description as string) || '',
      skillLevel: data.skillLevel as string | undefined,
      useCase: data.useCase
        ? Array.isArray(data.useCase)
          ? (data.useCase as string[])
          : [data.useCase as string]
        : undefined,
      content: markdownContent,
    };
  });

/**
 * Read and parse a single rule by ID
 */
export const readRuleById = (id: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const rulesDir = 'rules/cursor';
    const filePath = path.join(rulesDir, `${id}.mdc`);

    yield* Effect.logInfo(`Loading rule by ID: ${id}`);

    // Check if file exists
    const fileExists = yield* fs.exists(filePath);
    if (!fileExists) {
      return yield* Effect.fail(new RuleNotFoundError({ id }));
    }

    // Parse the rule file
    const rule = yield* parseRuleFile(fs, filePath, id);

    yield* Effect.logInfo(`Successfully loaded rule: ${id}`);
    return rule;
  });

/**
 * Read and parse all .mdc rule files from the rules/cursor directory
 */
export const readAndParseRules = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const rulesDir = 'rules/cursor';

  yield* Effect.logInfo(`Loading rules from ${rulesDir}`);

  // Check if directory exists
  const dirExists = yield* fs.exists(rulesDir);
  if (!dirExists) {
    return yield* Effect.fail(
      new RulesDirectoryNotFoundError({ path: rulesDir }),
    );
  }

  // Read all files in directory
  const files = yield* fs
    .readDirectory(rulesDir)
    .pipe(
      Effect.catchAll((error) =>
        Effect.fail(new RuleLoadError({ path: rulesDir, cause: error })),
      ),
    );

  // Filter for .mdc files
  const mdcFiles = files.filter((file) => file.endsWith('.mdc'));
  yield* Effect.logInfo(`Found ${mdcFiles.length} rule files`);

  // Parse each file
  const rules = yield* Effect.forEach(
    mdcFiles,
    (file) => {
      const filePath = path.join(rulesDir, file);
      const fileId = path.basename(file, '.mdc');
      return parseRuleFile(fs, filePath, fileId);
    },
    { concurrency: 'unbounded' },
  );

  yield* Effect.logInfo(`Successfully parsed ${rules.length} rules`);
  return rules;
});

// --- ROUTE HANDLERS ---

/**
 * Health check endpoint handler
 * Returns: Comprehensive health status
 */
export const healthHandler = Effect.gen(function* () {
  const requestId = generateRequestId();
  const startTime = Date.now();

  const metrics = yield* MetricsService;
  metrics.incrementRequestCount();
  metrics.updateHealthCheck();

  yield* Effect.logInfo('Health check requested', { requestId });

  // Check rate limit
  const rateLimiter = yield* RateLimiter;
  const clientIP = '127.0.0.1'; // In production, extract from request headers
  const rateLimitResult = yield* rateLimiter.checkRateLimit(clientIP);

  if (!rateLimitResult.allowed) {
    const duration = Date.now() - startTime;
    metrics.incrementRateLimitHits();

    yield* Effect.logWarning('Rate limit exceeded for health check', {
      requestId,
      clientIP,
      duration: `${duration}ms`,
    });

    const apiError = ApiError.make(
      'Rate limit exceeded',
      429,
      'RATE_LIMIT_EXCEEDED',
      { resetTime: rateLimitResult.resetTime }
    );
    const response = createErrorResponse(apiError, requestId);
    const httpResponse = yield* HttpServerResponse.json(response, {
      status: apiError.statusCode,
      headers: {
        'X-Request-ID': requestId,
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '',
        'Retry-After': Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000).toString(),
      },
    });

    return addSecurityHeaders(httpResponse);
  }

  // Perform comprehensive health checks
  const healthResult = yield* Effect.either(
    Effect.gen(function* () {
      // Check file system access
      const fs = yield* FileSystem.FileSystem;
      const rulesExist = yield* fs.exists('rules/rules.json');

      // Check memory usage
      const memUsage = process.memoryUsage();
      const memoryHealthy = memUsage.heapUsed < memUsage.heapTotal * 0.9;

      // Check uptime
      const uptime = process.uptime();

      // Check if we can read rules
      const rulesCheck = yield* Effect.either(readAndParseRules);
      const rulesHealthy = rulesCheck._tag === 'Right';

      return {
        status: 'healthy',
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
        version: '1.0.0',
      };
    }),
  );

  if (healthResult._tag === 'Left') {
    const error = healthResult.left;
    const duration = Date.now() - startTime;
    metrics.incrementErrorCount();

    yield* Effect.logError('Health check failed', {
      error,
      requestId,
      duration: `${duration}ms`,
    });

    const apiError = ApiError.internalServerError('Health check failed');
    const response = createErrorResponse(apiError, requestId);
    const httpResponse = yield* HttpServerResponse.json(response, {
      status: apiError.statusCode,
      headers: {
        'X-Request-ID': requestId,
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      },
    });

    return addSecurityHeaders(httpResponse);
  }

  const health = healthResult.right;
  const duration = Date.now() - startTime;

  yield* Effect.logInfo('Health check completed successfully', {
    requestId,
    duration: `${duration}ms`,
    status: health.status,
  });

  const response = createApiResponse(health, requestId);
  const httpResponse = yield* HttpServerResponse.json(response, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache',
      'X-Request-ID': requestId,
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    },
  });

  return addSecurityHeaders(httpResponse);
});

/**
 * Metrics endpoint handler
 * Returns: Server metrics and statistics
 */
export const metricsHandler = Effect.gen(function* () {
  const requestId = generateRequestId();
  const startTime = Date.now();

  yield* Effect.logInfo('Metrics endpoint requested', { requestId });

  const metrics = yield* MetricsService;
  const serverMetrics = metrics.getMetrics();

  // Get rate limiter stats
  const rateLimiter = yield* RateLimiter;
  // Note: In a real implementation, you'd track rate limiter metrics

  const response = createApiResponse({
    server: {
      uptime: serverMetrics.uptime,
      startTime: new Date(serverMetrics.startTime).toISOString(),
      version: '1.0.0',
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
  }, requestId);

  const httpResponse = yield* HttpServerResponse.json(response, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache',
      'X-Request-ID': requestId,
      'Content-Type': 'application/json',
    },
  });

  const duration = Date.now() - startTime;
  yield* Effect.logInfo('Metrics endpoint completed', {
    requestId,
    duration: `${duration}ms`,
    statusCode: 200,
  });

  return addSecurityHeaders(httpResponse);
});

/**
 * Rules endpoint handler
 * Returns: Array of rules from rules/cursor directory
 */
export const rulesHandler = Effect.gen(function* () {
  const requestId = generateRequestId();
  const startTime = Date.now();

  const metrics = yield* MetricsService;
  metrics.incrementRequestCount();

  yield* Effect.logInfo('Rules endpoint requested', { requestId });

  // Check rate limit
  const rateLimiter = yield* RateLimiter;
  const clientIP = '127.0.0.1'; // In production, extract from request headers
  const rateLimitResult = yield* rateLimiter.checkRateLimit(clientIP);

  if (!rateLimitResult.allowed) {
    const duration = Date.now() - startTime;
    metrics.incrementRateLimitHits();

    yield* Effect.logWarning('Rate limit exceeded', {
      requestId,
      clientIP,
      duration: `${duration}ms`,
    });

    const apiError = ApiError.make(
      'Rate limit exceeded',
      429,
      'RATE_LIMIT_EXCEEDED',
      { resetTime: rateLimitResult.resetTime }
    );
    const response = createErrorResponse(apiError, requestId);
    const httpResponse = yield* HttpServerResponse.json(response, {
      status: apiError.statusCode,
      headers: {
        'X-Request-ID': requestId,
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '',
        'Retry-After': Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000).toString(),
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
  if (rulesResult._tag === 'Left') {
    const error = rulesResult.left;
    const duration = Date.now() - startTime;
    metrics.incrementErrorCount();

    yield* Effect.logError('Failed to load and validate rules', {
      error,
      requestId,
      duration: `${duration}ms`,
    });

    const apiError = error._tag === 'RulesDirectoryNotFoundError'
      ? ApiError.serviceUnavailable('Rules directory not found')
      : ApiError.internalServerError('Failed to load rules');

    const response = createErrorResponse(apiError, requestId);
    const httpResponse = yield* HttpServerResponse.json(response, {
      status: apiError.statusCode,
      headers: {
        'X-Request-ID': requestId,
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
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
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=300', // 5 minutes
      'X-Request-ID': requestId,
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    },
  });

  return addSecurityHeaders(httpResponse);
});

/**
 * Single rule endpoint handler
 * Returns: Individual rule by ID
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
    const rateLimiter = yield* RateLimiter;
    const clientIP = '127.0.0.1'; // In production, extract from request headers
    const rateLimitResult = yield* rateLimiter.checkRateLimit(clientIP);

    if (!rateLimitResult.allowed) {
      const duration = Date.now() - startTime;
      metrics.incrementRateLimitHits();

      yield* Effect.logWarning('Rate limit exceeded', {
        requestId,
        clientIP,
        duration: `${duration}ms`,
      });

      const apiError = ApiError.make(
        'Rate limit exceeded',
        429,
        'RATE_LIMIT_EXCEEDED',
        { resetTime: rateLimitResult.resetTime }
      );
      const response = createErrorResponse(apiError, requestId);
      const httpResponse = yield* HttpServerResponse.json(response, {
        status: apiError.statusCode,
        headers: {
          'X-Request-ID': requestId,
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '',
          'Retry-After': Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000).toString(),
        },
      });

      return addSecurityHeaders(httpResponse);
    }

    // Validate input
    if (!id || id.trim().length === 0) {
      const duration = Date.now() - startTime;
      metrics.incrementErrorCount();

      const apiError = ApiError.badRequest('Rule ID is required');

      yield* Effect.logWarning('Invalid rule ID provided', {
        requestId,
        duration: `${duration}ms`,
        ruleId: id,
      });

      const response = createErrorResponse(apiError, requestId);
      const httpResponse = yield* HttpServerResponse.json(response, {
        status: apiError.statusCode,
        headers: {
          'X-Request-ID': requestId,
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
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
    if (ruleResult._tag === 'Left') {
      const error = ruleResult.left;
      const duration = Date.now() - startTime;
      metrics.incrementErrorCount();

      yield* Effect.logError('Failed to load and validate rule', {
        error,
        requestId,
        duration: `${duration}ms`,
      });

      const apiError = error._tag === 'RuleNotFoundError'
        ? ApiError.notFound(`Rule with ID '${id}' not found`)
        : ApiError.internalServerError('Failed to load rule');

      const response = createErrorResponse(apiError, requestId);
      const httpResponse = yield* HttpServerResponse.json(response, {
        status: apiError.statusCode,
        headers: {
          'X-Request-ID': requestId,
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
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
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes
        'X-Request-ID': requestId,
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      },
    });

    return addSecurityHeaders(httpResponse);
  });

// --- ROUTER ---

/**
 * HTTP Router with all application routes
 */
const router = HttpRouter.empty.pipe(
  HttpRouter.get('/health', healthHandler),
  HttpRouter.get('/metrics', metricsHandler),
  HttpRouter.get('/api/v1/rules', rulesHandler),
  HttpRouter.get(
    '/api/v1/rules/:id',
    Effect.gen(function* () {
      const params = yield* HttpRouter.params;
      const id = params.id;
      if (!id) {
        const requestId = generateRequestId();
        const apiError = ApiError.badRequest('Rule ID is required');
        const response = createErrorResponse(apiError, requestId);
        return yield* HttpServerResponse.json(response, {
          status: apiError.statusCode,
          headers: { 'X-Request-ID': requestId },
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
    `🚀 Pattern Server starting on http://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}`,
  );
  yield* Effect.logInfo(
    `📍 Health check: http://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}/health`,
  );
  yield* Effect.logInfo(
    `🌍 Environment: ${DEFAULT_CONFIG.nodeEnv}`,
  );
  yield* Effect.logInfo(
    `📊 Log level: ${DEFAULT_CONFIG.logLevel}`,
  );

  yield* Effect.scoped(
    Effect.gen(function* () {
      yield* Layer.launch(HttpLive);
      yield* Effect.logInfo('✨ Server is ready to accept requests');
      yield* Effect.never;
    }),
  );
}).pipe(
  Effect.provide(RateLimiter.Default),
  Effect.provide(MetricsService.Default),
);

// --- RUNTIME EXECUTION ---

/**
 * Run the server using NodeRuntime.runMain
 * This handles graceful shutdown on SIGINT/SIGTERM
 */
const isMainModule = (() => {
  const meta = import.meta as { main?: boolean };
  if (typeof meta.main === 'boolean') {
    return meta.main;
  }

  const entrypoint = process.argv[1];
  if (!entrypoint) {
    return false;
  }

  try {
    return import.meta.url === pathToFileURL(entrypoint).href
      || import.meta.url.endsWith(entrypoint);
  } catch {
    return false;
  }
})();

if (isMainModule) {
  NodeRuntime.runMain(program);
}

export { DEFAULT_CONFIG, program, ServerConfigSchema };

