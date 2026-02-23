/**
 * Retry Service Integration Tests
 *
 * Tests the retry/backoff service with exponential backoff, jitter,
 * error classification, and retry limits.
 */

import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureConsole } from "../../../test/helpers.js";
import {
	retry,
	retryN,
	retryVerbose,
	type RetryOptions,
	withRetry,
} from "../index.js";

describe("Retry Service - Integration", () => {
	describe("Exponential Backoff", () => {
		it("should apply exponential backoff without jitter", async () => {
			const attempts: number[] = [];
			let callCount = 0;

			const failingEffect = Effect.gen(function* () {
				attempts.push(Date.now());
				callCount++;
				if (callCount < 3) {
					return yield* Effect.fail(new Error("ECONNREFUSED"));
				}
				return "success";
			});

			const result = await Effect.runPromise(
				withRetry(failingEffect, {
					maxRetries: 3,
					initialDelayMs: 50,
					useJitter: false,
				})
			);

			expect(result).toBe("success");
			expect(attempts.length).toBe(3);

			const delay1 = attempts[1] - attempts[0];
			const delay2 = attempts[2] - attempts[1];

			expect(delay1).toBeGreaterThanOrEqual(40);
			expect(delay1).toBeLessThanOrEqual(80);
			expect(delay2).toBeGreaterThanOrEqual(90);
			expect(delay2).toBeLessThanOrEqual(150);
		});

		it("should apply jitter (randomize delay)", async () => {
			const delays: number[] = [];

			for (let i = 0; i < 5; i++) {
				let callCount = 0;
				const attempts: number[] = [];

				const failingEffect = Effect.gen(function* () {
					attempts.push(Date.now());
					callCount++;
					if (callCount < 2) {
						return yield* Effect.fail(new Error("ETIMEDOUT"));
					}
					return "success";
				});

				await Effect.runPromise(
					withRetry(failingEffect, {
						maxRetries: 2,
						initialDelayMs: 100,
						useJitter: true,
					})
				);

				delays.push(attempts[1] - attempts[0]);
			}

			const uniqueDelays = new Set(delays);
			expect(uniqueDelays.size).toBeGreaterThan(1);

			for (const delay of delays) {
				expect(delay).toBeGreaterThanOrEqual(0);
				expect(delay).toBeLessThanOrEqual(110);
			}
		});

		it("should cap delay at maxDelayMs", async () => {
			let callCount = 0;
			const attempts: number[] = [];

			const failingEffect = Effect.gen(function* () {
				attempts.push(Date.now());
				callCount++;
				if (callCount < 5) {
					return yield* Effect.fail(new Error("ECONNREFUSED"));
				}
				return "success";
			});

			await Effect.runPromise(
				withRetry(failingEffect, {
					maxRetries: 5,
					initialDelayMs: 100,
					maxDelayMs: 500,
					useJitter: false,
				})
			);

			const delay3 = attempts[4] - attempts[3];
			expect(delay3).toBeGreaterThanOrEqual(400);
			expect(delay3).toBeLessThanOrEqual(600);
		});

		it("should allow custom backoff multiplier", async () => {
			const attempts: number[] = [];
			let callCount = 0;

			const failingEffect = Effect.gen(function* () {
				attempts.push(Date.now());
				callCount++;
				if (callCount < 3) {
					return yield* Effect.fail(new Error("ECONNREFUSED"));
				}
				return "success";
			});

			await Effect.runPromise(
				withRetry(failingEffect, {
					maxRetries: 3,
					initialDelayMs: 100,
					backoffMultiplier: 3,
					useJitter: false,
				})
			);

			const delay1 = attempts[1] - attempts[0];
			const delay2 = attempts[2] - attempts[1];

			expect(delay1).toBeGreaterThanOrEqual(90);
			expect(delay1).toBeLessThanOrEqual(110);
			expect(delay2).toBeGreaterThanOrEqual(290);
			expect(delay2).toBeLessThanOrEqual(310);
		});
	});

	describe("Error Classification", () => {
		it("should retry network errors (ECONNREFUSED)", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts < 2) {
					const error = new Error("ECONNREFUSED: Connection refused");
					return yield* Effect.fail(error);
				}
				return "success";
			});

			const result = await Effect.runPromise(
				withRetry(effect, { maxRetries: 3 })
			);
			expect(result).toBe("success");
			expect(attempts).toBe(2);
		});

		it("should retry ENOTFOUND network errors", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts < 2) {
					return yield* Effect.fail(new Error("ENOTFOUND: getaddrinfo"));
				}
				return "success";
			});

			const result = await Effect.runPromise(
				withRetry(effect, { maxRetries: 3 })
			);
			expect(result).toBe("success");
			expect(attempts).toBe(2);
		});

		it("should retry ETIMEDOUT errors", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts < 2) {
					return yield* Effect.fail(new Error("ETIMEDOUT: Connection timeout"));
				}
				return "success";
			});

			const result = await Effect.runPromise(
				withRetry(effect, { maxRetries: 3 })
			);
			expect(result).toBe("success");
			expect(attempts).toBe(2);
		});

		it("should retry ECONNRESET errors", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts < 2) {
					return yield* Effect.fail(new Error("ECONNRESET: Connection reset"));
				}
				return "success";
			});

			const result = await Effect.runPromise(
				withRetry(effect, { maxRetries: 3 })
			);
			expect(result).toBe("success");
			expect(attempts).toBe(2);
		});

		it("should retry 429 rate limit errors", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts < 2) {
					return yield* Effect.fail({
						status: 429,
						message: "Too Many Requests",
					});
				}
				return "success";
			});

			const result = await Effect.runPromise(
				withRetry(effect, { maxRetries: 3 })
			);
			expect(result).toBe("success");
			expect(attempts).toBe(2);
		});

		it("should retry 408 timeout errors", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts < 2) {
					return yield* Effect.fail({ status: 408, message: "Request Timeout" });
				}
				return "success";
			});

			const result = await Effect.runPromise(
				withRetry(effect, { maxRetries: 3 })
			);
			expect(result).toBe("success");
			expect(attempts).toBe(2);
		});

		it("should retry 5xx server errors", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts < 2) {
					return yield* Effect.fail({
						status: 503,
						message: "Service Unavailable",
					});
				}
				return "success";
			});

			const result = await Effect.runPromise(
				withRetry(effect, { maxRetries: 3 })
			);
			expect(result).toBe("success");
			expect(attempts).toBe(2);
		});

		it("should NOT retry 401 authentication errors", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts > 1) {
					return "should not reach";
				}
				const error = Object.assign(new Error("Unauthorized"), {
					status: 401,
				});
				return yield* Effect.fail(error);
			});

			await expect(
				Effect.runPromise(withRetry(effect, { maxRetries: 3, initialDelayMs: 10 }))
			).rejects.toThrow();

			expect(attempts).toBe(1);
		});

		it("should NOT retry 403 forbidden errors", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts > 1) {
					return "should not reach";
				}
				const error = Object.assign(new Error("Forbidden"), {
					status: 403,
				});
				return yield* Effect.fail(error);
			});

			await expect(
				Effect.runPromise(withRetry(effect, { maxRetries: 3, initialDelayMs: 10 }))
			).rejects.toThrow();

			expect(attempts).toBe(1);
		});

		it("should NOT retry 400 bad request errors", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts > 1) {
					return "should not reach";
				}
				const error = Object.assign(new Error("Bad Request"), {
					status: 400,
				});
				return yield* Effect.fail(error);
			});

			await expect(
				Effect.runPromise(withRetry(effect, { maxRetries: 3, initialDelayMs: 10 }))
			).rejects.toThrow();

			expect(attempts).toBe(1);
		});

		it("should NOT retry generic client errors", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts > 1) {
					return "should not reach here";
				}
				return yield* Effect.fail(
					Object.assign(new Error("Client error"), {
						status: 404,
						message: "Not Found",
					})
				);
			});

			await expect(
				Effect.runPromise(withRetry(effect, { maxRetries: 3, initialDelayMs: 10 }))
			).rejects.toThrow();

			expect(attempts).toBe(1);
		});
	});

	describe("Max Retries Enforcement", () => {
		it("should stop after maxRetries", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				return yield* Effect.fail(new Error("ETIMEDOUT"));
			});

			await expect(
				Effect.runPromise(
					withRetry(effect, { maxRetries: 3, initialDelayMs: 10 })
				)
			).rejects.toThrow("ETIMEDOUT");

			expect(attempts).toBe(4);
		});

		it("should propagate final error", async () => {
			const effect = Effect.fail(new Error("Final error message"));

			await expect(
				Effect.runPromise(
					withRetry(effect, { maxRetries: 2, initialDelayMs: 10 })
				)
			).rejects.toThrow("Final error message");
		});

		it("should succeed on first attempt when no error", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				return "success";
			});

			const result = await Effect.runPromise(
				withRetry(effect, { maxRetries: 3 })
			);

			expect(result).toBe("success");
			expect(attempts).toBe(1);
		});

		it("should succeed on last retry attempt", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts < 4) {
					return yield* Effect.fail(new Error("ECONNREFUSED"));
				}
				return "success";
			});

			const result = await Effect.runPromise(
				withRetry(effect, {
					maxRetries: 3,
					initialDelayMs: 10,
				})
			);

			expect(result).toBe("success");
			expect(attempts).toBe(4);
		});
	});

	describe("Verbose Mode", () => {
		it("should log retry attempts when verbose=true", async () => {
			const capture = captureConsole();

			try {
				let attempts = 0;
				const effect = Effect.gen(function* () {
					attempts++;
					if (attempts < 3) {
						return yield* Effect.fail(new Error("ECONNREFUSED"));
					}
					return "success";
				});

				await Effect.runPromise(
					withRetry(effect, {
						maxRetries: 3,
						verbose: true,
						initialDelayMs: 10,
					})
				);

				const allOutput = capture.logs.join("\n");
				expect(allOutput).toContain("Retry attempt");
			} finally {
				capture.restore();
			}
		});

		it("should NOT log when verbose=false (default)", async () => {
			const capture = captureConsole();

			try {
				let attempts = 0;
				const effect = Effect.gen(function* () {
					attempts++;
					if (attempts < 2) {
						return yield* Effect.fail(new Error("ECONNREFUSED"));
					}
					return "success";
				});

				await Effect.runPromise(
					withRetry(effect, {
						maxRetries: 3,
						verbose: false,
						initialDelayMs: 10,
					})
				);

				const hasRetryLog = capture.logs.some((line) => line.includes("Retry attempt"));
				expect(hasRetryLog).toBe(false);
			} finally {
				capture.restore();
			}
		});
	});

	describe("Helper Functions", () => {
		it("should use default retry with retry()", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts < 2) {
					return yield* Effect.fail(new Error("ECONNREFUSED"));
				}
				return "success";
			});

			const result = await Effect.runPromise(retry(effect));

			expect(result).toBe("success");
			expect(attempts).toBe(2);
		});

		it("should support retryN with custom count", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts < 5) {
					return yield* Effect.fail(new Error("ECONNREFUSED"));
				}
				return "success";
			});

			const result = await Effect.runPromise(retryN(effect, 5));

			expect(result).toBe("success");
			expect(attempts).toBe(5);
		});

		it("should support retryVerbose with logging", async () => {
			const capture = captureConsole();

			try {
				let attempts = 0;
				const effect = Effect.gen(function* () {
					attempts++;
					if (attempts < 2) {
						return yield* Effect.fail(new Error("ECONNREFUSED"));
					}
					return "success";
				});

				await Effect.runPromise(retryVerbose(effect, 3));

				const hasRetryLog = capture.logs.some((line) => line.includes("Retry attempt"));
				expect(hasRetryLog).toBe(true);
			} finally {
				capture.restore();
			}
		});
	});

	describe("Edge Cases", () => {
		it("should handle zero maxRetries (immediate failure)", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				return yield* Effect.fail(new Error("ECONNREFUSED"));
			});

			await expect(
				Effect.runPromise(
					withRetry(effect, { maxRetries: 0, initialDelayMs: 10 })
				)
			).rejects.toThrow();

			expect(attempts).toBe(1);
		});

		it("should handle very large delay values", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts < 2) {
					return yield* Effect.fail(new Error("ECONNREFUSED"));
				}
				return "success";
			});

			const start = Date.now();
			await Effect.runPromise(
				withRetry(effect, {
					maxRetries: 2,
					initialDelayMs: 100,
					maxDelayMs: 1000000,
					useJitter: false,
				})
			);
			const duration = Date.now() - start;

			expect(duration).toBeLessThan(200);
		});

		it("should handle successive failures with different error types", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts === 1) {
					return yield* Effect.fail(new Error("ECONNREFUSED"));
				} else if (attempts === 2) {
					return yield* Effect.fail({ status: 503 });
				}
				return "success";
			});

			const result = await Effect.runPromise(
				withRetry(effect, {
					maxRetries: 5,
					initialDelayMs: 10,
				})
			);

			expect(result).toBe("success");
			expect(attempts).toBe(3);
		});
	});
});
