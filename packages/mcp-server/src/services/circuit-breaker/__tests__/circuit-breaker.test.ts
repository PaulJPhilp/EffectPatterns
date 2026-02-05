/**
 * Circuit Breaker Service Tests
 *
 * Comprehensive test suite for circuit breaker pattern implementation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Effect } from "effect";
import { CircuitBreakerService, CircuitBreakerOpenError } from "../index.js";
import { TestAppLayer } from "../../../server/init.js";

describe("CircuitBreakerService", () => {
  /**
   * Test: Circuit starts in CLOSED state
   */
  it("should start in CLOSED state", async () => {
    const program = Effect.gen(function* () {
      const cb = yield* CircuitBreakerService;
      const state = yield* cb.getState("test-circuit");
      expect(state.status).toBe("CLOSED");
      expect(state.failureCount).toBe(0);
      expect(state.successCount).toBe(0);
    });

    await Effect.runPromise(program.pipe(Effect.provide(TestAppLayer)));
  });

  /**
   * Test: Successful operations in CLOSED state increment success count
   */
  it("should allow successful operations in CLOSED state", async () => {
    const program = Effect.gen(function* () {
      const cb = yield* CircuitBreakerService;
      const result = yield* cb.execute(
        "test",
        Effect.succeed("success"),
        {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 60000,
          halfOpenMaxCalls: 3,
        }
      );

      expect(result).toBe("success");

      const state = yield* cb.getState("test");
      expect(state.status).toBe("CLOSED");
      expect(state.successCount).toBe(1);
      expect(state.failureCount).toBe(0);
    });

    await Effect.runPromise(program.pipe(Effect.provide(TestAppLayer)));
  });

  /**
   * Test: Failed operations increment failure count
   */
  it("should record failures and track failure count", async () => {
    const program = Effect.gen(function* () {
      const cb = yield* CircuitBreakerService;

      // Execute failing operation
      const result = yield* cb
        .execute(
          "test",
          Effect.fail(new Error("Service failure")),
          {
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 60000,
            halfOpenMaxCalls: 3,
          }
        )
        .pipe(Effect.catchAll(() => Effect.succeed("caught")));

      expect(result).toBe("caught");

      const state = yield* cb.getState("test");
      expect(state.status).toBe("CLOSED");
      expect(state.failureCount).toBe(1);
      expect(state.lastFailureTime).toBeTruthy();
    });

    await Effect.runPromise(program.pipe(Effect.provide(TestAppLayer)));
  });

  /**
   * Test: Circuit transitions to OPEN after failure threshold
   */
  it("should transition to OPEN after failure threshold is reached", async () => {
    const program = Effect.gen(function* () {
      const cb = yield* CircuitBreakerService;
      const failingOp = Effect.fail(new Error("fail"));

      // Trigger 5 failures to exceed threshold
      for (let i = 0; i < 5; i++) {
        yield* cb
          .execute("test", failingOp, {
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 60000,
            halfOpenMaxCalls: 3,
          })
          .pipe(Effect.catchAll(() => Effect.succeed(undefined)));
      }

      const state = yield* cb.getState("test");
      expect(state.status).toBe("OPEN");
      expect(state.openedAt).toBeTruthy();
    });

    await Effect.runPromise(program.pipe(Effect.provide(TestAppLayer)));
  });

  /**
   * Test: Circuit fails fast when OPEN
   */
  it("should fail fast when circuit is OPEN", async () => {
    const program = Effect.gen(function* () {
      const cb = yield* CircuitBreakerService;
      const failingOp = Effect.fail(new Error("fail"));

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        yield* cb
          .execute("test", failingOp, {
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 60000,
            halfOpenMaxCalls: 3,
          })
          .pipe(Effect.catchAll(() => Effect.succeed(undefined)));
      }

      // Try to execute when OPEN - should fail fast
      const error = yield* cb
        .execute("test", Effect.succeed("ok"), {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 60000,
          halfOpenMaxCalls: 3,
        })
        .pipe(
          Effect.catchTag("CircuitBreakerOpenError", (err) =>
            Effect.succeed(err.circuitName)
          ),
          Effect.catchAll(() => Effect.succeed(null))
        );

      expect(error).toBe("test");
    });

    await Effect.runPromise(program.pipe(Effect.provide(TestAppLayer)));
  });

  /**
   * Test: Circuit transitions to HALF_OPEN after timeout
   */
  it("should transition to HALF_OPEN after timeout expires", async () => {
    const program = Effect.gen(function* () {
      const cb = yield* CircuitBreakerService;
      const failingOp = Effect.fail(new Error("fail"));

      // Open the circuit with short timeout
      for (let i = 0; i < 5; i++) {
        yield* cb
          .execute("test", failingOp, {
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 100, // 100ms timeout
            halfOpenMaxCalls: 3,
          })
          .pipe(Effect.catchAll(() => Effect.succeed(undefined)));
      }

      // Wait for timeout to expire
      yield* Effect.sleep(150);

      // Next request should transition to HALF_OPEN
      yield* cb
        .execute("test", Effect.succeed("ok"), {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 100,
          halfOpenMaxCalls: 3,
        })
        .pipe(Effect.catchAll(() => Effect.succeed(undefined)));

      const state = yield* cb.getState("test");
      expect(state.status).toBe("HALF_OPEN");
    });

    await Effect.runPromise(program.pipe(Effect.provide(TestAppLayer)));
  });

  /**
   * Test: Circuit closes after success threshold in HALF_OPEN
   */
  it("should close circuit after success threshold is met in HALF_OPEN", async () => {
    const program = Effect.gen(function* () {
      const cb = yield* CircuitBreakerService;
      const failingOp = Effect.fail(new Error("fail"));

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        yield* cb
          .execute("test", failingOp, {
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 100,
            halfOpenMaxCalls: 3,
          })
          .pipe(Effect.catchAll(() => Effect.succeed(undefined)));
      }

      // Wait for timeout
      yield* Effect.sleep(150);

      // First success - transition to HALF_OPEN
      yield* cb
        .execute("test", Effect.succeed("ok"), {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 100,
          halfOpenMaxCalls: 3,
        })
        .pipe(Effect.catchAll(() => Effect.succeed(undefined)));

      // Second success - should close
      yield* cb
        .execute("test", Effect.succeed("ok"), {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 100,
          halfOpenMaxCalls: 3,
        })
        .pipe(Effect.catchAll(() => Effect.succeed(undefined)));

      const state = yield* cb.getState("test");
      expect(state.status).toBe("CLOSED");
      expect(state.failureCount).toBe(0);
      expect(state.successCount).toBe(0);
    });

    await Effect.runPromise(program.pipe(Effect.provide(TestAppLayer)));
  });

  /**
   * Test: Circuit reopens if failure occurs during HALF_OPEN
   */
  it("should reopen circuit if failure occurs during HALF_OPEN", async () => {
    const program = Effect.gen(function* () {
      const cb = yield* CircuitBreakerService;
      const failingOp = Effect.fail(new Error("fail"));

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        yield* cb
          .execute("test", failingOp, {
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 100,
            halfOpenMaxCalls: 3,
          })
          .pipe(Effect.catchAll(() => Effect.succeed(undefined)));
      }

      // Wait for timeout
      yield* Effect.sleep(150);

      // First success - transition to HALF_OPEN
      yield* cb
        .execute("test", Effect.succeed("ok"), {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 100,
          halfOpenMaxCalls: 3,
        })
        .pipe(Effect.catchAll(() => Effect.succeed(undefined)));

      // Failure in HALF_OPEN - should reopen
      yield* cb
        .execute("test", failingOp, {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 100,
          halfOpenMaxCalls: 3,
        })
        .pipe(Effect.catchAll(() => Effect.succeed(undefined)));

      const state = yield* cb.getState("test");
      expect(state.status).toBe("OPEN");
    });

    await Effect.runPromise(program.pipe(Effect.provide(TestAppLayer)));
  });

  /**
   * Test: Manual reset works correctly
   */
  it("should manually reset circuit to CLOSED state", async () => {
    const program = Effect.gen(function* () {
      const cb = yield* CircuitBreakerService;
      const failingOp = Effect.fail(new Error("fail"));

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        yield* cb
          .execute("test", failingOp, {
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 60000,
            halfOpenMaxCalls: 3,
          })
          .pipe(Effect.catchAll(() => Effect.succeed(undefined)));
      }

      let state = yield* cb.getState("test");
      expect(state.status).toBe("OPEN");

      // Reset
      yield* cb.reset("test");

      state = yield* cb.getState("test");
      expect(state.status).toBe("CLOSED");
      expect(state.failureCount).toBe(0);
      expect(state.successCount).toBe(0);
    });

    await Effect.runPromise(program.pipe(Effect.provide(TestAppLayer)));
  });

  /**
   * Test: Different circuits maintain independent state
   */
  it("should maintain independent state for different circuits", async () => {
    const program = Effect.gen(function* () {
      const cb = yield* CircuitBreakerService;

      // Open first circuit
      for (let i = 0; i < 5; i++) {
        yield* cb
          .execute("circuit1", Effect.fail(new Error("fail")), {
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 60000,
            halfOpenMaxCalls: 3,
          })
          .pipe(Effect.catchAll(() => Effect.succeed(undefined)));
      }

      // Second circuit should still be CLOSED
      yield* cb.execute("circuit2", Effect.succeed("ok"), {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000,
        halfOpenMaxCalls: 3,
      });

      const state1 = yield* cb.getState("circuit1");
      const state2 = yield* cb.getState("circuit2");

      expect(state1.status).toBe("OPEN");
      expect(state2.status).toBe("CLOSED");
    });

    await Effect.runPromise(program.pipe(Effect.provide(TestAppLayer)));
  });

  /**
   * Test: Get stats returns all circuit states
   */
  it("should return stats for all circuits", async () => {
    const program = Effect.gen(function* () {
      const cb = yield* CircuitBreakerService;

      // Execute some operations
      yield* cb.execute("circuit1", Effect.succeed("ok"), {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000,
        halfOpenMaxCalls: 3,
      });

      yield* cb
        .execute("circuit2", Effect.fail(new Error("fail")), {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 60000,
          halfOpenMaxCalls: 3,
        })
        .pipe(Effect.catchAll(() => Effect.succeed(undefined)));

      const stats = yield* cb.getStats();

      expect(stats.circuits).toBeTruthy();
      expect(stats.circuits.length).toBeGreaterThan(0);

      const circuit1Stats = stats.circuits.find((c) => c.name === "circuit1");
      const circuit2Stats = stats.circuits.find((c) => c.name === "circuit2");

      expect(circuit1Stats?.state).toBe("CLOSED");
      expect(circuit2Stats?.failures).toBe(1);
    });

    await Effect.runPromise(program.pipe(Effect.provide(TestAppLayer)));
  });

  /**
   * Test: Multiple failures in HALF_OPEN prevent reopening until threshold
   */
  it("should limit requests in HALF_OPEN state to halfOpenMaxCalls", async () => {
    const program = Effect.gen(function* () {
      const cb = yield* CircuitBreakerService;
      const failingOp = Effect.fail(new Error("fail"));

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        yield* cb
          .execute("test", failingOp, {
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 100,
            halfOpenMaxCalls: 2,
          })
          .pipe(Effect.catchAll(() => Effect.succeed(undefined)));
      }

      // Wait for timeout
      yield* Effect.sleep(150);

      // First request in HALF_OPEN - should succeed
      yield* cb
        .execute("test", Effect.succeed("ok"), {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 100,
          halfOpenMaxCalls: 2,
        })
        .pipe(Effect.catchAll(() => Effect.succeed(undefined)));

      // Second request in HALF_OPEN - should succeed
      yield* cb
        .execute("test", Effect.succeed("ok"), {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 100,
          halfOpenMaxCalls: 2,
        })
        .pipe(Effect.catchAll(() => Effect.succeed(undefined)));

      // Third request should be rejected (exceeded max calls)
      const error = yield* cb
        .execute("test", Effect.succeed("ok"), {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 100,
          halfOpenMaxCalls: 2,
        })
        .pipe(
          Effect.catchTag("CircuitBreakerOpenError", () =>
            Effect.succeed("rejected")
          ),
          Effect.catchAll(() => Effect.succeed(null))
        );

      expect(error).toBe("rejected");
    });

    await Effect.runPromise(program.pipe(Effect.provide(TestAppLayer)));
  });
});
