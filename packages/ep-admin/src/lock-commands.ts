/**
 * Lock/unlock commands for entity validation
 * 
 * Lock entities to mark them as validated, unlock to allow modifications
 */

import {
	createApplicationPatternRepository,
	createDatabase,
	createEffectPatternRepository,
	createJobRepository,
} from "@effect-patterns/toolkit";
import { Args, Command, Options } from "@effect/cli";
import { Console, Effect } from "effect";
import { showError, showSuccess } from "./services/display.js";

// =============================================================================
// Shared Entity Operations
// =============================================================================

interface EntityResult {
	id: string;
	slug: string;
}

/**
 * Find an entity by slug or ID
 */
const findEntity = (
	repo: any,
	identifier: string,
	entityType: string
): Effect.Effect<EntityResult, Error> =>
	Effect.gen(function* () {
		// Try to find by slug first
		const existing = yield* Effect.tryPromise({
			try: () => repo.findBySlug(identifier),
			catch: (error) =>
				new Error(
					`Failed to search for ${entityType}: ${error instanceof Error ? error.message : String(error)}`
				),
		});

		if (!existing) {
			// Try to find by ID
			const byId = yield* Effect.tryPromise({
				try: () => repo.findById(identifier),
				catch: (error) =>
					new Error(
						`Failed to search for ${entityType} by ID: ${error instanceof Error ? error.message : String(error)}`
					),
			});
			if (!byId) {
				return yield* Effect.fail(
					new Error(`${entityType} "${identifier}" not found (tried as slug and ID)`)
				);
			}
			return { id: (byId as any).id, slug: (byId as any).slug };
		}
		return { id: (existing as any).id, slug: (existing as any).slug };
	});

/**
 * Perform lock/unlock operation on an entity
 */
const performEntityOperation = (
	repo: any,
	entityId: string,
	action: "lock" | "unlock",
	entityType: string
): Effect.Effect<any, Error> =>
	Effect.tryPromise({
		try: () => (action === "lock" ? repo.lock(entityId) : repo.unlock(entityId)),
		catch: (error) =>
			new Error(
				`Failed to ${action} ${entityType}: ${error instanceof Error ? error.message : String(error)}`
			),
	});

/**
 * Get repository for entity type
 */
const getRepository = (db: any, entityType: string) => {
	switch (entityType) {
		case "pattern":
		case "effect-pattern":
			return createEffectPatternRepository(db);
		case "application-pattern":
		case "ap":
			return createApplicationPatternRepository(db);
		case "job":
			return createJobRepository(db);
		default:
			return null;
	}
};

/**
 * Get entity display name
 */
const getEntityDisplayName = (entityType: string, slug: string): string => {
	switch (entityType) {
		case "pattern":
		case "effect-pattern":
			return `Pattern "${slug}"`;
		case "application-pattern":
		case "ap":
			return `Application pattern "${slug}"`;
		case "job":
			return `Job "${slug}"`;
		default:
			return `Entity "${slug}"`;
	}
};

/**
 * Generic entity operation handler
 */
const handleEntityOperation = (
	args: { identifier: string },
	options: { type: string },
	action: "lock" | "unlock"
) =>
	Effect.gen(function* () {
		let db: ReturnType<typeof createDatabase> | null = null;
		try {
			db = createDatabase();
			const entityType = options.type.toLowerCase();
			const repo = getRepository(db.db, entityType);

			if (!repo) {
				yield* showError(
					`Invalid entity type: ${options.type}. Must be one of: ` +
					`pattern, application-pattern, job`
				);
				return;
			}

			// Find the entity
			const entity = yield* findEntity(repo, args.identifier, entityType);
			const entityName = getEntityDisplayName(entityType, entity.slug);

			// Perform the operation
			const result = yield* performEntityOperation(repo, entity.id, action, entityType);

			if (!result) {
				yield* showError(`Failed to ${action} ${entityName}`);
				return;
			}

			// Show success
			const actionText = action === "lock" ? "locked (validated)" : "unlocked";
			yield* showSuccess(`${entityName} has been ${actionText}`);
			yield* Console.log(`  • Validated: ${result.validated ? "Yes" : "No"}`);
			if (action === "lock" && result.validatedAt) {
				yield* Console.log(
					`  • Validated at: ${result.validatedAt.toISOString()}`
				);
			}
		} catch (error) {
			yield* showError(
				`Database error: ${error instanceof Error ? error.message : String(error)}`
			);
			yield* Console.log(
				"\n💡 Tip: Make sure PostgreSQL is running and DATABASE_URL " +
				"is set correctly.\n"
			);
			throw error;
		} finally {
			if (db) {
				yield* Effect.tryPromise({
					try: () => db!.close(),
					catch: (error) => {
						console.error("Failed to close database connection:", error);
						return undefined;
					},
				});
			}
		}
	});

/**
 * admin:lock - Lock (validate) an entity
 */
export const lockCommand = Command.make("lock", {
	options: {
		type: Options.text("type").pipe(
			Options.withDescription(
				"Entity type: pattern, application-pattern, or job"
			),
			Options.withDefault("pattern")
		),
	},
	args: {
		identifier: Args.text({ name: "identifier" }),
	},
}).pipe(
	Command.withDescription(
		"Lock (validate) an entity to prevent modifications."
	),
	Command.withHandler(({ args, options }) => handleEntityOperation(args, options, "lock"))
);

/**
 * admin:unlock - Unlock (unvalidate) an entity
 */
export const unlockCommand = Command.make("unlock", {
	options: {
		type: Options.text("type").pipe(
			Options.withDescription(
				"Entity type: pattern, application-pattern, or job"
			),
			Options.withDefault("pattern")
		),
	},
	args: {
		identifier: Args.text({ name: "identifier" }),
	},
}).pipe(
	Command.withDescription(
		"Unlock (unvalidate) an entity to allow modifications again."
	),
	Command.withHandler(({ args, options }) => handleEntityOperation(args, options, "unlock"))
);
