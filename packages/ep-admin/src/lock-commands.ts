/**
 * Lock/unlock commands for entity validation
 *
 * Lock entities to mark them as validated, unlock to allow modifications
 */

import {
    createApplicationPatternRepository,
    createDatabase,
    createEffectPatternRepository,
} from "@effect-patterns/toolkit";
import { Args, Command, Options } from "@effect/cli";
import { Effect } from "effect";
import { Display } from "./services/display/index.js";

// =============================================================================
// Shared Entity Operations
// =============================================================================

interface EntityResult {
	id: string;
	slug: string;
}

interface EntityRecord {
	id: string;
	slug: string;
}

interface Repository {
	findBySlug(slug: string): Promise<EntityRecord | null>;
	findById(id: string): Promise<EntityRecord | null>;
	lock(id: string): Promise<any>;
	unlock(id: string): Promise<any>;
}

/**
 * Find an entity by slug or ID
 */
const findEntity = (
	repo: Repository,
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
			return { id: byId.id, slug: byId.slug };
		}
		return { id: existing.id, slug: existing.slug };
	});

/**
 * Perform lock/unlock operation on an entity
 */
const performEntityOperation = (
	repo: Repository,
	entityId: string,
	action: "lock" | "unlock",
	entityType: string
): Effect.Effect<void, Error> =>
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
const getRepository = (db: any, entityType: string): Repository | null => {
	switch (entityType) {
		case "pattern":
		case "effect-pattern":
			return createEffectPatternRepository(db);
		case "application-pattern":
		case "ap":
			return createApplicationPatternRepository(db);
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
		default:
			return `Entity "${slug}"`;
	}
};

/**
 * Generic entity operation handler
 */
export const handleEntityOperation = (
	args: { identifier: string },
	options: { type: string },
	action: "lock" | "unlock"
) =>
	Effect.scoped(
		Effect.gen(function* () {
			const db = yield* Effect.try({
				try: () => createDatabase(),
				catch: (error) =>
					new Error(
						`Failed to create database connection: ${error instanceof Error ? error.message : String(error)}`
					),
			});
			yield* Effect.addFinalizer(() => Effect.promise(() => db.close()));

			const entityType = options.type.toLowerCase();
			const repo = getRepository(db.db, entityType);

			if (!repo) {
				yield* Display.showError(
					`Invalid entity type: ${options.type}. Must be one of: ` +
						`pattern, application-pattern`
				);
				return;
			}

			// Find the entity
			const entity = yield* findEntity(repo, args.identifier, entityType);
			const entityName = getEntityDisplayName(entityType, entity.slug);

			// Perform the operation
			yield* performEntityOperation(repo, entity.id, action, entityType);

			// Show success
			const actionText =
				action === "lock" ? "locked (validated)" : "unlocked";
			yield* Display.showSuccess(`${entityName} has been ${actionText}`);
		})
	).pipe(
		Effect.catchAll((error) =>
			Effect.gen(function* () {
				yield* Display.showError(
					`Database error: ${error instanceof Error ? error.message : String(error)}`
				);
				yield* Display.showText(
					"\n💡 Tip: Make sure PostgreSQL is running and DATABASE_URL " +
						"is set correctly.\n"
				);
				return Effect.fail(error);
			})
		)
	);

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
