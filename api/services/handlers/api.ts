/**
 * Handlers service API
 */

import { Effect } from "effect";
import { ApiResponse, HealthCheckResponse } from "./types.js";

/**
 * Handlers service interface
 */
export interface HandlersService {
    /**
     * Health check handler
     */
    readonly healthHandler: () => Effect.Effect<
        HealthCheckResponse,
        never,
        never
    >;

    /**
     * Rules handler - returns all rules
     */
    readonly rulesHandler: () => Effect.Effect<ApiResponse, never, never>;

    /**
     * Single rule handler - returns rule by ID
     */
    readonly singleRuleHandler: (
        id: string,
    ) => Effect.Effect<ApiResponse, never, never>;
}
