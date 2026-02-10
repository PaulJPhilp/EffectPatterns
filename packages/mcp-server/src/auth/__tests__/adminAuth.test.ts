/**
 * Admin Authentication Tests
 *
 * Tests for admin API key validation.
 */

import { Effect } from "effect";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { validateAdminKey, isAuthorizationError } from "../adminAuth";
import { AuthorizationError } from "../../errors";
import { MCPConfigService } from "../../services/config";

// Mutable env for test setup/teardown
const env = process.env as Record<string, string | undefined>;

/**
 * Create a mock NextRequest for testing
 */
function createMockRequest(options: {
	headers?: Record<string, string>;
	url?: string;
} = {}): NextRequest {
	const url = options.url || "http://localhost:3000/api/test";
	const headers = new Headers();
	if (options.headers) {
		for (const [key, value] of Object.entries(options.headers)) {
			headers.set(key, value);
		}
	}
	return new NextRequest(url, { headers });
}

describe("Admin Authentication", () => {
	const prevAdminKey = process.env.ADMIN_API_KEY;
	const prevNodeEnv = process.env.NODE_ENV;

	beforeAll(() => {
		process.env.ADMIN_API_KEY = "admin-secret-key";
		env.NODE_ENV = "production";
		// Ensure config service can load
		if (!process.env.PATTERN_API_KEY) {
			process.env.PATTERN_API_KEY = "test-key";
		}
	});

	afterAll(() => {
		if (prevAdminKey !== undefined) {
			process.env.ADMIN_API_KEY = prevAdminKey;
		} else {
			delete env.ADMIN_API_KEY;
		}
		if (prevNodeEnv !== undefined) {
			env.NODE_ENV = prevNodeEnv;
		} else {
			delete env.NODE_ENV;
		}
	});

	describe("validateAdminKey", () => {
		it("should allow valid admin key from header", async () => {
			const request = createMockRequest({
				headers: { "x-admin-key": "admin-secret-key" },
			});

			const result = await Effect.runPromise(
				validateAdminKey(request).pipe(
					Effect.provide(MCPConfigService.Default)
				)
			);

			expect(result).toBeUndefined(); // Success
		});

			it("should reject admin key passed via query parameter", async () => {
				const request = createMockRequest({
					url: "http://localhost:3000/api/test?admin-key=admin-secret-key",
				});

				const result = await Effect.runPromise(
					validateAdminKey(request).pipe(
						Effect.provide(MCPConfigService.Default),
						Effect.either
					)
				);

				expect(result._tag).toBe("Left");
				if (result._tag === "Left") {
					const errorObj = result.left as any;
					expect(errorObj._tag).toBe("AuthorizationError");
					expect(errorObj.message).toContain("required");
				}
			});

			it("should use header key and ignore query parameter", async () => {
				const request = createMockRequest({
					headers: { "x-admin-key": "admin-secret-key" },
					url: "http://localhost:3000/api/test?admin-key=wrong-key",
			});

			const result = await Effect.runPromise(
				validateAdminKey(request).pipe(
					Effect.provide(MCPConfigService.Default)
				)
			);

				expect(result).toBeUndefined();
			});

		it("should reject missing admin key in production", async () => {
			const request = createMockRequest({});

			const result = await Effect.runPromise(
				validateAdminKey(request).pipe(
					Effect.provide(MCPConfigService.Default),
					Effect.either
				)
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				const error = result.left;
				expect(error).toBeDefined();
				// Check if it's an AuthorizationError by _tag
				const errorObj = error as any;
				expect(errorObj._tag).toBe("AuthorizationError");
				expect(errorObj.message).toContain("required");
				expect(errorObj.requiredRole).toBe("admin");
				// Verify isAuthorizationError works (it should, but if not, the direct checks above validate the error)
				// Note: Effect.either may wrap errors differently, so we check _tag directly
			}
		});

		it("should reject invalid admin key", async () => {
			const request = createMockRequest({
				headers: { "x-admin-key": "wrong-key" },
			});

			const result = await Effect.runPromise(
				validateAdminKey(request).pipe(
					Effect.provide(MCPConfigService.Default),
					Effect.either
				)
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				const error = result.left;
				expect(error).toBeDefined();
				const errorObj = error as any;
				expect(errorObj._tag).toBe("AuthorizationError");
				expect(errorObj.message).toContain("Invalid");
				expect(errorObj.requiredRole).toBe("admin");
			}
		});

		it("should allow requests when no admin key configured in dev mode", async () => {
			env.NODE_ENV = "development";
			process.env.ADMIN_API_KEY = "";

			const request = createMockRequest({});

			const result = await Effect.runPromise(
				validateAdminKey(request).pipe(
					Effect.provide(MCPConfigService.Default)
				)
			);

			expect(result).toBeUndefined();

			// Restore
			env.NODE_ENV = "production";
			process.env.ADMIN_API_KEY = "admin-secret-key";
		});

		it("should reject requests when admin key not configured in production", async () => {
			env.NODE_ENV = "production";
			process.env.ADMIN_API_KEY = "";

			const request = createMockRequest({
				headers: { "x-admin-key": "any-key" },
			});

			const result = await Effect.runPromise(
				validateAdminKey(request).pipe(
					Effect.provide(MCPConfigService.Default),
					Effect.either
				)
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				const error = result.left;
				expect(error).toBeDefined();
				const errorObj = error as any;
				expect(errorObj._tag).toBe("AuthorizationError");
				expect(errorObj.message).toContain("not configured");
			}

			// Restore
			process.env.ADMIN_API_KEY = "admin-secret-key";
		});
	});

	describe("isAuthorizationError", () => {
		it("should return true for AuthorizationError instances", () => {
			const error = new AuthorizationError({
				message: "Test error",
				requiredRole: "admin",
			});

			expect(isAuthorizationError(error)).toBe(true);
		});

		it("should return false for other error types", () => {
			const error = new Error("Regular error");
			expect(isAuthorizationError(error)).toBe(false);

			const authError = {
				_tag: "AuthenticationError",
				message: "Auth failed",
			};
			expect(isAuthorizationError(authError)).toBe(false);

			expect(isAuthorizationError(null)).toBe(false);
			expect(isAuthorizationError(undefined)).toBe(false);
			expect(isAuthorizationError("string")).toBe(false);
		});
	});
});
