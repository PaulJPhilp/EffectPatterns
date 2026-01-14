import { Effect } from "effect";
import type { FixId, RuleId } from "../tools/ids";

/**
 * Relative importance of a rule violation.
 */
export type RuleSeverity = "low" | "medium" | "high";

/**
 * High-level grouping for rules.
 */
export type RuleCategory =
	| "async"
	| "errors"
	| "validation"
	| "resources"
	| "dependency-injection"
	| "style";

/**
 * Canonical definition for a governed rule.
 */
export interface RuleDefinition {
	readonly id: RuleId;
	readonly title: string;
	readonly message: string;
	readonly severity: RuleSeverity;
	readonly category: RuleCategory;
	readonly fixIds: readonly FixId[];
}

/**
 * Definition for an automated fix.
 */
export interface FixDefinition {
	readonly id: FixId;
	readonly title: string;
	readonly description: string;
}

const Fixes: ReadonlyArray<FixDefinition> = [
	{
		id: "replace-node-fs",
		title: "Replace node:fs with @effect/platform",
		description: "Rewrites node:fs imports to @effect/platform.",
	},
	{
		id: "add-filter-or-fail-validator",
		title: "Add Effect.filterOrFail validator",
		description: "Adds a simple input validation helper.",
	},
	{
		id: "wrap-effect-map-callback",
		title: "Wrap Effect.map callback",
		description:
			"Rewrites Effect.map(myFn) to Effect.map((x) => myFn(x)) for clarity and consistency.",
	},
];

const Rules: ReadonlyArray<RuleDefinition> = [
	{
		id: "non-typescript",
		title: "Non-TypeScript input",
		message:
			"This analyzer is tuned for TypeScript/TSX. Results may be limited.",
		severity: "low",
		category: "style",
		fixIds: [],
	},
	{
		id: "async-await",
		title: "Prefer Effect over async/await",
		message:
			"Use Effect.tryPromise/Effect.promise (or Effect.gen) for async " +
			"operations so errors are tracked in the typed channel and effects " +
			"compose correctly.",
		severity: "high",
		category: "async",
		fixIds: [],
	},
	{
		id: "throw-in-effect-code",
		title: "Don't throw inside Effect code",
		message:
			"Throwing bypasses Effect's typed error channel. Prefer returning a " +
			"typed error via Effect.fail (or Effect.die only for unrecoverable " +
			"bugs).",
		severity: "high",
		category: "errors",
		fixIds: [],
	},
	{
		id: "try-catch-in-effect",
		title: "Prefer Effect.try/tryPromise over try/catch",
		message:
			"try/catch inside Effect logic often bypasses the typed error " +
			"channel. Prefer Effect.try/Effect.tryPromise and handle errors " +
			"via Effect.catchAll/Effect.match.",
		severity: "high",
		category: "errors",
		fixIds: [],
	},
	{
		id: "try-catch-boundary-ok",
		title: "try/catch is OK at HTTP boundaries",
		message:
			"try/catch in route handlers is reasonable. Consider mapping " +
			"tagged errors to HTTP responses consistently via a shared helper.",
		severity: "low",
		category: "errors",
		fixIds: [],
	},
	{
		id: "catch-log-and-swallow",
		title: "Don't log and swallow errors",
		message:
			"This catch block logs and then continues, which can hide failures. " +
			"Prefer returning a typed error via Effect.fail, or return " +
			"Option/Either explicitly if absence is expected.",
		severity: "high",
		category: "errors",
		fixIds: [],
	},
	{
		id: "node-fs",
		title: "Prefer @effect/platform FileSystem",
		message:
			"Replace Node.js fs usage with @effect/platform FileSystem service " +
			"for better testability and Effect integration.",
		severity: "medium",
		category: "resources",
		fixIds: ["replace-node-fs"],
	},
	{
		id: "missing-validation",
		title: "Add input validation",
		message:
			"Consider validating user-controlled inputs using Effect.filterOrFail " +
			"(or Schema.decodeUnknown) at the boundary.",
		severity: "high",
		category: "validation",
		fixIds: ["add-filter-or-fail-validator"],
	},
	{
		id: "effect-map-fn-reference",
		title: "Avoid passing function references to Effect.map",
		message:
			"Prefer an explicit callback: Effect.map((x) => myFn(x)). This improves " +
			"readability and makes parameter usage clear.",
		severity: "low",
		category: "style",
		fixIds: ["wrap-effect-map-callback"],
	},
	{
		id: "any-type",
		title: "Avoid any",
		message:
			"Replace `any` with specific types and/or @effect/schema schemas to " +
			"improve safety and inference.",
		severity: "high",
		category: "style",
		fixIds: [],
	},
	{
		id: "yield-star-non-effect",
		title: "yield* used on non-Effect value",
		message:
			"Some platform services (e.g. Path.dirname) are pure functions. " +
			"Avoid `yield*` when the method returns a plain value.",
		severity: "medium",
		category: "style",
		fixIds: [],
	},
];

/**
 * Service for managing and retrieving rules and fixes.
 */
export class RuleRegistryService extends Effect.Service<RuleRegistryService>()(
	"RuleRegistryService",
	{
		sync: () => {
			const listRules = () => Effect.succeed(Rules);
			const listFixes = () => Effect.succeed(Fixes);

			return {
				listRules,
				listFixes,
			};
		},
	}
) { }

/**
 * Default live layer for `RuleRegistryService`.
 */
export const RuleRegistryServiceLive = RuleRegistryService.Default;
