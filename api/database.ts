/**
 * Database operations for the API
 */

import { Effect } from "effect";
import { createDatabase } from "../packages/toolkit/src/db/client.js";
import { createEffectPatternRepository } from "../packages/toolkit/src/repositories/index.js";
import { DatabaseError, RuleNotFoundError } from "./errors.js";

/**
 * Load all rules from the database
 *
 * Fetches all patterns that have a rule defined and transforms them
 * into the API response format.
 *
 * @returns Effect containing array of rules with metadata
 * @throws DatabaseError if database connection fails
 */
export const loadRulesFromDatabase = Effect.gen(function* () {
    const { db, close } = yield* Effect.acquireRelease(
        Effect.sync(() => createDatabase()),
        ({ close }) => Effect.promise(() => close()),
    );

    const repo = createEffectPatternRepository(db);
    const patterns = yield* Effect.promise(() => repo.findAll()).pipe(
        Effect.mapError((error) => new DatabaseError({ cause: error })),
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
});

/**
 * Load a single rule by ID from the database
 *
 * @param id - The pattern slug/ID to retrieve
 * @returns Effect containing the rule data
 * @throws RuleNotFoundError if pattern doesn't exist or has no rule
 * @throws DatabaseError if database connection fails
 */
export const readRuleById = (id: string) =>
    Effect.gen(function* () {
        const { db, close } = yield* Effect.acquireRelease(
            Effect.sync(() => createDatabase()),
            ({ close }) => Effect.promise(() => close()),
        );

        const repo = createEffectPatternRepository(db);
        const pattern = yield* Effect.promise(() => repo.findBySlug(id)).pipe(
            Effect.mapError((error) => new DatabaseError({ cause: error })),
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
    });
