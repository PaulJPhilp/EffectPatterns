/**
 * Vercel Serverless Function Handler for Pattern Server
 *
 * This adapts the Effect-based Pattern Server to work as a Vercel serverless function.
 * It handles incoming HTTP requests and routes them to the appropriate handlers.
 * Uses PostgreSQL database for all pattern and rule data.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Data, Effect, Schema } from "effect";
import { createDatabase } from "../packages/toolkit/src/db/client.js";
import { createEffectPatternRepository } from "../packages/toolkit/src/repositories/index.js";

const RULE_PATH_REGEX = /^\/api\/v1\/rules\/([^/]+)$/;
const HTTP_STATUS_OK = 200;
const HTTP_STATUS_NOT_FOUND = 404;

// --- SCHEMA DEFINITIONS ---

/**
 * Schema for API Rule response
 * 
 * Represents a pattern rule with metadata and content.
 * All fields except id, title, description, and content are optional.
 */
const RuleSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  skillLevel: Schema.optional(Schema.String),
  useCase: Schema.optional(Schema.Array(Schema.String)),
  content: Schema.String,
});

// --- ERROR TYPES ---

/**
 * Error thrown when database operations fail
 * @param cause - The underlying error from the database
 */
class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown;
}> { }

/**
 * Error thrown when a requested rule is not found
 * @param id - The rule ID that was not found
 */
class RuleNotFoundError extends Data.TaggedError("RuleNotFoundError")<{
  readonly id: string;
}> { }

// --- HELPER FUNCTIONS ---

/**
 * Load all rules from the database
 * 
 * Fetches all patterns that have a rule defined and transforms them
 * into the API response format.
 * 
 * @returns Effect containing array of rules with metadata
 * @throws DatabaseError if database connection fails
 */
const loadRulesFromDatabase = Effect.gen(function* () {
  const { db, close } = createDatabase();

  try {
    const repo = createEffectPatternRepository(db);
    const patterns = yield* Effect.promise(() => repo.findAll()).pipe(
      Effect.mapError((error) => new DatabaseError({ cause: error }))
    );

    // Filter patterns that have a rule defined
    const rules = patterns
      .filter((p) => p.rule && p.title)
      .map((p) => ({
        id: p.slug,
        title: p.title,
        description: p.summary || "",
        skillLevel: p.skillLevel,
        useCase: (p.useCases as string[]) || undefined,
        content: p.content || "",
      }));

    return rules;
  } finally {
    yield* Effect.promise(() => close());
  }
});

/**
 * Load a single rule by ID from the database
 * 
 * @param id - The pattern slug/ID to retrieve
 * @returns Effect containing the rule data
 * @throws RuleNotFoundError if pattern doesn't exist or has no rule
 * @throws DatabaseError if database connection fails
 */
const readRuleById = (id: string) =>
  Effect.gen(function* () {
    const { db, close } = createDatabase();

    try {
      const repo = createEffectPatternRepository(db);
      const pattern = yield* Effect.promise(() => repo.findBySlug(id)).pipe(
        Effect.mapError((error) => new DatabaseError({ cause: error }))
      );

      if (!pattern || !pattern.rule) {
        return yield* Effect.fail(new RuleNotFoundError({ id }));
      }

      return {
        id: pattern.slug,
        title: pattern.title,
        description: pattern.summary || "",
        skillLevel: pattern.skillLevel,
        useCase: (pattern.useCases as string[]) || undefined,
        content: pattern.content || "",
      };
    } finally {
      yield* Effect.promise(() => close());
    }
  });

// --- ROUTE HANDLERS ---

/**
 * Health check handler
 * 
 * Always succeeds with status "ok"
 */
const healthHandler = Effect.succeed({ status: "ok" });

/**
 * GET /api/v1/rules handler
 * 
 * Returns all patterns that have associated rules.
 * Validates response against RuleSchema.
 * 
 * @returns Effect containing array of rules or error response
 * - statusCode 200: Array of rule objects
 * - statusCode 500: Database error
 */
const rulesHandler = Effect.gen(function* () {
  const rulesResult = yield* Effect.either(
    Effect.gen(function* () {
      const rules = yield* loadRulesFromDatabase;
      const validated = yield* Schema.decodeUnknown(Schema.Array(RuleSchema))(
        rules
      );
      return validated;
    })
  );

  if (rulesResult._tag === "Left") {
    return {
      error: "Failed to load rules from database",
      statusCode: 500,
    };
  }

  return {
    data: rulesResult.right,
    statusCode: HTTP_STATUS_OK,
  };
});

/**
 * GET /api/v1/rules/{id} handler
 * 
 * Returns a single rule by ID (pattern slug).
 * Validates response against RuleSchema.
 * 
 * @param id - The pattern slug to retrieve
 * @returns Effect containing rule object or error response
 * - statusCode 200: Single rule object
 * - statusCode 404: Rule not found
 * - statusCode 500: Database error
 */
const singleRuleHandler = (id: string) =>
  Effect.gen(function* () {
    const ruleResult = yield* Effect.either(
      Effect.gen(function* () {
        const rule = yield* readRuleById(id);
        const validated = yield* Schema.decodeUnknown(RuleSchema)(rule);
        return validated;
      })
    );

    if (ruleResult._tag === "Left") {
      const error = ruleResult.left;

      if (error._tag === "RuleNotFoundError") {
        return {
          error: "Rule not found",
          statusCode: HTTP_STATUS_NOT_FOUND,
        };
      }

      return {
        error: "Failed to load rule from database",
        statusCode: 500,
      };
    }

    return {
      data: ruleResult.right,
      statusCode: HTTP_STATUS_OK,
    };
  });

// --- VERCEL HANDLER ---

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
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req;

  // Root route - API documentation
  if (url === "/") {
    return res.status(HTTP_STATUS_OK).json({
      name: "Effect Patterns API",
      version: "v1",
      description: "AI coding rules for Effect-TS patterns",
      repository: "https://github.com/PaulJPhilp/EffectPatterns",
      endpoints: {
        health: "/health",
        rules: {
          list: "/api/v1/rules",
          get: "/api/v1/rules/{id}",
        },
      },
    });
  }

  // Health check
  if (url === "/health") {
    const result = await Effect.runPromise(healthHandler);
    return res.status(HTTP_STATUS_OK).json(result);
  }

  // List all rules
  if (url === "/api/v1/rules") {
    const result = await Effect.runPromise(rulesHandler);
    if ("error" in result) {
      return res.status(result.statusCode).json({ error: result.error });
    }
    return res.status(HTTP_STATUS_OK).json(result.data);
  }

  // Get single rule by ID
  const ruleMatch = url?.match(RULE_PATH_REGEX);
  if (ruleMatch) {
    const id = ruleMatch[1];
    const result = await Effect.runPromise(singleRuleHandler(id));
    if ("error" in result) {
      return res.status(result.statusCode).json({ error: result.error });
    }
    return res.status(HTTP_STATUS_OK).json(result.data);
  }

  // 404 for unknown routes
  return res.status(HTTP_STATUS_NOT_FOUND).json({ error: "Not found" });
}
