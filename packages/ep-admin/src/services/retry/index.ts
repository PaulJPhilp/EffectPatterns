/**
 * Retry/Backoff Service
 *
 * Handles transient failures with exponential backoff and jitter.
 * Useful for:
 * - Network calls that might be temporarily unavailable
 * - Temporary service issues (503 Service Unavailable)
 * - Rate limiting (429 Too Many Requests)
 *
 * Does NOT retry on:
 * - Permanent failures (4xx errors except 429)
 * - Authentication errors (401, 403)
 * - Invalid input errors
 */

import { Effect } from "effect";

/**
 * Retry configuration options
 */
export interface RetryOptions {
	/** Maximum number of retry attempts (default: 3) */
	readonly maxRetries?: number;
	/** Initial delay in milliseconds (default: 100ms) */
	readonly initialDelayMs?: number;
	/** Maximum delay in milliseconds (default: 30000ms = 30s) */
	readonly maxDelayMs?: number;
	/** Multiplier for exponential backoff (default: 2) */
	readonly backoffMultiplier?: number;
	/** Add jitter to prevent thundering herd (default: true) */
	readonly useJitter?: boolean;
	/** Show retry attempts in UI (default: false) */
	readonly verbose?: boolean;
}

/**
 * Determine if an error is retryable
 */
const isRetryableError = (error: unknown): boolean => {
	// Check if it's a network/connection error
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		// Network errors are retryable
		if (
			message.includes("econnrefused") ||
			message.includes("enotfound") ||
			message.includes("etimedout") ||
			message.includes("econnreset") ||
			message.includes("failed to connect")
		) {
			return true;
		}
	}

	// Check if it's an HTTP error with retryable status code
	if (
		error &&
		typeof error === "object" &&
		"status" in error
	) {
		const statusValue = (error as { status: unknown }).status;
		if (typeof statusValue === "number") {
			const status = statusValue;
			// Retry on server errors (5xx)
			if (status >= 500 && status < 600) {
				return true;
			}
			// Retry on rate limiting
			if (status === 429) {
				return true;
			}
			// Retry on timeouts
			if (status === 408) {
				return true;
			}
			// Don't retry on client errors (4xx) except those above
			if (status >= 400 && status < 500) {
				return false;
			}
		}
	}

	// Unknown error - retry to be safe
	return true;
};

/**
 * Calculate delay with exponential backoff and jitter
 */
const calculateDelay = (
	attempt: number,
	initialDelayMs: number,
	maxDelayMs: number,
	backoffMultiplier: number,
	useJitter: boolean
): number => {
	// Exponential backoff: delay = initialDelay * (multiplier ^ attempt)
	let delay = initialDelayMs * Math.pow(backoffMultiplier, attempt);

	// Cap at maxDelay
	delay = Math.min(delay, maxDelayMs);

	// Add jitter: randomize between 0 and calculated delay
	if (useJitter) {
		delay = Math.random() * delay;
	}

	return delay;
};

/**
 * Format delay for display
 */
const formatDelay = (ms: number): string => {
	if (ms < 1000) {
		return `${Math.round(ms)}ms`;
	}
	return `${(ms / 1000).toFixed(1)}s`;
};

/**
 * Retry an effect with exponential backoff
 *
 * @param effect The effect to retry
 * @param options Retry configuration
 * @returns The effect with retry logic applied
 */
export const withRetry = <A, E>(
	effect: Effect.Effect<A, E>,
	options: RetryOptions = {}
): Effect.Effect<A, E> => {
	const maxRetries = options.maxRetries ?? 3;
	const initialDelayMs = options.initialDelayMs ?? 100;
	const maxDelayMs = options.maxDelayMs ?? 30000;
	const backoffMultiplier = options.backoffMultiplier ?? 2;
	const useJitter = options.useJitter !== false;
	const verbose = options.verbose ?? false;

	return Effect.gen(function* () {
		let lastError: E | undefined;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			// Try the effect
			const result = yield* effect.pipe(
				Effect.either
			);

			// If successful, return the value
			if (result._tag === "Right") {
				return result.right;
			}

			// If failed, check if retryable
			lastError = result.left;
			const error = result.left as unknown;

			if (attempt === maxRetries || !isRetryableError(error)) {
				// No more retries - fail with the error
				return yield* Effect.fail(lastError);
			}

			// Calculate delay for next attempt
			const delayMs = calculateDelay(
				attempt,
				initialDelayMs,
				maxDelayMs,
				backoffMultiplier,
				useJitter
			);

			// Show retry message if verbose (using console since Display service not available here)
			if (verbose) {
				console.log(
					`⟳ Retry attempt ${attempt + 1}/${maxRetries} (waiting ${formatDelay(delayMs)})`
				);
			}

			// Sleep before retrying
			yield* Effect.sleep(delayMs);
		}

		// Should not reach here, but fail just in case
		return yield* Effect.fail(lastError!);
	});
};

/**
 * Retry with default options
 */
export const retry = <A, E>(
	effect: Effect.Effect<A, E>
): Effect.Effect<A, E> => withRetry(effect);

/**
 * Retry with custom max retries
 */
export const retryN = <A, E>(
	effect: Effect.Effect<A, E>,
	maxRetries: number
): Effect.Effect<A, E> => withRetry(effect, { maxRetries });

/**
 * Retry with verbose output
 */
export const retryVerbose = <A, E>(
	effect: Effect.Effect<A, E>,
	maxRetries: number = 3
): Effect.Effect<A, E> => withRetry(effect, { maxRetries, verbose: true });
