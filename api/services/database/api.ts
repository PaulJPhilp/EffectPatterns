/**
 * Database service API
 */

import { Effect } from "effect";
import { DatabaseError, RuleNotFoundError } from "./errors.js";
import { DatabasePattern } from "./types.js";

/**
 * Database service interface
 */
export interface DatabaseService {
    /**
     * Load all rules from the database
     */
    readonly loadRulesFromDatabase: () => Effect.Effect<
        DatabasePattern[],
        DatabaseError | RuleNotFoundError,
        never
    >;

    /**
     * Load a single rule by ID from the database
     */
    readonly readRuleById: (
        id: string,
    ) => Effect.Effect<DatabasePattern, DatabaseError | RuleNotFoundError, never>;
}
