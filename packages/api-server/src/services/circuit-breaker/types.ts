/**
 * Circuit Breaker Pattern Implementation
 *
 * Provides resilience against cascading failures from external services.
 * States: CLOSED (normal) -> OPEN (failing) -> HALF_OPEN (testing) -> CLOSED
 */

export type CircuitStatus = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * Circuit breaker state tracking
 */
export interface CircuitState {
  readonly status: CircuitStatus;
  readonly failureCount: number;
  readonly successCount: number;
  readonly lastFailureTime: Date | null;
  readonly openedAt: Date | null;
}

/**
 * Configuration for a circuit breaker
 */
export interface CircuitBreakerOptions {
  readonly failureThreshold: number;      // Open after N failures
  readonly successThreshold: number;      // Close after N successes in HALF_OPEN
  readonly timeout: number;               // Wait N ms before trying HALF_OPEN
  readonly halfOpenMaxCalls: number;      // Max calls allowed in HALF_OPEN state
}

/**
 * Circuit breaker statistics for monitoring
 */
export interface CircuitStats {
  readonly circuits: Array<{
    readonly name: string;
    readonly state: CircuitStatus;
    readonly failures: number;
    readonly successes: number;
    readonly lastFailure: Date | null;
  }>;
}
