/**
 * Circuit Breaker Service
 *
 * Prevents cascading failures by monitoring service health and failing fast
 * when services are degraded.
 */

import { Effect, Ref, Fiber } from "effect";
import { MCPConfigService } from "../config";
import { MCPLoggerService } from "../logger";
import { CircuitBreakerOpenError } from "../../errors";
import { CircuitBreakerOptions, CircuitState, CircuitStats } from "./types";
import {
  createInitialState,
  recordFailure,
  recordSuccess,
  shouldCloseCircuit,
  shouldOpenCircuit,
  shouldTransitionToHalfOpen,
  transitionToClosed,
  transitionToHalfOpen,
  transitionToOpen,
} from "./helpers";

/**
 * Default circuit breaker options
 */
const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1 minute
  halfOpenMaxCalls: 3,
};

/**
 * Circuit Breaker Service
 *
 * Provides circuit breaker pattern implementation for protecting against
 * cascading failures from external services (database, KV/Redis, etc).
 */
export class CircuitBreakerService extends Effect.Service<CircuitBreakerService>()(
  "CircuitBreakerService",
  {
    dependencies: [MCPConfigService.Default, MCPLoggerService.Default],
    scoped: Effect.gen(function* () {
      const config = yield* MCPConfigService;
      const logger = yield* MCPLoggerService;

      // State management for each named circuit
      const circuitsRef = yield* Ref.make(new Map<string, CircuitState>());

      // Monitoring fiber for state transitions
      const monitorFiber = yield* Effect.forkDaemon(
        monitoringLoop(circuitsRef, logger)
      );
      yield* Effect.addFinalizer(() => Fiber.interrupt(monitorFiber).pipe(Effect.ignore));

      /**
       * Execute an effect with circuit breaker protection
       */
      const execute = <A, E>(
        name: string,
        effect: Effect.Effect<A, E>,
        options?: CircuitBreakerOptions
      ): Effect.Effect<A, E | CircuitBreakerOpenError> =>
        Effect.gen(function* () {
          const opts = options ?? DEFAULT_OPTIONS;

          // Get current circuit state
          const circuits = yield* Ref.get(circuitsRef);
          let state = circuits.get(name) ?? createInitialState();

          // Check if circuit is OPEN
          if (state.status === "OPEN") {
            // Check if timeout has elapsed to transition to HALF_OPEN
            if (shouldTransitionToHalfOpen(state, opts.timeout)) {
              state = transitionToHalfOpen(state);
              yield* Ref.update(circuitsRef, (circuits) => {
                const newCircuits = new Map(circuits);
                newCircuits.set(name, state);
                return newCircuits;
              });
              yield* logger
                .withOperation("circuit-breaker")
                .debug(`Circuit "${name}" transitioning to HALF_OPEN`);
            } else {
              // Fail fast - circuit is still OPEN
              return yield* Effect.fail(
                new CircuitBreakerOpenError({
                  circuitName: name,
                  openedAt: state.openedAt!,
                  message: `Circuit breaker for "${name}" is OPEN`,
                })
              );
            }
          }

          // In HALF_OPEN state, limit concurrent requests
          if (state.status === "HALF_OPEN" && state.successCount >= opts.halfOpenMaxCalls) {
            // Too many requests in HALF_OPEN, fail fast
            return yield* Effect.fail(
              new CircuitBreakerOpenError({
                circuitName: name,
                openedAt: state.openedAt!,
                message: `Circuit breaker for "${name}" is HALF_OPEN (max calls reached)`,
              })
            );
          }

          // Execute the effect with error handling
          const result = yield* effect.pipe(
            Effect.tapError((error) =>
              Effect.gen(function* () {
                // Record failure
                let updatedState = recordFailure(state);

                // Check if should transition to OPEN
                if (shouldOpenCircuit(updatedState, opts.failureThreshold)) {
                  updatedState = transitionToOpen(updatedState);
                  yield* logger
                    .withOperation("circuit-breaker")
                    .warn(
                      `Circuit "${name}" OPENED after ${opts.failureThreshold} failures`,
                      {
                        failureCount: updatedState.failureCount,
                      }
                    );
                } else {
                  yield* logger
                    .withOperation("circuit-breaker")
                    .debug(
                      `Circuit "${name}" recorded failure (${updatedState.failureCount}/${opts.failureThreshold})`,
                      { status: updatedState.status }
                    );
                }

                // Update circuit state
                yield* Ref.update(circuitsRef, (circuits) => {
                  const newCircuits = new Map(circuits);
                  newCircuits.set(name, updatedState);
                  return newCircuits;
                });
              })
            ),
            Effect.tap(() =>
              Effect.gen(function* () {
                // Record success
                let updatedState = recordSuccess(state);

                // Check if should close (from HALF_OPEN)
                if (shouldCloseCircuit(updatedState, opts.successThreshold)) {
                  updatedState = transitionToClosed(updatedState);
                  yield* logger
                    .withOperation("circuit-breaker")
                    .info(
                      `Circuit "${name}" CLOSED after ${opts.successThreshold} successes`,
                      { lastFailure: updatedState.lastFailureTime?.toISOString() }
                    );
                } else if (state.status === "HALF_OPEN") {
                  yield* logger
                    .withOperation("circuit-breaker")
                    .debug(
                      `Circuit "${name}" recorded success in HALF_OPEN (${updatedState.successCount}/${opts.successThreshold})`
                    );
                }

                // Update circuit state
                yield* Ref.update(circuitsRef, (circuits) => {
                  const newCircuits = new Map(circuits);
                  newCircuits.set(name, updatedState);
                  return newCircuits;
                });
              })
            )
          );

          return result;
        });

      /**
       * Get current state of a circuit
       */
      const getState = (name: string): Effect.Effect<CircuitState> =>
        Effect.gen(function* () {
          const circuits = yield* Ref.get(circuitsRef);
          return circuits.get(name) ?? createInitialState();
        });

      /**
       * Manually reset a circuit to CLOSED state
       */
      const reset = (name: string): Effect.Effect<void> =>
        Effect.gen(function* () {
          yield* Ref.update(circuitsRef, (circuits) => {
            const newCircuits = new Map(circuits);
            newCircuits.set(name, createInitialState());
            return newCircuits;
          });
          yield* logger
            .withOperation("circuit-breaker")
            .info(`Circuit "${name}" manually reset to CLOSED`);
        });

      /**
       * Get statistics for all circuits
       */
      const getStats = (): Effect.Effect<CircuitStats> =>
        Effect.gen(function* () {
          const circuits = yield* Ref.get(circuitsRef);
          return {
            circuits: Array.from(circuits.entries()).map(([name, state]) => ({
              name,
              state: state.status,
              failures: state.failureCount,
              successes: state.successCount,
              lastFailure: state.lastFailureTime,
            })),
          };
        });

      return {
        execute,
        getState,
        reset,
        getStats,
      };
    }),
  }
) {}

/**
 * Background monitoring loop for circuit breaker state
 *
 * Logs periodic status of OPEN circuits to help with troubleshooting
 */
function monitoringLoop(
  circuitsRef: Ref.Ref<Map<string, CircuitState>>,
  logger: MCPLoggerService
): Effect.Effect<never, never> {
  return Effect.gen(function* () {
    while (true) {
      yield* Effect.sleep(10000); // Check every 10 seconds

      const circuits = yield* Ref.get(circuitsRef);
      const openCircuits = Array.from(circuits.entries()).filter(
        ([, state]) => state.status === "OPEN"
      );

      if (openCircuits.length > 0) {
        for (const [name, state] of openCircuits) {
          yield* logger
            .withOperation("circuit-breaker.monitor")
            .debug(`Circuit "${name}" still OPEN`, {
              openedAt: state.openedAt?.toISOString(),
              failureCount: state.failureCount,
            });
        }
      }
    }
  }).pipe(Effect.forever);
}
