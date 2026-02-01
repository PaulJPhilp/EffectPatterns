/**
 * Circuit Breaker Helper Functions
 *
 * Pure state transition logic for circuit breaker state machine
 */

import { CircuitState, CircuitStatus } from "./types";

/**
 * Check if circuit should transition from CLOSED to OPEN
 */
export function shouldOpenCircuit(state: CircuitState, threshold: number): boolean {
  return state.status === "CLOSED" && state.failureCount >= threshold;
}

/**
 * Check if circuit should transition from OPEN to HALF_OPEN
 */
export function shouldTransitionToHalfOpen(
  state: CircuitState,
  timeoutMs: number
): boolean {
  if (state.status !== "OPEN" || !state.openedAt) return false;
  const elapsed = Date.now() - state.openedAt.getTime();
  return elapsed >= timeoutMs;
}

/**
 * Check if circuit should transition from HALF_OPEN to CLOSED
 */
export function shouldCloseCircuit(state: CircuitState, threshold: number): boolean {
  return state.status === "HALF_OPEN" && state.successCount >= threshold;
}

/**
 * Record a failure in the circuit state
 */
export function recordFailure(state: CircuitState): CircuitState {
  return {
    ...state,
    failureCount: state.failureCount + 1,
    successCount: 0,
    lastFailureTime: new Date(),
  };
}

/**
 * Record a success in the circuit state
 */
export function recordSuccess(state: CircuitState): CircuitState {
  return {
    ...state,
    successCount: state.successCount + 1,
    failureCount: 0,
  };
}

/**
 * Transition circuit to OPEN state
 */
export function transitionToOpen(state: CircuitState): CircuitState {
  return {
    ...state,
    status: "OPEN",
    openedAt: new Date(),
    failureCount: 0,
    successCount: 0,
  };
}

/**
 * Transition circuit to HALF_OPEN state
 */
export function transitionToHalfOpen(state: CircuitState): CircuitState {
  return {
    ...state,
    status: "HALF_OPEN",
    successCount: 0,
    failureCount: 0,
  };
}

/**
 * Transition circuit to CLOSED state
 */
export function transitionToClosed(state: CircuitState): CircuitState {
  return {
    ...state,
    status: "CLOSED",
    openedAt: null,
    failureCount: 0,
    successCount: 0,
  };
}

/**
 * Create initial circuit state (CLOSED)
 */
export function createInitialState(): CircuitState {
  return {
    status: "CLOSED",
    failureCount: 0,
    successCount: 0,
    lastFailureTime: null,
    openedAt: null,
  };
}
