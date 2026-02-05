/**
 * Tier Access Tests
 *
 * Tests for tier-based endpoint access validation.
 */

import { Effect } from "effect";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import {
	validateTierAccess,
	isTierAccessError,
	withTierValidation,
} from "../tierAccess";
import { TierAccessError } from "../../errors";
import { MCPTierService } from "../../services/tier";

/**
 * Create a mock NextRequest for testing
 */
function createMockRequest(url: string): NextRequest {
	return new NextRequest(url);
}

describe("Tier Access", () => {
	const prevTierMode = process.env.TIER_MODE;

	beforeAll(() => {
		// Set to free tier for testing
		process.env.TIER_MODE = "free";
	});

	afterAll(() => {
		if (prevTierMode !== undefined) {
			process.env.TIER_MODE = prevTierMode;
		} else {
			delete process.env.TIER_MODE;
		}
	});

	describe("validateTierAccess", () => {
		it("should allow access to free tier endpoints", async () => {
			const request = createMockRequest("http://localhost:3000/api/patterns");
			const result = await Effect.runPromise(
				validateTierAccess(request).pipe(
					Effect.provide(MCPTierService.Default)
				)
			);

			expect(result).toBeUndefined(); // Success - no error
		});

		it("should allow access to /api/health endpoint", async () => {
			const request = createMockRequest("http://localhost:3000/api/health");
			const result = await Effect.runPromise(
				validateTierAccess(request).pipe(
					Effect.provide(MCPTierService.Default)
				)
			);

			expect(result).toBeUndefined();
		});

		it("should allow access to /api/analyze-code endpoint", async () => {
			const request = createMockRequest(
				"http://localhost:3000/api/analyze-code"
			);
			const result = await Effect.runPromise(
				validateTierAccess(request).pipe(
					Effect.provide(MCPTierService.Default)
				)
			);

			expect(result).toBeUndefined();
		});

		it("should block access to paid tier endpoints in free tier", async () => {
			const request = createMockRequest(
				"http://localhost:3000/api/generate"
			);

			// Use Effect.either to get the error without throwing
			const result = await Effect.runPromise(
				validateTierAccess(request).pipe(
					Effect.provide(MCPTierService.Default),
					Effect.either
				)
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				const error = result.left;
				expect(isTierAccessError(error)).toBe(true);
				if (isTierAccessError(error)) {
					expect(error.endpoint).toBe("/api/generate");
					expect(error.tierMode).toBe("free");
					expect(error.message).toContain("not available");
					expect(error.upgradeMessage).toBeDefined();
				}
			}
		});

		it("should block access to /api/apply-refactoring in free tier", async () => {
			const request = createMockRequest(
				"http://localhost:3000/api/apply-refactoring"
			);

			// Use Effect.either to get the error without throwing
			const result = await Effect.runPromise(
				validateTierAccess(request).pipe(
					Effect.provide(MCPTierService.Default),
					Effect.either
				)
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				const error = result.left;
				expect(isTierAccessError(error)).toBe(true);
				if (isTierAccessError(error)) {
					expect(error.endpoint).toBe("/api/apply-refactoring");
					expect(error.tierMode).toBe("free");
				}
			}
		});

		it("should extract endpoint path correctly from URL with query params", async () => {
			const request = createMockRequest(
				"http://localhost:3000/api/patterns?q=error&limit=10"
			);
			const result = await Effect.runPromise(
				validateTierAccess(request).pipe(
					Effect.provide(MCPTierService.Default)
				)
			);

			// Should succeed - query params are ignored
			expect(result).toBeUndefined();
		});
	});

	describe("isTierAccessError", () => {
		it("should return true for TierAccessError instances", () => {
			const error = new TierAccessError({
				endpoint: "/api/test",
				tierMode: "free",
				message: "Test error",
				upgradeMessage: "Upgrade message",
			});

			expect(isTierAccessError(error)).toBe(true);
		});

		it("should return false for other error types", () => {
			const error = new Error("Regular error");
			expect(isTierAccessError(error)).toBe(false);

			const authError = { _tag: "AuthenticationError", message: "Auth failed" };
			expect(isTierAccessError(authError)).toBe(false);

			expect(isTierAccessError(null)).toBe(false);
			expect(isTierAccessError(undefined)).toBe(false);
			expect(isTierAccessError("string")).toBe(false);
		});
	});

	describe("withTierValidation", () => {
		it("should allow handler execution for allowed endpoints", async () => {
			const mockHandler = async (_request: NextRequest) => {
				return new Response(JSON.stringify({ success: true }), {
					status: 200,
				});
			};

			const wrappedHandler = withTierValidation(mockHandler);
			const request = createMockRequest("http://localhost:3000/api/patterns");

			const response = await wrappedHandler(request);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
		});

		it("should return 402 for blocked endpoints", async () => {
			const mockHandler = async (_request: NextRequest) => {
				return new Response(JSON.stringify({ success: true }), {
					status: 200,
				});
			};

			const wrappedHandler = withTierValidation(mockHandler);
			const request = createMockRequest("http://localhost:3000/api/generate");

			const response = await wrappedHandler(request);
			expect(response.status).toBe(402);
			expect(response.headers.get("X-Tier-Error")).toBe("feature-gated");

			const data = await response.json();
			expect(data.error).toBeDefined();
			expect(data.tier).toBe("free");
			expect(data.upgradeMessage).toBeDefined();
		});

		it("should re-throw non-tier errors", async () => {
			const mockHandler = async (_request: NextRequest) => {
				throw new Error("Handler error");
			};

			const wrappedHandler = withTierValidation(mockHandler);
			const request = createMockRequest("http://localhost:3000/api/patterns");

			await expect(wrappedHandler(request)).rejects.toThrow("Handler error");
		});

		it("should include availableFeatures for /api/patterns endpoint errors", async () => {
			const mockHandler = async (_request: NextRequest) => {
				return new Response(JSON.stringify({ success: true }), {
					status: 200,
				});
			};

			const wrappedHandler = withTierValidation(mockHandler);
			// Test with /api/generate (paid tier endpoint)
			const request = createMockRequest("http://localhost:3000/api/generate");

			const response = await wrappedHandler(request);
			expect(response.status).toBe(402);
			
			const data = await response.json();
			expect(data.error).toContain("/api/generate");
			expect(data.tier).toBe("free");
			expect(data.upgradeMessage).toBeDefined();
			// availableFeatures is only set for /api/patterns endpoint errors
			// For /api/generate, it should be an empty array
			expect(Array.isArray(data.availableFeatures)).toBe(true);
		});
	});
});
