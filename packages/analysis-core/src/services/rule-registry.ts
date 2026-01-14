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
			"Rewrites Effect.map(myFn) to Effect.map((x) => myFn(x)) " +
			"for clarity and consistency.",
	},
	{
		id: "replace-context-tag",
		title: "Replace Context.Tag with Effect.Service",
		description:
			"Converts Context.Tag/Context.GenericTag to the modern " +
			"Effect.Service pattern.",
	},
	{
		id: "replace-promise-all",
		title: "Replace Promise.all with Effect.all",
		description:
			"Converts Promise.all([...]) to Effect.all([...]) for proper " +
			"Effect composition.",
	},
	{
		id: "replace-console-log",
		title: "Replace console.log with Effect logging",
		description:
			"Converts console.log/warn/error to Effect.log/logWarning/logError.",
	},
	{
		id: "add-schema-decode",
		title: "Add Schema.decodeUnknown validation",
		description:
			"Wraps external data parsing with Schema.decodeUnknown for " +
			"type-safe validation.",
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
	{
		id: "context-tag-anti-pattern",
		title: "Use Effect.Service instead of Context.Tag",
		message:
			"Context.Tag and Context.GenericTag are deprecated patterns. " +
			"Use Effect.Service for service definitions to get automatic " +
			"layer creation and better type inference.",
		severity: "high",
		category: "dependency-injection",
		fixIds: ["replace-context-tag"],
	},
	{
		id: "promise-all-in-effect",
		title: "Use Effect.all instead of Promise.all",
		message:
			"Promise.all bypasses Effect's error channel and concurrency " +
			"controls. Use Effect.all with { concurrency: 'unbounded' } " +
			"for parallel execution within Effect.",
		severity: "high",
		category: "async",
		fixIds: ["replace-promise-all"],
	},
	{
		id: "mutable-ref-in-effect",
		title: "Avoid mutable refs in Effect code",
		message:
			"Mutable variables (let) inside Effect.gen can cause subtle bugs. " +
			"Use Effect.Ref for managed mutable state or restructure to use " +
			"immutable patterns.",
		severity: "medium",
		category: "style",
		fixIds: [],
	},
	{
		id: "console-log-in-effect",
		title: "Use Effect logging instead of console",
		message:
			"console.log/warn/error bypass Effect's logging infrastructure. " +
			"Use Effect.log, Effect.logWarning, or Effect.logError for " +
			"structured, composable logging.",
		severity: "medium",
		category: "style",
		fixIds: ["replace-console-log"],
	},
	{
		id: "effect-runSync-unsafe",
		title: "Avoid Effect.runSync in production code",
		message:
			"Effect.runSync throws on async operations and bypasses proper " +
			"resource management. Use Effect.runPromise or provide effects " +
			"to a managed runtime instead.",
		severity: "high",
		category: "async",
		fixIds: [],
	},
	{
		id: "missing-error-channel",
		title: "Effect may fail but error type is never",
		message:
			"This Effect can fail at runtime but declares never as its error " +
			"type. Add proper error handling with Effect.catchAll or declare " +
			"the error type explicitly.",
		severity: "high",
		category: "errors",
		fixIds: [],
	},
	{
		id: "layer-provide-anti-pattern",
		title: "Provide layers at composition root",
		message:
			"Calling Layer.provide inside service implementations couples " +
			"services tightly. Provide layers at the application composition " +
			"root for better testability.",
		severity: "medium",
		category: "dependency-injection",
		fixIds: [],
	},
	{
		id: "effect-gen-no-yield",
		title: "Effect.gen without yield* is wasteful",
		message:
			"Effect.gen(function* () { return value }) can be simplified to " +
			"Effect.succeed(value). Use Effect.gen only when you need to " +
			"yield* other effects.",
		severity: "low",
		category: "style",
		fixIds: [],
	},
	{
		id: "schema-decode-unknown",
		title: "Use Schema.decodeUnknown for external data",
		message:
			"Parsing external data (JSON.parse, request.json()) without " +
			"validation is unsafe. Use Schema.decodeUnknown to validate " +
			"and type external inputs.",
		severity: "high",
		category: "validation",
		fixIds: ["add-schema-decode"],
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
