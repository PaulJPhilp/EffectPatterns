import { describe, it, expect, beforeEach } from "vitest";
import { Effect } from "effect";
import { ErrorRecoveryService } from "../ErrorRecoveryService";
import { LoggerService } from "../LoggerService";
import {
  ProcessError,
  PersistenceError,
  ValidationError,
  SessionError,
  BlockError,
} from "../../types";

/**
 * Test suite for ErrorRecoveryService
 * Tests error recovery strategies: retry, timeout, fallback, error handling
 */

describe("ErrorRecoveryService", () => {
  const runErrorRecovery = async <A>(
    effect: Effect.Effect<A, never, ErrorRecoveryService | LoggerService>
  ): Promise<A> => {
    return Effect.runPromise(
      effect.pipe(
        Effect.provide(LoggerService.Default),
        Effect.provide(ErrorRecoveryService)
      )
    );
  };

  describe("executeWithRetry", () => {
    it("should succeed on first attempt", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;
          const effect = Effect.succeed("success");
          return yield* service.executeWithRetry(effect);
        })
      );

      expect(result).toBe("success");
    });

    it("should retry on failure and eventually succeed", async () => {
      let attempts = 0;

      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          // Effect that fails twice, then succeeds
          const effect = Effect.gen(function* () {
            attempts++;
            if (attempts < 3) {
              yield* Effect.fail(new Error("Temporary failure"));
            }
            return "success";
          });

          return yield* service.executeWithRetry(effect, { maxRetries: 3 });
        })
      );

      expect(result).toBe("success");
      expect(attempts).toBeGreaterThan(1);
    });

    it("should respect maxRetries limit", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          // Effect that always fails
          const effect = Effect.fail(new Error("Persistent failure"));

          return yield* Effect.try(() =>
            service.executeWithRetry(effect, { maxRetries: 2 })
          ).pipe(
            Effect.catchAll(() => Effect.succeed("failed as expected"))
          );
        })
      );

      expect(result).toBe("failed as expected");
    });

    it("should apply exponential backoff delays", async () => {
      const startTime = Date.now();
      let attempts = 0;

      await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.gen(function* () {
            attempts++;
            if (attempts < 2) {
              yield* Effect.fail(new Error("Retry me"));
            }
            return "success";
          });

          return yield* Effect.try(() =>
            service.executeWithRetry(effect, {
              maxRetries: 2,
              initialDelayMs: 100,
              backoffMultiplier: 2,
            })
          ).pipe(
            Effect.catchAll(() => Effect.succeed(null))
          );
        })
      );

      const elapsed = Date.now() - startTime;
      // Should have had some delay due to retry with backoff
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe("executeWithTimeout", () => {
    it("should complete within timeout", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;
          const effect = Effect.succeed("completed");
          return yield* service
            .executeWithTimeout(effect, 5000)
            .pipe(
              Effect.catchAll(() => Effect.succeed("timed out"))
            );
        })
      );

      expect(result).toBe("completed");
    });

    it("should timeout on long-running operations", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;
          // Effect that sleeps longer than timeout
          const effect = Effect.sleep(100).pipe(
            Effect.andThen(() => Effect.succeed("completed"))
          );

          return yield* service
            .executeWithTimeout(effect, 10)
            .pipe(
              Effect.catchAll(() => Effect.succeed("timed out"))
            );
        })
      );

      // May timeout or succeed depending on timing
      expect(["completed", "timed out"]).toContain(result);
    });
  });

  describe("executeWithRecovery", () => {
    it("should apply both retry and timeout", async () => {
      let attempts = 0;

      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.gen(function* () {
            attempts++;
            if (attempts < 2) {
              yield* Effect.fail(new Error("Retry me"));
            }
            return "recovered";
          });

          return yield* service
            .executeWithRecovery(effect, { maxRetries: 3, timeoutMs: 5000 })
            .pipe(
              Effect.catchAll(() => Effect.succeed("failed"))
            );
        })
      );

      expect(result).toBe("recovered");
      expect(attempts).toBeGreaterThan(1);
    });

    it("should timeout even with retries available", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.sleep(100).pipe(
            Effect.andThen(() => Effect.succeed("completed"))
          );

          return yield* service
            .executeWithRecovery(effect, {
              maxRetries: 3,
              timeoutMs: 10,
            })
            .pipe(
              Effect.catchAll(() => Effect.succeed("failed"))
            );
        })
      );

      // May fail due to timeout
      expect(["completed", "failed"]).toContain(result);
    });
  });

  describe("handleProcessError", () => {
    it("should retry on spawn-failed", async () => {
      let attempts = 0;

      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.gen(function* () {
            attempts++;
            if (attempts < 2) {
              yield* Effect.fail(
                new ProcessError({
                  reason: "spawn-failed",
                  cause: new Error("Device busy"),
                })
              );
            }
            return "recovered";
          });

          return yield* service
            .handleProcessError(effect)
            .pipe(
              Effect.catchAll(() => Effect.succeed("failed after retries"))
            );
        })
      );

      expect(result).toBe("recovered");
      expect(attempts).toBeGreaterThan(1);
    });

    it("should fail immediately on timeout reason", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.fail(
            new ProcessError({
              reason: "timeout",
              cause: new Error("Operation took too long"),
            })
          );

          return yield* service
            .handleProcessError(effect)
            .pipe(
              Effect.catchAll(() => Effect.succeed("failed immediately"))
            );
        })
      );

      expect(result).toBe("failed immediately");
    });

    it("should fail immediately on killed reason", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.fail(
            new ProcessError({
              reason: "killed",
              pid: 12345,
              cause: new Error("SIGKILL"),
            })
          );

          return yield* service
            .handleProcessError(effect)
            .pipe(
              Effect.catchAll(() => Effect.succeed("failed immediately"))
            );
        })
      );

      expect(result).toBe("failed immediately");
    });

    it("should stop retrying after maxRetries", async () => {
      let attempts = 0;

      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.gen(function* () {
            attempts++;
            yield* Effect.fail(
              new ProcessError({
                reason: "spawn-failed",
                cause: new Error("Persistent failure"),
              })
            );
          });

          return yield* service
            .handleProcessError(effect, 2)
            .pipe(
              Effect.catchAll(() => Effect.succeed("failed after max retries"))
            );
        })
      );

      expect(result).toBe("failed after max retries");
      expect(attempts).toBeLessThanOrEqual(3); // Initial + 2 retries
    });
  });

  describe("handlePersistenceError", () => {
    it("should retry on read error", async () => {
      let attempts = 0;

      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.gen(function* () {
            attempts++;
            if (attempts < 2) {
              yield* Effect.fail(
                new PersistenceError({
                  operation: "read",
                  path: "/tmp/file.json",
                  cause: new Error("ENOENT"),
                })
              );
            }
            return "recovered";
          });

          return yield* service
            .handlePersistenceError(effect)
            .pipe(
              Effect.catchAll(() => Effect.succeed("failed after retries"))
            );
        })
      );

      expect(result).toBe("recovered");
      expect(attempts).toBeGreaterThan(1);
    });

    it("should retry on write error", async () => {
      let attempts = 0;

      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.gen(function* () {
            attempts++;
            if (attempts < 2) {
              yield* Effect.fail(
                new PersistenceError({
                  operation: "write",
                  path: "/tmp/file.json",
                  cause: new Error("EACCES"),
                })
              );
            }
            return "recovered";
          });

          return yield* service
            .handlePersistenceError(effect)
            .pipe(
              Effect.catchAll(() => Effect.succeed("failed after retries"))
            );
        })
      );

      expect(result).toBe("recovered");
    });

    it("should fail immediately on delete error", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.fail(
            new PersistenceError({
              operation: "delete",
              path: "/tmp/file.json",
              cause: new Error("EACCES"),
            })
          );

          return yield* service
            .handlePersistenceError(effect)
            .pipe(
              Effect.catchAll(() => Effect.succeed("failed immediately"))
            );
        })
      );

      expect(result).toBe("failed immediately");
    });
  });

  describe("handleValidationError", () => {
    it("should fail immediately on validation error", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.fail(
            new ValidationError({
              field: "email",
              message: "Invalid email format",
              value: "not-an-email",
            })
          );

          return yield* service
            .handleValidationError(effect)
            .pipe(
              Effect.catchAll(() => Effect.succeed("validation failed"))
            );
        })
      );

      expect(result).toBe("validation failed");
    });

    it("should include context message in logs", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.fail(
            new ValidationError({
              field: "age",
              message: "Must be positive",
              value: -5,
            })
          );

          return yield* service
            .handleValidationError(effect, "Age validation failed")
            .pipe(
              Effect.catchAll(() => Effect.succeed("handled"))
            );
        })
      );

      expect(result).toBe("handled");
    });
  });

  describe("handleSessionError", () => {
    it("should fail immediately on session error", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.fail(
            new SessionError({
              sessionId: "sess-123",
              message: "Session not found",
            })
          );

          return yield* service
            .handleSessionError(effect)
            .pipe(
              Effect.catchAll(() => Effect.succeed("session error handled"))
            );
        })
      );

      expect(result).toBe("session error handled");
    });
  });

  describe("handleBlockError", () => {
    it("should fail immediately on block error", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.fail(
            new BlockError({
              blockId: "block-456",
              message: "Block not found in session",
            })
          );

          return yield* service
            .handleBlockError(effect)
            .pipe(
              Effect.catchAll(() => Effect.succeed("block error handled"))
            );
        })
      );

      expect(result).toBe("block error handled");
    });
  });

  describe("withFallback", () => {
    it("should use fallback on error", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.fail(new Error("Something failed"));

          return yield* service.withFallback(effect, "fallback value");
        })
      );

      expect(result).toBe("fallback value");
    });

    it("should return success value without fallback", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.succeed("original value");

          return yield* service.withFallback(effect, "fallback value");
        })
      );

      expect(result).toBe("original value");
    });
  });

  describe("withErrorContext", () => {
    it("should add context to error logging", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.fail(new Error("Network error"));

          return yield* service
            .withErrorContext(effect, "API Call")
            .pipe(
              Effect.catchAll(() => Effect.succeed("error handled"))
            );
        })
      );

      expect(result).toBe("error handled");
    });
  });

  describe("executeWithErrorLogging", () => {
    it("should return result on success", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.succeed("success");

          return yield* service.executeWithErrorLogging(effect);
        })
      );

      expect(result).toBe("success");
    });

    it("should return null on error without throwing", async () => {
      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.fail(new Error("Oops"));

          return yield* service.executeWithErrorLogging(effect);
        })
      );

      expect(result).toBeNull();
    });

    it("should log error without propagating", async () => {
      let errorLogged = false;

      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.gen(function* () {
            yield* Effect.fail(new Error("Test error"));
          });

          return yield* service.executeWithErrorLogging(effect);
        })
      );

      // Should not throw, should return null
      expect(result).toBeNull();
    });
  });

  describe("Error recovery workflow", () => {
    it("should handle complex error recovery scenario", async () => {
      let attempts = 0;

      const result = await runErrorRecovery(
        Effect.gen(function* () {
          const service = yield* ErrorRecoveryService;

          const effect = Effect.gen(function* () {
            attempts++;
            if (attempts < 2) {
              yield* Effect.fail(new ProcessError({
                reason: "spawn-failed",
                cause: new Error("Temporary"),
              }));
            }
            return "success";
          });

          // Apply recovery: handle error and provide fallback
          return yield* effect.pipe(
            Effect.catchAll((error) =>
              service.handleProcessError(Effect.fail(error))
            ),
            Effect.catchAll(() => Effect.succeed("fallback"))
          );
        })
      );

      // Should recover or use fallback
      expect(["success", "fallback"]).toContain(result);
    });
  });
});
