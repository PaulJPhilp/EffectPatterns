/**
 * Error Recovery Patterns
 * Practical examples and integration patterns for using ErrorRecoveryService
 * with existing EffectTalk services
 */

import { Effect } from "effect";
import { ErrorRecoveryService } from "./ErrorRecoveryService";
import { ProcessService, type ProcessHandle } from "./ProcessService";
import { PersistenceService } from "./PersistenceService";
import { LoggerService } from "./LoggerService";
import type { Session, Block } from "../types";
import { ProcessError, PersistenceError } from "../types";

/**
 * Pattern 1: Spawn process with retry on transient failures
 *
 * Use case: Process spawning might temporarily fail due to resource exhaustion.
 * Apply retry logic for spawn-failed errors.
 *
 * Example:
 * ```ts
 * const handle = yield* spawnWithRetry("npm install", "/project", {
 *   maxRetries: 3,
 *   initialDelayMs: 200,
 *   timeoutMs: 60000
 * });
 * ```
 */
export const spawnWithRetry = (
  command: string,
  cwd: string,
  env: Record<string, string>,
  config?: Partial<{ maxRetries: number; initialDelayMs: number; timeoutMs: number }>
) =>
  Effect.gen(function* () {
    const processService = yield* ProcessService;
    const errorRecovery = yield* ErrorRecoveryService;
    const logger = yield* LoggerService;

    const spawnEffect = Effect.gen(function* () {
      const handle = yield* processService.spawn(command, cwd, env);
      return handle;
    });

    return yield* errorRecovery.executeWithRecovery(spawnEffect, {
      maxRetries: config?.maxRetries ?? 3,
      initialDelayMs: config?.initialDelayMs ?? 100,
      timeoutMs: config?.timeoutMs ?? 30000,
    }).pipe(
      Effect.catchTag("ProcessError", (error) => {
        if (error.reason === "spawn-failed") {
          logger.error(`Failed to spawn process after retries: ${String(error.cause)}`);
        }
        return Effect.fail(error);
      })
    );
  });

/**
 * Pattern 2: Save session with exponential backoff on file I/O errors
 *
 * Use case: Session persistence might fail due to disk I/O issues.
 * Apply retry with exponential backoff for write operations.
 *
 * Example:
 * ```ts
 * yield* saveSessionWithRetry(session, { maxRetries: 5 });
 * ```
 */
export const saveSessionWithRetry = (
  session: Session,
  config?: Partial<{ maxRetries: number; initialDelayMs: number }>
) =>
  Effect.gen(function* () {
    const persistenceService = yield* PersistenceService;
    const errorRecovery = yield* ErrorRecoveryService;

    const saveEffect = Effect.gen(function* () {
      yield* persistenceService.saveSession(session);
    });

    return yield* errorRecovery.executeWithRetry(saveEffect, {
      maxRetries: config?.maxRetries ?? 3,
      initialDelayMs: config?.initialDelayMs ?? 100,
    });
  });

/**
 * Pattern 3: Load session with fallback to empty session
 *
 * Use case: Session loading might fail, but we want to continue with a fresh session.
 * Provide graceful fallback.
 *
 * Example:
 * ```ts
 * const session = yield* loadSessionWithFallback(sessionId);
 * // Returns either loaded session or a new empty session
 * ```
 */
export const loadSessionWithFallback = (sessionId: string) =>
  Effect.gen(function* () {
    const persistenceService = yield* PersistenceService;
    const errorRecovery = yield* ErrorRecoveryService;

    // Create a fallback empty session
    const fallbackSession: Session = {
      id: sessionId,
      blocks: [],
      activeBlockId: null,
      workingDirectory: "/",
      environment: {},
      createdAt: Date.now(),
      lastModified: Date.now(),
    };

    const loadEffect = Effect.gen(function* () {
      const session = yield* persistenceService.loadSession(sessionId);
      if (!session) {
        yield* Effect.fail(
          new PersistenceError({
            operation: "read",
            path: `sessions/${sessionId}`,
            cause: new Error("Session not found"),
          })
        );
      }
      return session!;
    });

    return yield* errorRecovery.withFallback(loadEffect, fallbackSession);
  });

/**
 * Pattern 4: Execute command with timeout protection
 *
 * Use case: Long-running commands should be interrupted to prevent hanging.
 * Apply timeout with cleanup.
 *
 * Example:
 * ```ts
 * yield* executeCommandWithTimeout("npm build", "/project", {
 *   timeoutMs: 300000 // 5 minutes
 * });
 * ```
 */
export const executeCommandWithTimeout = (
  command: string,
  cwd: string,
  env?: Record<string, string>,
  config?: Partial<{ timeoutMs: number }>
) =>
  Effect.gen(function* () {
    const processService = yield* ProcessService;
    const errorRecovery = yield* ErrorRecoveryService;
    const logger = yield* LoggerService;

    const executeEffect = Effect.scoped(
      Effect.gen(function* () {
        const handle = yield* processService.spawn(command, cwd, env || {});
        logger.info(`Command started with PID ${handle.pid}, timeout: ${config?.timeoutMs ?? 30000}ms`);
        return handle;
      })
    );

    return yield* errorRecovery
      .executeWithTimeout(executeEffect, config?.timeoutMs ?? 30000)
      .pipe(
        Effect.catchAll((error) => {
          if (error === "Timeout") {
            logger.warn(`Command timed out after ${config?.timeoutMs ?? 30000}ms`);
            return Effect.fail(new ProcessError({
              reason: "timeout",
              cause: new Error("Command execution timeout"),
            }));
          }
          return Effect.fail(error);
        })
      );
  });

/**
 * Pattern 5: Chain multiple operations with error context
 *
 * Use case: Complex workflows with multiple steps need context-aware error reporting.
 *
 * Example:
 * ```ts
 * const session = yield* executeWorkflowWithContext(() =>
 *   Effect.gen(function* () {
 *     const session = yield* loadSessionWithFallback(id);
 *     yield* saveSessionWithRetry(session);
 *     return session;
 *   })
 * );
 * ```
 */
export const executeWorkflowWithContext = (
  workflow: () => Effect.Effect<Session, never, ProcessService | PersistenceService | ErrorRecoveryService | LoggerService>,
  contextName: string = "Workflow"
) =>
  Effect.gen(function* () {
    const errorRecovery = yield* ErrorRecoveryService;

    return yield* errorRecovery.withErrorContext(
      workflow(),
      contextName
    );
  });

/**
 * Pattern 6: Batch operations with individual error handling and continuation
 *
 * Use case: Process multiple sessions/blocks but continue on individual failures.
 *
 * Example:
 * ```ts
 * const results = yield* processBatchWithRecovery(
 *   sessions,
 *   (session) => saveSessionWithRetry(session)
 * );
 * // Results include successes and nulls for failures
 * ```
 */
export const processBatchWithRecovery = <T, R>(
  items: T[],
  processor: (item: T) => Effect.Effect<void, never, R>,
) =>
  Effect.gen(function* () {
    const errorRecovery = yield* ErrorRecoveryService;

    const results = yield* Effect.all(
      items.map((item) =>
        errorRecovery
          .executeWithErrorLogging(processor(item))
      )
    );

    return results;
  });

/**
 * Pattern 7: Retry operation with exponential backoff and max delay
 *
 * Use case: Network operations or transient failures benefit from exponential backoff
 * with maximum delay caps.
 *
 * Example:
 * ```ts
 * const data = yield* retryWithBackoff(
 *   fetchDataFromAPI(),
 *   { maxRetries: 5, maxDelayMs: 10000 }
 * );
 * ```
 */
export const retryWithBackoff = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  config?: Partial<{
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  }>
) =>
  Effect.gen(function* () {
    const errorRecovery = yield* ErrorRecoveryService;

    return yield* errorRecovery.executeWithRetry(effect, {
      maxRetries: config?.maxRetries ?? 3,
      initialDelayMs: config?.initialDelayMs ?? 100,
      maxDelayMs: config?.maxDelayMs ?? 5000,
      backoffMultiplier: config?.backoffMultiplier ?? 2,
    });
  });

/**
 * Pattern 8: Graceful degradation with fallback values
 *
 * Use case: Feature that's not critical should gracefully degrade on error.
 *
 * Example:
 * ```ts
 * const commands = yield* getCommandHistoryOrDefault(
 *   sessionId,
 *   [] // fallback: empty history
 * );
 * ```
 */
export const getCommandHistoryOrDefault = <T>(
  effect: Effect.Effect<T, never, PersistenceService | ErrorRecoveryService>,
  defaultValue: T
) =>
  Effect.gen(function* () {
    const errorRecovery = yield* ErrorRecoveryService;

    return yield* errorRecovery.withFallback(effect, defaultValue);
  });

/**
 * Pattern 9: Validate and retry pattern
 *
 * Use case: Validation errors should not be retried, but spawn errors should be.
 *
 * Example:
 * ```ts
 * const handle = yield* spawnWithValidation(
 *   command,
 *   cwd,
 *   env
 * );
 * // Validates command format, then spawns with retry
 * ```
 */
export const spawnWithValidation = (
  command: string,
  cwd: string,
  env: Record<string, string>
) =>
  Effect.gen(function* () {
    const processService = yield* ProcessService;
    const errorRecovery = yield* ErrorRecoveryService;

    // Validate command format (non-retryable)
    const validated = yield* errorRecovery.handleValidationError(
      Effect.gen(function* () {
        if (!command || command.trim().length === 0) {
          yield* Effect.fail({
            field: "command",
            message: "Command cannot be empty",
            value: command,
          });
        }
        return { command, cwd, env };
      }),
      "Command validation"
    );

    // Spawn with retry (retryable)
    return yield* errorRecovery.executeWithRetry(
      Effect.gen(function* () {
        return yield* processService.spawn(
          validated.command,
          validated.cwd,
          validated.env
        );
      }),
      { maxRetries: 3 }
    );
  });

/**
 * Pattern 10: Comprehensive error recovery with all strategies
 *
 * Use case: Critical operation that needs maximum reliability.
 * Combines retry, timeout, error context, and logging.
 *
 * Example:
 * ```ts
 * const session = yield* saveSessionReliably(session);
 * // Maximum reliability with comprehensive error handling
 * ```
 */
export const saveSessionReliably = (session: Session) =>
  Effect.gen(function* () {
    const persistenceService = yield* PersistenceService;
    const errorRecovery = yield* ErrorRecoveryService;
    const logger = yield* LoggerService;

    const startTime = Date.now();

    const saveEffect = Effect.gen(function* () {
      yield* logger.info(`Saving session ${session.id}...`);
      yield* persistenceService.saveSession(session);
      const elapsed = Date.now() - startTime;
      yield* logger.info(`Session ${session.id} saved successfully in ${elapsed}ms`);
    });

    // Apply recovery strategies in order: context → retry → timeout
    return yield* errorRecovery
      .withErrorContext(saveEffect, `SaveSession[${session.id}]`)
      .pipe(
        Effect.andThen(() =>
          errorRecovery.executeWithRetry(saveEffect, {
            maxRetries: 3,
            initialDelayMs: 100,
            maxDelayMs: 5000,
          })
        ),
        Effect.andThen((result) =>
          errorRecovery.executeWithTimeout(Effect.succeed(result), 30000)
        ),
        Effect.catchAll((error) => {
          logger.error(`Failed to save session reliably: ${String(error)}`);
          return Effect.fail(error);
        })
      );
  });
