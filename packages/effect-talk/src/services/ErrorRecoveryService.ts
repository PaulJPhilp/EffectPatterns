import { Effect, Schedule, Data } from "effect";
import { LoggerService } from "./LoggerService";
import type {
  ProcessError,
  PersistenceError,
  ValidationError,
  SessionError,
  BlockError,
} from "../types";

/**
 * Error recovery service providing retry strategies and error handling
 * Enables resilient effect execution with exponential backoff and timeouts
 */

export interface ErrorRecoveryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
}

const DEFAULT_CONFIG: ErrorRecoveryConfig = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  timeoutMs: 30000,
};

export const ErrorRecoveryService = Effect.gen(function* () {
  const logger = yield* LoggerService;

  /**
   * Execute effect with exponential backoff retry strategy
   * Retries on transient errors (ProcessError, PersistenceError)
   */
  const executeWithRetry = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    config: Partial<ErrorRecoveryConfig> = {}
  ): Effect.Effect<A, E, R> => {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // Create exponential backoff schedule
    const schedule = Schedule.exponential(
      finalConfig.initialDelayMs,
      finalConfig.backoffMultiplier
    ).pipe(
      Schedule.compose(Schedule.maxTotalDuration(finalConfig.timeoutMs)),
      Schedule.compose(Schedule.recurs(finalConfig.maxRetries))
    );

    return effect.pipe(
      Effect.retry(schedule),
      Effect.tap((result) =>
        logger.info(`Execution succeeded after potential retries`)
      ),
      Effect.catchAll((error) => {
        // Log the final error before propagating
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Execution failed after retries: ${errorMsg}`);
        return Effect.fail(error);
      })
    );
  };

  /**
   * Execute effect with timeout
   * Fails if execution takes longer than specified timeout
   */
  const executeWithTimeout = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    timeoutMs: number = DEFAULT_CONFIG.timeoutMs
  ): Effect.Effect<A, E | NodeJS.Timeout, R> => {
    return effect.pipe(
      Effect.timeout(timeoutMs),
      Effect.tap(() =>
        logger.info(`Operation completed within timeout (${timeoutMs}ms)`)
      ),
      Effect.catchAll((error) => {
        if (error === "Timeout") {
          logger.warn(`Operation timed out after ${timeoutMs}ms`);
          return Effect.fail(error as NodeJS.Timeout);
        }
        return Effect.fail(error);
      })
    );
  };

  /**
   * Execute effect with both retry and timeout
   * Provides comprehensive error recovery
   */
  const executeWithRecovery = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    config: Partial<ErrorRecoveryConfig> = {}
  ): Effect.Effect<A, E, R> => {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    return executeWithTimeout(
      executeWithRetry(effect, config),
      finalConfig.timeoutMs
    ).pipe(
      Effect.catchAll((error) => Effect.fail(error as E))
    );
  };

  /**
   * Handle ProcessError with recovery strategies
   * - spawn-failed: Retry up to N times
   * - timeout: Fail immediately
   * - killed: Fail immediately
   */
  const handleProcessError = <A, E, R>(
    effect: Effect.Effect<A, ProcessError | E, R>,
    maxRetries: number = DEFAULT_CONFIG.maxRetries
  ): Effect.Effect<A, ProcessError | E, R> => {
    return effect.pipe(
      Effect.catchTag("ProcessError", (error) => {
        if (error.reason === "spawn-failed" && maxRetries > 0) {
          logger.warn(
            `ProcessError (spawn-failed), retrying... (${maxRetries} retries left)`
          );
          return handleProcessError(effect, maxRetries - 1);
        }

        logger.error(`ProcessError (${error.reason}): ${String(error.cause)}`);
        return Effect.fail(error);
      })
    );
  };

  /**
   * Handle PersistenceError with recovery strategies
   * - read: Retry up to N times
   * - write: Retry up to N times with exponential backoff
   * - delete: Fail immediately
   */
  const handlePersistenceError = <A, E, R>(
    effect: Effect.Effect<A, PersistenceError | E, R>,
    maxRetries: number = DEFAULT_CONFIG.maxRetries
  ): Effect.Effect<A, PersistenceError | E, R> => {
    return effect.pipe(
      Effect.catchTag("PersistenceError", (error) => {
        if (
          (error.operation === "read" || error.operation === "write") &&
          maxRetries > 0
        ) {
          logger.warn(
            `PersistenceError (${error.operation}) at ${error.path}, retrying... (${maxRetries} retries left)`
          );
          // Exponential backoff
          return Effect.sleep(
            DEFAULT_CONFIG.initialDelayMs * (DEFAULT_CONFIG.maxRetries - maxRetries)
          ).pipe(
            Effect.andThen(() =>
              handlePersistenceError(effect, maxRetries - 1)
            )
          );
        }

        logger.error(
          `PersistenceError (${error.operation}) at ${error.path}: ${String(error.cause)}`
        );
        return Effect.fail(error);
      })
    );
  };

  /**
   * Handle ValidationError
   * ValidationErrors are non-retryable - fail immediately with context
   */
  const handleValidationError = <A, E, R>(
    effect: Effect.Effect<A, ValidationError | E, R>,
    contextMsg: string = "Validation failed"
  ): Effect.Effect<A, ValidationError | E, R> => {
    return effect.pipe(
      Effect.catchTag("ValidationError", (error) => {
        logger.error(
          `${contextMsg}: Field ${error.field} - ${error.message}. Value: ${String(error.value)}`
        );
        return Effect.fail(error);
      })
    );
  };

  /**
   * Handle SessionError
   * SessionErrors are non-retryable - fail immediately
   */
  const handleSessionError = <A, E, R>(
    effect: Effect.Effect<A, SessionError | E, R>
  ): Effect.Effect<A, SessionError | E, R> => {
    return effect.pipe(
      Effect.catchTag("SessionError", (error) => {
        logger.error(
          `SessionError (session: ${error.sessionId}): ${error.message}`
        );
        return Effect.fail(error);
      })
    );
  };

  /**
   * Handle BlockError
   * BlockErrors are non-retryable - fail immediately
   */
  const handleBlockError = <A, E, R>(
    effect: Effect.Effect<A, BlockError | E, R>
  ): Effect.Effect<A, BlockError | E, R> => {
    return effect.pipe(
      Effect.catchTag("BlockError", (error) => {
        logger.error(`BlockError (block: ${error.blockId}): ${error.message}`);
        return Effect.fail(error);
      })
    );
  };

  /**
   * Provide fallback value on error
   * Useful for graceful degradation
   */
  const withFallback = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    fallback: A
  ): Effect.Effect<A, never, R> => {
    return effect.pipe(
      Effect.catchAll(() => Effect.succeed(fallback)),
      Effect.tap((result) =>
        logger.info("Fallback value used after error")
      )
    );
  };

  /**
   * Combine multiple error handlers
   */
  const withErrorContext = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    context: string
  ): Effect.Effect<A, E, R> => {
    return effect.pipe(
      Effect.catchAll((error) => {
        logger.error(`[${context}] Error: ${String(error)}`);
        return Effect.fail(error);
      })
    );
  };

  /**
   * Execute effect and log all errors at the end (non-failing)
   */
  const executeWithErrorLogging = <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A | null, never, R> => {
    return effect.pipe(
      Effect.tap((result) => logger.info("Operation completed successfully")),
      Effect.catchAll((error) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Operation failed: ${errorMsg}`);
        return Effect.succeed(null);
      })
    );
  };

  return {
    executeWithRetry,
    executeWithTimeout,
    executeWithRecovery,
    handleProcessError,
    handlePersistenceError,
    handleValidationError,
    handleSessionError,
    handleBlockError,
    withFallback,
    withErrorContext,
    executeWithErrorLogging,
  } as const;
}).pipe(
  Effect.andThen((methods) =>
    Effect.sync(() => methods)
  )
);

export const ErrorRecoveryServiceLayer = Effect.Service.layer(
  ErrorRecoveryService
);
