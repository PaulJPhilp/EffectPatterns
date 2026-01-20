/**
 * API Testing Runtime
 *
 * Provides a managed runtime for API service tests with proper layer composition
 * and Scope dependency handling.
 */

import { Effect, Layer } from "effect";
import { DatabaseService } from "../../services/database/service.js";
import { HandlersService } from "../../services/handlers/service.js";

/**
 * Test layer for API services
 * Provides all necessary services for testing
 */
export const ApiTestLayer = Layer.mergeAll(
    DatabaseService.Default,
    HandlersService.Default,
);

/**
 * Helper function to run API tests with proper runtime
 * Handles Scope dependencies and provides all necessary services
 */
export const runApiTest = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.runPromise(Effect.scoped(Effect.provide(effect, ApiTestLayer)));
