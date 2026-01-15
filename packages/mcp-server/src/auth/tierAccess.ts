/**
 * Tier Access Middleware
 *
 * Validates endpoint access based on current tier configuration.
 * Returns 402 Payment Required for features not available in current tier.
 */

import { Effect } from "effect";
import type { NextRequest } from "next/server";
import { TierAccessError } from "../errors";
import { MCPTierService } from "../services/tier";

/**
 * Extract endpoint path from request
 *
 * Removes query parameters and normalizes dynamic routes
 */
function extractEndpointPath(request: NextRequest): string {
	const url = new URL(request.url);
	return url.pathname;
}

/**
 * Validate tier access for endpoint
 *
 * @param request - Next.js request object
 * @returns Effect that succeeds if endpoint is allowed, fails otherwise
 */
export const validateTierAccess = (
	request: NextRequest
): Effect.Effect<void, TierAccessError, MCPTierService> =>
	Effect.gen(function* () {
		const tier = yield* MCPTierService;
		const endpoint = extractEndpointPath(request);

		// Check if endpoint is allowed for current tier
		const isAllowed = yield* tier.isEndpointAllowed(endpoint);

		if (!isAllowed) {
			const upgradeMessage = yield* tier.getUpgradeMessage();
			const tierMode = yield* tier.getTierMode();

			return yield* Effect.fail(
				new TierAccessError({
					endpoint,
					tierMode,
					message: `Endpoint '${endpoint}' is not available in ${tierMode} tier. ${upgradeMessage}`,
					upgradeMessage,
				})
			);
		}

		// Success - endpoint is allowed
		return;
	});

/**
 * Check if tier access error and get appropriate HTTP status
 */
export function isTierAccessError(
	error: unknown
): error is TierAccessError {
	return (
		typeof error === "object" &&
		error !== null &&
		"_tag" in error &&
		error._tag === "TierAccessError"
	);
}

/**
 * Create tier-aware middleware handler
 *
 * Wraps existing handlers with tier validation
 */
export function withTierValidation<T extends any[]>(
	handler: (request: NextRequest, ...args: T) => Promise<Response>
) {
	return async (request: NextRequest, ...args: T): Promise<Response> => {
		try {
			// First validate tier access
			await Effect.runPromise(
				validateTierAccess(request).pipe(
					Effect.provide(MCPTierService.Default)
				)
			);

			// If tier validation passes, call the original handler
			return await handler(request, ...args);
		} catch (error) {
			if (isTierAccessError(error)) {
				// Return 402 Payment Required with upgrade message
				return new Response(
					JSON.stringify({
						error: error.message,
						tier: error.tierMode,
						upgradeMessage: error.upgradeMessage,
						availableFeatures: error.endpoint.includes("/api/patterns")
							? ["Pattern Search", "Pattern Retrieval", "Read-Only Analysis"]
							: [],
					}),
					{
						status: 402,
						headers: {
							"Content-Type": "application/json",
							"X-Tier-Error": "feature-gated",
						},
					}
				);
			}

			// Re-throw other errors
			throw error;
		}
	};
}
