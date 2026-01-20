/**
 * Vercel Serverless Function Handler for Pattern Server
 *
 * This adapts the Effect-based Pattern Server to work as a Vercel serverless function.
 * It handles incoming HTTP requests and routes them to the appropriate handlers.
 * Uses PostgreSQL database for all pattern and rule data.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Effect } from "effect";
import {
    API_DESCRIPTION,
    API_HEALTH,
    API_NAME,
    API_REPOSITORY,
    API_ROOT,
    API_RULES_BY_ID,
    API_RULES_LIST,
    API_VERSION,
    ERROR_NOT_FOUND,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_OK,
    RULE_PATH_REGEX,
} from "./constants.js";
import { healthHandler, rulesHandler, singleRuleHandler } from "./handlers.js";

// --- ROUTE MATCHING HELPERS ---

const RouteMatchers = {
    root: (url?: string) => url === API_ROOT,
    health: (url?: string) => url === API_HEALTH,
    rules: (url?: string) => url === API_RULES_LIST,
    ruleById: (url?: string) => url?.match(RULE_PATH_REGEX),
} as const;

// --- EFFECT-BASED HANDLERS ---

/**
 * Effect-based handler for health check
 */
const healthCheckHandler = Effect.gen(function* () {
    const result = yield* healthHandler;
    return { status: HTTP_STATUS_OK, data: result };
});

/**
 * Effect-based handler for listing all rules
 */
const listRulesHandler = Effect.gen(function* () {
    const result = yield* rulesHandler;
    if ("error" in result) {
        return { status: result.statusCode, data: { error: result.error } };
    }
    return { status: HTTP_STATUS_OK, data: result.data };
});

/**
 * Effect-based handler for getting a single rule by ID
 */
const getRuleByIdHandler = (id: string) =>
    Effect.gen(function* () {
        const result = yield* singleRuleHandler(id);
        if ("error" in result) {
            return { status: result.statusCode, data: { error: result.error } };
        }
        return { status: HTTP_STATUS_OK, data: result.data };
    });

/**
 * Main request handler for Vercel serverless function
 *
 * Routes HTTP requests to appropriate handlers based on URL:
 * - GET / - API documentation
 * - GET /health - Health check
 * - GET /api/v1/rules - List all rules
 * - GET /api/v1/rules/{id} - Get single rule by ID
 *
 * @param req - Vercel request object
 * @param res - Vercel response object
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
    const { url } = req;

    // Root route - API documentation
    if (RouteMatchers.root(url)) {
        return res.status(HTTP_STATUS_OK).json({
            name: API_NAME,
            version: API_VERSION,
            description: API_DESCRIPTION,
            repository: API_REPOSITORY,
            endpoints: {
                health: API_HEALTH,
                rules: {
                    list: API_RULES_LIST,
                    get: API_RULES_BY_ID,
                },
            },
        });
    }

    // Health check
    if (RouteMatchers.health(url)) {
        return Effect.runPromise(
            Effect.scoped(
                healthCheckHandler.pipe(
                    Effect.flatMap(({ status, data }) =>
                        Effect.sync(() => res.status(status).json(data)),
                    ),
                ),
            ),
        );
    }

    // List all rules
    if (RouteMatchers.rules(url)) {
        return Effect.runPromise(
            Effect.scoped(
                listRulesHandler.pipe(
                    Effect.flatMap(({ status, data }) =>
                        Effect.sync(() => res.status(status).json(data)),
                    ),
                ),
            ),
        );
    }

    // Get single rule by ID
    const ruleMatch = RouteMatchers.ruleById(url);
    if (ruleMatch) {
        const id = ruleMatch[1];
        return Effect.runPromise(
            Effect.scoped(
                getRuleByIdHandler(id).pipe(
                    Effect.flatMap(({ status, data }) =>
                        Effect.sync(() => res.status(status).json(data)),
                    ),
                ),
            ),
        );
    }

    // 404 for unknown routes
    return res.status(HTTP_STATUS_NOT_FOUND).json({ error: ERROR_NOT_FOUND });
}
