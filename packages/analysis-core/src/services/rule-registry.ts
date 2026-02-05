import { Effect } from "effect";
import { ConfigService } from "../config/service";
import type { AnalysisConfig, ResolvedConfig, RuleLevel } from "../config/types";
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
	| "style"
	| "concurrency"
	| "platform"
	| "types";

/**
 * Canonical definition for a governed rule.
 *
 * - severity: impact (how bad is it if the rule is violated).
 * - defaultLevel: default enforcement (off | warn | error). Config overrides win.
 */
export interface RuleDefinition {
	readonly id: RuleId;
	readonly title: string;
	readonly message: string;
	readonly severity: RuleSeverity;
	/** Default enforcement level when no config override. Enables "recommended ruleset" as a product. */
	readonly defaultLevel: RuleLevel;
	readonly category: RuleCategory;
	readonly fixIds: readonly FixId[];
}

/**
 * How safe is this fix to apply automatically?
 * - safe: deterministic codemod, no semantic change intended
 * - review: likely correct but may change behavior; needs human confirmation
 * - risky: structural refactor; always require explicit approval
 */
export type FixSafety = "safe" | "review" | "risky";

/**
 * Mechanism used to apply the fix.
 * - codemod: pure AST transform, no LLM
 * - assisted: uses LLM constrained to produce a patch
 * - manual: no automation; guidance only
 */
export type FixKind = "codemod" | "assisted" | "manual";

/**
 * Definition for an automated fix. Safety is intrinsic to the fix, not the finding.
 */
export interface FixDefinition {
	readonly id: FixId;
	readonly title: string;
	readonly description: string;
	readonly safety: FixSafety;
	readonly kind: FixKind;
	/** If true, fix requires type-checker info to be applied correctly. */
	readonly requiresTypecheck?: boolean;
}

export interface RuleRegistryServiceApi {
	readonly listRules: (
		config?: AnalysisConfig
	) => Effect.Effect<readonly RuleDefinition[], never>;
	readonly listFixes: () => Effect.Effect<readonly FixDefinition[], never>;
	readonly getResolvedConfig: (
		config?: AnalysisConfig
	) => Effect.Effect<ResolvedConfig, never>;
}

const Fixes: ReadonlyArray<FixDefinition> = [
	{
		id: "replace-node-fs",
		title: "Replace node:fs with @effect/platform",
		description: "Replaces node:fs imports with @effect/platform services.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "add-filter-or-fail-validator",
		title: "Add Effect.filterOrFail validator",
		description: "Adds a simple input validation helper to the effect pipeline.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "wrap-effect-map-callback",
		title: "Wrap Effect.map callback",
		description:
			"Wraps Effect.map(myFn) in an explicit callback (x) => myFn(x) " +
			"for clarity and consistency.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-context-tag",
		title: "Replace Context.Tag with Effect.Service",
		description:
			"Converts Context.Tag and Context.GenericTag to the modern " +
			"Effect.Service pattern.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-promise-all",
		title: "Replace Promise.all with Effect.all",
		description:
			"Converts Promise.all([...]) to Effect.all([...]) for proper " +
			"Effect composition and interruption.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-console-log",
		title: "Replace console.log with Effect logging",
		description:
			"Converts console.log, warn, and error calls to Effect.log, logWarning, and logError.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "add-schema-decode",
		title: "Add Schema.decodeUnknown validation",
		description:
			"Wraps external data parsing with Schema.decodeUnknown for " +
			"type-safe validation.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "add-concurrency-limit",
		title: "Add concurrency limit to Effect.all",
		description:
			"Adds a concurrency limit to Effect.all calls to prevent unbounded parallelism.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "add-fiber-supervision",
		title: "Add fiber supervision or join strategy",
		description:
			"Adds proper fiber supervision, join, or interrupt strategy to fire-and-forget forks.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-blocking-calls",
		title: "Replace blocking calls with Effect.offload",
		description:
			"Wraps synchronous blocking operations in Effect.offload to prevent blocking the event loop.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "use-acquire-release",
		title: "Use acquireRelease for resource management",
		description:
			"Converts manual try/finally resource cleanup to the Effect.acquireRelease pattern.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "fix-scope-leak",
		title: "Scope resources to effect lifetime",
		description:
			"Ensures resources are properly scoped to the effect lifetime to prevent leaks.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-platform-imports",
		title: "Replace platform imports with portable alternatives",
		description:
			"Replaces node:fs and node:process imports with portable Effect services.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "add-effect-logging",
		title: "Add Effect logging infrastructure",
		description:
			"Adds Effect.log, logWarning, and logError in place of console logging for structured logs.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-any-with-types",
		title: "Replace any with proper types",
		description:
			"Adds proper type annotations and replaces any with specific domain types.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "remove-non-null-assertions",
		title: "Remove non-null assertions (!)",
		description:
			"Removes non-null assertions and replaces them with proper type guards or optional chaining.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "convert-default-to-named-exports",
		title: "Convert default exports to named exports",
		description:
			"Converts default exports to named exports for consistent import style across the project.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-yield-with-yield-star",
		title: "Replace yield with yield* in Effect.gen",
		description:
			"Converts yield effect statements to yield* effect for proper Effect execution.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-throw-with-effect-fail",
		title: "Replace throw with Effect.fail",
		description:
			"Converts throw statements inside Effect logic to Effect.fail calls with tagged errors.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-async-callbacks-with-effect",
		title: "Replace async callbacks with Effect functions",
		description:
			"Converts async callbacks in Effect combinators to Effect-returning functions.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "remove-or-die-outside-boundaries",
		title: "Remove orDie usage from non-boundary code",
		description:
			"Removes orDie and orDieWith usage from code that is not at an application boundary.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "add-logging-to-catchall",
		title: "Add logging to catchAll error handling",
		description:
			"Adds proper logging or telemetry to catchAll blocks that would otherwise swallow errors.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-effect-ignore",
		title: "Replace Effect.ignore with explicit handling",
		description:
			"Replaces Effect.ignore with explicit error handling, logging, or fallback logic.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-try-catch-with-effect-try",
		title: "Replace try/catch with Effect.try patterns",
		description:
			"Converts try/catch blocks inside Effect logic to Effect.try or Effect.tryPromise.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-promise-apis-with-effect",
		title: "Replace Promise APIs with Effect equivalents",
		description:
			"Converts Promise.all, .then, and .catch to Effect.all, Effect.map, and Effect.catchAll.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-generic-error-with-tagged",
		title: "Replace generic Error with tagged error types",
		description:
			"Converts Effect<A, Error> to Effect<A, TaggedError> for better error semantics.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "refactor-switch-to-tagged-union",
		title: "Convert switch statement to tagged union",
		description:
			"Converts large switch statements to tagged unions with pattern matching or handler maps.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-error-with-tagged-type",
		title: "Replace Error with tagged error type",
		description:
			"Converts generic Error types to domain-specific tagged error unions.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "normalize-error-shapes",
		title: "Normalize mixed error shapes",
		description:
			"Converts mixed error types (Error | string | number) to a single normalized tagged error model.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "preserve-error-structure",
		title: "Preserve error structure",
		description:
			"Preserves the error data structure instead of converting to a string early in the pipeline.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "wrap-error-with-context",
		title: "Wrap error with context",
		description:
			"Wraps caught errors with additional context while preserving the original error cause.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "propagate-errors-upward",
		title: "Move error propagation upward to boundaries",
		description:
			"Removes premature error catching to allow errors to propagate to appropriate boundaries.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "model-expected-states-as-data",
		title: "Model expected states as data",
		description:
			"Converts expected domain states from the error channel to data using Option or Either.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "use-effect-fail-for-domain-errors",
		title: "Use Effect.fail for domain errors",
		description:
			"Converts throw statements for domain errors to explicit Effect.fail calls.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "add-error-payload-fields",
		title: "Add error payload fields",
		description:
			"Adds context fields like ids, causes, and timestamps to tagged error definitions.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "narrow-unknown-error-type",
		title: "Handle unknown error type",
		description:
			"Replaces the unknown error channel with specific, narrowed error types.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "structure-error-propagation",
		title: "Structure error propagation",
		description:
			"Structures error modeling alongside logging for better observability and recovery.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "introduce-branded-types",
		title: "Introduce branded types for domain concepts",
		description:
			"Converts primitive types to branded types with explicit domain meaning and constraints.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-boolean-with-tagged-union",
		title: "Replace boolean flags with tagged unions",
		description:
			"Converts boolean flags to explicit tagged unions for better type safety and readability.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-magic-strings-with-union",
		title: "Replace magic strings with literal unions",
		description:
			"Converts magic string literals to typed literal unions defined in a central location.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "model-explicit-state-machine",
		title: "Model explicit state machine",
		description:
			"Converts implicit state logic to an explicit tagged state machine model.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "extract-domain-predicates",
		title: "Extract domain predicates",
		description:
			"Extracts domain logic from conditionals into named domain predicate functions.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "use-domain-specific-errors",
		title: "Use domain-specific error types",
		description:
			"Converts ad-hoc error strings to domain-specific tagged error types.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "structure-config-schema",
		title: "Structure config schema",
		description:
			"Structures overloaded config objects into schemas with validation and clear types.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "introduce-branded-ids",
		title: "Introduce branded IDs",
		description:
			"Converts raw string IDs to branded types with dedicated constructor functions.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "use-duration-abstraction",
		title: "Use Duration abstraction",
		description:
			"Converts number and Date time values to the Effect Duration abstraction.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "encode-domain-in-types",
		title: "Structure domain meaning in types",
		description:
			"Ensures domain meaning is encoded explicitly in types rather than relying on file structure.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "add-concurrency-limit-to-effect-all",
		title: "Add concurrency limit to Effect.all",
		description:
			"Adds a concurrency limit to Effect.all or replaces it with Effect.forEach.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "add-fiber-supervision-or-join",
		title: "Add fiber supervision or join",
		description:
			"Adds proper fiber supervision, join, or lifetime control to forked fibers.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-loop-fork-with-foreach",
		title: "Replace loop fork with Effect.forEach",
		description:
			"Replaces manual fork loops with Effect.forEach using concurrency control.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "handle-race-interruption",
		title: "Handle race interruption semantics",
		description:
			"Handles loser fibers in Effect.race scenarios to ensure proper resource cleanup.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "offload-blocking-work",
		title: "Offload blocking work",
		description:
			"Wraps blocking operations in Effect.blocking or offloads them to a separate thread pool.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "replace-promise-all-with-effect-all",
		title: "Replace Promise.all with Effect.all",
		description:
			"Converts Promise.all to Effect.all for proper interruption and supervision support.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "observe-fiber-results",
		title: "Provide observed fiber results",
		description:
			"Adds fiber.join or fiber.await to ensure forked fiber results are observed.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "add-retry-coordination",
		title: "Add retry coordination",
		description:
			"Adds coordination mechanisms to prevent retry storms in concurrent effects.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "use-ref-for-shared-state",
		title: "Use Ref for shared state",
		description:
			"Replaces mutable objects with Effect.Ref for safe concurrent state management.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "ensure-cancellation-awareness",
		title: "Ensure cancellation awareness",
		description:
			"Ensures inner effects properly handle interruption signals from timeouts.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "wrap-with-acquire-release",
		title: "Wrap with acquireRelease",
		description:
			"Wraps manual resource management with Effect.acquireRelease for guaranteed cleanup.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "return-scoped-effect",
		title: "Return scoped effect",
		description:
			"Returns an effect that manages the resource instead of returning the resource itself.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "bind-scope-to-lifetime",
		title: "Bind scope to lifetime",
		description:
			"Binds scope creation to the effect lifetime for automatic cleanup.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "move-resource-to-app-layer",
		title: "Move resource to app layer",
		description:
			"Moves long-lived resources from request scope to the application layer.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "convert-singleton-to-layer",
		title: "Convert singleton to layer",
		description:
			"Converts global singletons to Effect layers for better lifecycle management.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "remove-manual-close",
		title: "Remove manual close",
		description:
			"Removes explicit close calls in favor of automatic acquireRelease cleanup.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "scope-resources-before-run",
		title: "Scope resources before run",
		description:
			"Ensures all resources are properly scoped before running effects to prevent leaks.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "flatten-resource-acquisition",
		title: "Flatten resource acquisition",
		description:
			"Flattens nested acquireRelease blocks into composable resource layers.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "use-explicit-scope",
		title: "Use explicit scope",
		description:
			"Replaces Scope.global with explicit scope management for clear ownership.",
		safety: "safe",
		kind: "codemod",
	},
	{
		id: "add-layer-provision",
		title: "Add layer provision",
		description:
			"Adds missing layer provision to ensure effect requirements are satisfied.",
		safety: "safe",
		kind: "codemod",
	},
];

const Rules: ReadonlyArray<RuleDefinition> = [
	{
		id: "non-typescript",
		title: "Non-TypeScript input",
		message: "This analyzer is tuned for TypeScript/TSX. Results may be limited.",
		severity: "low",
		defaultLevel: "off",
		category: "style",
		fixIds: [],
	},
	{
		id: "async-await",
		title: "Prefer Effect over async/await",
		message: "Use Effect.tryPromise/Effect.promise (or Effect.gen) for async " +
			"operations so errors are tracked in the typed channel and effects " +
			"compose correctly.",
		severity: "high",
		defaultLevel: "error",
		category: "async",
		fixIds: ["replace-promise-apis-with-effect"],
	},
	{
		id: "throw-in-effect-code",
		title: "Don't throw inside Effect code",
		message: "Throwing bypasses Effect's typed error channel. Prefer returning a " +
			"typed error via Effect.fail (or Effect.die only for unrecoverable " +
			"bugs).",
		severity: "high",
		defaultLevel: "error",
		category: "errors",
		fixIds: ["replace-throw-with-effect-fail"],
	},
	{
		id: "try-catch-in-effect",
		title: "Prefer Effect.try/tryPromise over try/catch",
		message: "try/catch inside Effect logic often bypasses the typed error " +
			"channel. Prefer Effect.try/Effect.tryPromise and handle errors " +
			"via Effect.catchAll/Effect.match.",
		severity: "high",
		defaultLevel: "error",
		category: "errors",
		fixIds: ["replace-try-catch-with-effect-try"],
	},
	{
		id: "try-catch-boundary-ok",
		title: "try/catch is OK at HTTP boundaries",
		message: "try/catch in route handlers is reasonable. Consider mapping " +
			"tagged errors to HTTP responses consistently via a shared helper.",
		severity: "low",
		defaultLevel: "off",
		category: "errors",
		fixIds: [],
	},
	{
		id: "catch-log-and-swallow",
		title: "Don't log and swallow errors",
		message: "This catch block logs and then continues, which can hide failures. " +
			"Prefer returning a typed error via Effect.fail, or return " +
			"Option/Either explicitly if absence is expected.",
		severity: "high",
		defaultLevel: "error",
		category: "errors",
		fixIds: ["add-logging-to-catchall"],
	},
	{
		id: "node-fs",
		title: "Prefer @effect/platform FileSystem",
		message: "Replace Node.js fs usage with @effect/platform FileSystem service " +
			"for better testability and Effect integration.",
		severity: "medium",
		defaultLevel: "warn",
		category: "resources",
		fixIds: ["replace-node-fs"],
	},
	{
		id: "missing-validation",
		title: "Add input validation",
		message: "Consider validating user-controlled inputs using Effect.filterOrFail " +
			"(or Schema.decodeUnknown) at the boundary.",
		severity: "high",
		defaultLevel: "error",
		category: "validation",
		fixIds: ["add-filter-or-fail-validator"],
	},
	{
		id: "effect-map-fn-reference",
		title: "Avoid passing function references to Effect.map",
		message: "Prefer an explicit callback: Effect.map((x) => myFn(x)). This improves " +
			"readability and makes parameter usage clear.",
		severity: "low",
		defaultLevel: "warn",
		category: "style",
		fixIds: ["wrap-effect-map-callback"],
	},
	{
		id: "any-type",
		title: "Avoid any",
		message: "Replace `any` with specific types and/or @effect/schema schemas to " +
			"improve safety and inference.",
		severity: "high",
		defaultLevel: "error",
		category: "style",
		fixIds: ["replace-any-with-types"],
	},
	{
		id: "yield-star-non-effect",
		title: "yield* used on non-Effect value",
		message: "Some platform services (e.g. Path.dirname) are pure functions. " +
			"Avoid `yield*` when the method returns a plain value.",
		severity: "medium",
		defaultLevel: "warn",
		category: "style",
		fixIds: [],
	},
	{
		id: "context-tag-anti-pattern",
		title: "Use Effect.Service instead of Context.Tag",
		message: "Context.Tag and Context.GenericTag are deprecated patterns. " +
			"Use Effect.Service for service definitions to get automatic " +
			"layer creation and better type inference.",
		severity: "high",
		defaultLevel: "error",
		category: "dependency-injection",
		fixIds: ["replace-context-tag"],
	},
	{
		id: "promise-all-in-effect",
		title: "Use Effect.all instead of Promise.all",
		message: "Promise.all bypasses Effect's error channel and concurrency " +
			"controls. Use Effect.all with { concurrency: 'unbounded' } " +
			"for parallel execution within Effect.",
		severity: "high",
		defaultLevel: "error",
		category: "async",
		fixIds: ["replace-promise-all"],
	},
	{
		id: "mutable-ref-in-effect",
		title: "Avoid mutable refs in Effect code",
		message: "Mutable variables (let) inside Effect.gen can cause subtle bugs. " +
			"Use Effect.Ref for managed mutable state or restructure to use " +
			"immutable patterns.",
		severity: "medium",
		defaultLevel: "warn",
		category: "style",
		fixIds: ["use-ref-for-shared-state"],
	},
	{
		id: "console-log-in-effect",
		title: "Use Effect logging instead of console",
		message: "console.log/warn/error bypass Effect's logging infrastructure. " +
			"Use Effect.log, Effect.logWarning, or Effect.logError for " +
			"structured, composable logging.",
		severity: "medium",
		defaultLevel: "warn",
		category: "style",
		fixIds: ["replace-console-log"],
	},
	{
		id: "effect-runSync-unsafe",
		title: "Avoid Effect.runSync in production code",
		message: "Effect.runSync throws on async operations and bypasses proper " +
			"resource management. Use Effect.runPromise or provide effects " +
			"to a managed runtime instead.",
		severity: "high",
		defaultLevel: "error",
		category: "async",
		fixIds: ["scope-resources-before-run"],
	},
	{
		id: "missing-error-channel",
		title: "Effect may fail but error type is never",
		message: "This Effect can fail at runtime but declares never as its error " +
			"type. Add proper error handling with Effect.catchAll or declare " +
			"the error type explicitly.",
		severity: "high",
		defaultLevel: "error",
		category: "errors",
		fixIds: ["add-error-payload-fields"],
	},
	{
		id: "layer-provide-anti-pattern",
		title: "Provide layers at composition root",
		message: "Calling Layer.provide inside service implementations couples " +
			"services tightly. Provide layers at the application composition " +
			"root for better testability.",
		severity: "medium",
		defaultLevel: "warn",
		category: "dependency-injection",
		fixIds: [],
	},
	{
		id: "effect-gen-no-yield",
		title: "Effect.gen without yield* is wasteful",
		message: "Effect.gen(function* () { return value }) can be simplified to " +
			"Effect.succeed(value). Use Effect.gen only when you need to " +
			"yield* other effects.",
		severity: "low",
		defaultLevel: "warn",
		category: "style",
		fixIds: [],
	},
	{
		id: "schema-decode-unknown",
		title: "Use Schema.decodeUnknown for external data",
		message: "Parsing external data (JSON.parse, request.json()) without " +
			"validation is unsafe. Use Schema.decodeUnknown to validate " +
			"and type external inputs.",
		severity: "high",
		defaultLevel: "error",
		category: "validation",
		fixIds: ["add-schema-decode"],
	},
	// Effect-specific correctness (high value)
	{
		id: "effect-run-promise-boundary",
		title: "Effect.runPromise/Effect.runSync used outside boundary",
		message: "Effect.runPromise and Effect.runSync should only be used at application " +
			"boundaries (main, CLI, route handlers). In library code, prefer " +
			"composing effects and returning them to the caller.",
		severity: "high",
		defaultLevel: "error",
		category: "async",
		fixIds: ["scope-resources-before-run"],
	},
	{
		id: "throw-in-effect-pipeline",
		title: "Throw statement inside Effect pipeline",
		message: "Using 'throw new Error()' inside Effect.map/flatMap/gen callbacks bypasses " +
			"Effect's typed error channel. Use Effect.fail or Effect.die instead.",
		severity: "high",
		defaultLevel: "error",
		category: "errors",
		fixIds: ["replace-throw-with-effect-fail"],
	},
	{
		id: "swallow-failures-without-logging",
		title: "Effect failures swallowed without logging or typed fallback",
		message: "catchAll(() => Effect.succeed(...)) without logging or returning a typed " +
			"fallback result can hide failures. Either log the error or return " +
			"Option/Either to explicitly handle absence.",
		severity: "high",
		defaultLevel: "error",
		category: "errors",
		fixIds: ["add-logging-to-catchall"],
	},
	{
		id: "generic-error-type",
		title: "Effect<*, Error> used instead of tagged errors",
		message: "Using generic Error in the error channel loses type information. " +
			"Prefer Data.TaggedError or specific error types for better error handling.",
		severity: "medium",
		defaultLevel: "warn",
		category: "errors",
		fixIds: ["replace-generic-error-with-tagged"],
	},
	{
		id: "incorrect-promise-bridge",
		title: "Effect.promise/Effect.tryPromise used incorrectly",
		message: "Promise bridge usage may lose interruption/timeout semantics. " +
			"Ensure proper cancellation handling or use Effect.suspend for lazy evaluation.",
		severity: "medium",
		defaultLevel: "warn",
		category: "async",
		fixIds: ["replace-promise-apis-with-effect"],
	},
	// Concurrency & fiber hygiene
	{
		id: "fire-and-forget-fork",
		title: "Fiber fork without supervision or await strategy",
		message: "Fire-and-forget Effect.fork without Fiber.join, Fiber.interrupt, or proper " +
			"supervision can cause resource leaks and unhandled failures.",
		severity: "high",
		defaultLevel: "error",
		category: "concurrency",
		fixIds: ["add-fiber-supervision"],
	},
	{
		id: "unbounded-parallelism",
		title: "Effect.all without concurrency limit",
		message: "Effect.all with large arrays without concurrency limits can cause resource " +
			"exhaustion. Add { concurrency: n } or use Effect.forEachWithConcurrency.",
		severity: "medium",
		defaultLevel: "warn",
		category: "concurrency",
		fixIds: ["add-concurrency-limit"],
	},
	{
		id: "blocking-calls-in-effect",
		title: "Blocking synchronous calls inside Effect",
		message: "Synchronous filesystem/crypto/zlib work inside Effect blocks the event loop. " +
			"Use Effect.offload to move blocking operations to a separate thread pool.",
		severity: "medium",
		defaultLevel: "warn",
		category: "concurrency",
		fixIds: ["replace-blocking-calls"],
	},
	// Resource safety
	{
		id: "manual-resource-lifecycle",
		title: "Manual resource lifecycle instead of acquireRelease",
		message: "Manual try/finally resource cleanup in Effect context is error-prone. " +
			"Use Effect.acquireRelease for automatic resource management.",
		severity: "high",
		defaultLevel: "error",
		category: "resources",
		fixIds: ["use-acquire-release"],
	},
	{
		id: "leaking-scopes",
		title: "Resource scope leakage",
		message: "Creating Scope/resources without tying them to effect lifetime can cause " +
			"resource leaks. Use Effect.scoped or proper scope management.",
		severity: "medium",
		defaultLevel: "warn",
		category: "resources",
		fixIds: ["fix-scope-leak"],
	},
	// Platform boundary correctness
	{
		id: "node-platform-in-shared-code",
		title: "Node.js platform imports in shared code",
		message: "node:fs, node:process usage should be limited to Node boundary packages. " +
			"Use @effect/platform services for portable code.",
		severity: "high",
		defaultLevel: "error",
		category: "platform",
		fixIds: ["replace-platform-imports"],
	},
	{
		id: "console-log-in-effect-flow",
		title: "Console logging in Effect flows",
		message: "console.log inside Effect bypasses structured logging. " +
			"Use Effect.log/logWarning/logError for composable logging.",
		severity: "medium",
		defaultLevel: "warn",
		category: "style",
		fixIds: ["add-effect-logging"],
	},
	// TypeScript hygiene
	{
		id: "any-type-usage",
		title: "any type usage without narrowing",
		message: "Using any bypasses TypeScript's type checking. " +
			"Replace with specific types or Schema validation.",
		severity: "high",
		defaultLevel: "error",
		category: "types",
		fixIds: ["replace-any-with-types"],
	},
	{
		id: "unknown-without-narrowing",
		title: "unknown type without type guard narrowing",
		message: "unknown without type guards provides no safety. " +
			"Add type guards or Schema.decodeUnknown for validation.",
		severity: "medium",
		defaultLevel: "warn",
		category: "types",
		fixIds: ["add-schema-decode"],
	},
	{
		id: "non-null-assertions",
		title: "Non-null assertions (!) used",
		message: "Non-null assertions can cause runtime errors. " +
			"Use optional chaining or proper type guards instead.",
		severity: "medium",
		defaultLevel: "warn",
		category: "types",
		fixIds: ["remove-non-null-assertions"],
	},
	{
		id: "default-exports-in-core",
		title: "Default exports in library packages create inconsistent import styles",
		message: "Default exports in library packages create inconsistent import styles. " +
			"Use named exports for better tree-shaking and consistency.",
		severity: "low",
		defaultLevel: "warn",
		category: "style",
		fixIds: ["convert-default-to-named-exports"],
	},
	// Agent-friendly packaging anti-patterns
	{
		id: "duplicate-pattern-ids",
		title: "Duplicate pattern IDs detected",
		message: "Multiple patterns with the same ID found. This breaks agent lookup " +
			"and causes unpredictable behavior.",
		severity: "high",
		defaultLevel: "error",
		category: "style",
		fixIds: [], // No automated fix - requires manual resolution of duplicate IDs
	},
	{
		id: "unreachable-rule-declaration",
		title: "Rule declared but not registered",
		message: "Rule is exported but not included in the rule registry. " +
			"Add to Rules array to make it available for analysis.",
		severity: "medium",
		defaultLevel: "warn",
		category: "style",
		fixIds: [],
	},
	{
		id: "missing-rule-documentation",
		title: "Rule registered but missing documentation",
		message: "Rule exists in registry but lacks proper documentation. " +
			"Add description, examples, and fix information.",
		severity: "low",
		defaultLevel: "warn",
		category: "style",
		fixIds: [],
	},
	// Top 10 Effect Correctness Anti-Patterns
	{
		id: "run-effect-outside-boundary",
		title: "Running Effects Outside Boundaries",
		message: "Using Effect.runPromise, runSync, runFork inside library or business logic. " +
			"Breaks composability, makes testing difficult, and bypasses dependency injection. " +
			"Only use at CLI entrypoints, HTTP route handlers, main() functions, or scripts.",
		severity: "high",
		defaultLevel: "error",
		category: "async",
		fixIds: ["scope-resources-before-run"],
	},
	{
		id: "yield-instead-of-yield-star",
		title: "Using yield Instead of yield* in Effect.gen",
		message: "Using 'yield effect' instead of 'yield* effect' in Effect.gen. " +
			"'yield' returns the Effect value instead of executing it, leading to silent bugs. " +
			"This is one of the most common real-world Effect bugs.",
		severity: "high",
		defaultLevel: "error",
		category: "async",
		fixIds: ["replace-yield-with-yield-star"],
	},
	{
		id: "throw-inside-effect-logic",
		title: "Throwing Inside Effect Logic",
		message: "Using 'throw' inside Effect.gen or callbacks to map/flatMap/tap. " +
			"Bypasses the typed error channel and turns expected failures into defects. " +
			"Return Effect.fail(...) with tagged error types instead.",
		severity: "high",
		defaultLevel: "error",
		category: "errors",
		fixIds: ["replace-throw-with-effect-fail"],
	},
	{
		id: "async-callbacks-in-effect-combinators",
		title: "Async Callbacks Passed to Effect Combinators",
		message: "Using async callbacks in Effect.map, flatMap, tap etc. " +
			"Returns Promise instead of Effect, resulting in Effect<Promise<A>>. " +
			"Escapes Effect's interruption and error model. Use Effect-returning callbacks.",
		severity: "high",
		defaultLevel: "error",
		category: "async",
		fixIds: ["replace-async-callbacks-with-effect"],
	},
	{
		id: "or-die-outside-boundaries",
		title: "Using orDie/orDieWith Outside Boundaries",
		message: "Using orDie/orDieWith outside application boundaries. " +
			"Converts recoverable errors into defects, makes failures invisible to callers, " +
			"and breaks retry and fallback logic. Only use at application boundaries.",
		severity: "high",
		defaultLevel: "error",
		category: "errors",
		fixIds: ["remove-or-die-outside-boundaries"],
	},
	{
		id: "swallowing-errors-in-catchall",
		title: "Swallowing Errors in catchAll",
		message: "Using Effect.catchAll(() => Effect.succeed(...)) without logging or documentation. " +
			"Errors disappear silently, leading to corrupt state and making debugging impossible. " +
			"Add explicit logging/telemetry or clearly document the intent.",
		severity: "high",
		defaultLevel: "error",
		category: "errors",
		fixIds: ["add-logging-to-catchall"],
	},
	{
		id: "effect-ignore-on-failable-effects",
		title: "Using Effect.ignore on Failable Effects",
		message: "Using Effect.ignore on effects that can fail. " +
			"Silently discards failures and often hides bugs during refactors. " +
			"Use explicit error handling or logging instead.",
		severity: "medium",
		defaultLevel: "warn",
		category: "errors",
		fixIds: ["replace-effect-ignore"],
	},
	{
		id: "try-catch-inside-effect-logic",
		title: "Using try/catch Inside Effect Logic",
		message: "Using try/catch inside Effect callbacks or generators. " +
			"Duplicates Effect's error model, encourages imperative escape hatches, " +
			"and leads to inconsistent failure handling. Use Effect.try/Effect.tryPromise instead.",
		severity: "medium",
		defaultLevel: "warn",
		category: "errors",
		fixIds: ["replace-try-catch-with-effect-try"],
	},
	{
		id: "promise-apis-inside-effect-logic",
		title: "Promise APIs Used Inside Effect Logic",
		message: "Using Promise.all, .then, .catch, .finally inside Effect callbacks. " +
			"Bypasses interruption semantics, loses structured error handling, " +
			"and is harder to test and observe. Use Effect.all, Effect.map, Effect.catchAll instead.",
		severity: "medium",
		defaultLevel: "warn",
		category: "async",
		fixIds: ["replace-promise-apis-with-effect"],
	},
	{
		id: "public-apis-returning-generic-error",
		title: "Public APIs Returning Effect<*, Error>",
		message: "Public APIs returning Effect<*, Error> instead of tagged error types. " +
			"Generic Error carries no semantic meaning, makes migrations harder, " +
			"and weakens observability. Use tagged/domain-specific error types.",
		severity: "medium",
		defaultLevel: "warn",
		category: "errors",
		fixIds: ["replace-generic-error-with-tagged"],
	},
	// Design smell detectors
	{
		id: "large-switch-statement",
		title: "Large Switch Statement",
		message: "Large switch statements (≥5 cases) often indicate missing domain modeling or ad-hoc error routing. " +
			"In Effect code, this usually means: (1) hidden domain logic instead of modeled data, " +
			"(2) ad-hoc error routing instead of typed error handling, or (3) control flow doing work the type system should do. " +
			"Consider tagged unions with pattern matching, Effect combinators (catchTag, handler maps), or explicit domain modeling. " +
			"Severity escalates to HIGH if switching on error.name, error.message, or inside catchAll.",
		severity: "medium",
		defaultLevel: "warn",
		category: "style",
		fixIds: ["refactor-switch-to-tagged-union"],
	},
	// Error modeling anti-patterns
	{
		id: "error-as-public-type",
		title: "Using Error as Public Error Type",
		message: "Using generic Error as the public error type in Effect<Success, Error>. " +
			"Loses domain meaning, makes retries and recovery vague, breaks error-specific handling, and weakens observability. " +
			"Use tagged error unions or domain-specific error types instead.",
		severity: "medium",
		defaultLevel: "warn",
		category: "errors",
		fixIds: ["replace-error-with-tagged-type"],
	},
	{
		id: "mixed-error-shapes",
		title: "Mixing Multiple Error Shapes in One Effect",
		message: "Using mixed error types like Effect<Success, Error | string | number>. " +
			"Forces defensive programming everywhere, indicates missing normalization boundary, and makes pattern matching unreliable. " +
			"Normalize errors at boundaries and convert to a single tagged error model.",
		severity: "high",
		defaultLevel: "error",
		category: "errors",
		fixIds: ["normalize-error-shapes"],
	},
	{
		id: "convert-errors-to-strings-early",
		title: "Converting Errors to Strings Early",
		message: "Using Effect.fail(error.message) or converting errors to strings early. " +
			"Destroys structure, loses causal context, and makes tracing and metrics useless. " +
			"Preserve error data and attach human-readable messages later (UI/logging).",
		severity: "medium",
		defaultLevel: "warn",
		category: "errors",
		fixIds: ["preserve-error-structure"],
	},
	{
		id: "catch-and-rethrow-generic",
		title: "Catch-and-Rethrow with Generic Errors",
		message: "Using Effect.catchAll(() => Effect.fail(new Error('failed'))) pattern. " +
			"Loses original failure information, hides root causes, and breaks retries based on error type. " +
			"Wrap errors with context while preserving the original error as a cause.",
		severity: "high",
		defaultLevel: "error",
		category: "errors",
		fixIds: ["wrap-error-with-context"],
	},
	{
		id: "catching-errors-too-early",
		title: "Catching Errors Too Early",
		message: "Catching errors deep inside business logic instead of letting them propagate. " +
			"Prevents higher-level recovery strategies, forces decisions at the wrong layer, and reduces composability. " +
			"Let errors flow upward and handle them at meaningful boundaries.",
		severity: "medium",
		defaultLevel: "warn",
		category: "errors",
		fixIds: ["propagate-errors-upward"],
	},
	{
		id: "expected-states-as-errors",
		title: "Treating Expected Domain States as Errors",
		message: "Using Effect.fail('NotFound') or similar for expected domain states. " +
			"Overloads the error channel, makes control flow unclear, and encourages excessive catchAll. " +
			"Model expected states as data using Option, Either, or tagged results.",
		severity: "medium",
		defaultLevel: "warn",
		category: "errors",
		fixIds: ["model-expected-states-as-data"],
	},
	{
		id: "exceptions-for-domain-errors",
		title: "Using Exceptions for Domain Errors",
		message: "Using throw new DomainError(...) inside Effect logic. " +
			"Bypasses typed error channel, breaks observability, and escapes supervision. " +
			"Use Effect.fail(DomainError) to keep all failures in the error channel.",
		severity: "high",
		defaultLevel: "error",
		category: "errors",
		fixIds: ["use-effect-fail-for-domain-errors"],
	},
	{
		id: "error-tags-without-payloads",
		title: "Error Tags Without Payloads",
		message: "Defining error types with only _tag field like { _tag: 'MyError' }. " +
			"No context, no metadata, hard to debug in production. " +
			"Include relevant fields (ids, causes, timestamps) for better observability.",
		severity: "medium",
		defaultLevel: "warn",
		category: "errors",
		fixIds: ["add-error-payload-fields"],
	},
	{
		id: "overusing-unknown-error-channel",
		title: "Overusing unknown as Error Channel",
		message: "Using Effect<Success, unknown> as error channel type. " +
			"Forces downstream type assertions, indicates missing modeling, and makes safe recovery difficult. " +
			"Narrow error types as early as possible.",
		severity: "medium",
		defaultLevel: "warn",
		category: "errors",
		fixIds: ["narrow-unknown-error-type"],
	},
	{
		id: "logging-instead-of-modeling-errors",
		title: "Logging Errors Instead of Modeling Them",
		message: "Using Effect.tapError(e => Effect.log(e)) without structured error propagation. " +
			"Logging is not handling - errors still need meaning and shape. Logs disappear; types don't. " +
			"Log AND model - keep errors structured and observable.",
		severity: "medium",
		defaultLevel: "warn",
		category: "errors",
		fixIds: ["structure-error-propagation"],
	},
	// Domain modeling anti-patterns
	{
		id: "primitives-for-domain-concepts",
		title: "Using Primitives for Domain Concepts",
		message: "Using primitive types (number, string) for domain concepts like function transfer(amount: number, accountId: string). " +
			"Loses meaning and constraints, easy to mix up parameters, no place to enforce invariants. " +
			"Use branded types, small domain wrappers, or schemas for validation.",
		severity: "medium",
		defaultLevel: "warn",
		category: "validation",
		fixIds: ["introduce-branded-types"],
	},
	{
		id: "boolean-flags-controlling-behavior",
		title: "Boolean Flags Controlling Behavior",
		message: "Using boolean flags to control behavior like function process(user: User, isAdmin: boolean). " +
			"Creates hidden branches, poor readability, and hard to extend safely. " +
			"Use tagged unions or explicit modes/roles instead.",
		severity: "medium",
		defaultLevel: "warn",
		category: "style",
		fixIds: ["replace-boolean-with-tagged-union"],
	},
	{
		id: "magic-string-domains",
		title: "Magic String Domains",
		message: "Using magic string literals for domain states like if (status === 'approved'). " +
			"No exhaustiveness checking, easy to drift during refactors, usually wants a union or enum. " +
			"Use tagged unions or literal unions defined in one place.",
		severity: "medium",
		defaultLevel: "warn",
		category: "validation",
		fixIds: ["replace-magic-strings-with-union"],
	},
	{
		id: "objects-as-implicit-state-machines",
		title: "Objects Used as Implicit State Machines",
		message: "Using object properties as implicit state like if (order.cancelled && !order.shipped). " +
			"Allows impossible states, creates complex conditional logic, no compiler assistance. " +
			"Use explicit state models with tagged state transitions.",
		severity: "medium",
		defaultLevel: "warn",
		category: "validation",
		fixIds: ["model-explicit-state-machine"],
	},
	{
		id: "domain-logic-in-conditionals",
		title: "Domain Logic Embedded in Conditionals",
		message: "Embedding business rules in conditionals like if (x > 100 && y < 10 && mode !== 'test'). " +
			"Business rules are hidden, hard to test or reuse, encourages copy-paste logic. " +
			"Extract into named domain functions or explicit rules/predicates.",
		severity: "medium",
		defaultLevel: "warn",
		category: "style",
		fixIds: ["extract-domain-predicates"],
	},
	{
		id: "adhoc-error-semantics-in-domain",
		title: "Ad-Hoc Error Semantics in Domain Code",
		message: "Using ad-hoc error strings in domain code like Effect.fail('not allowed'). " +
			"Domain meaning is implicit, no structured recovery, difficult to observe or migrate. " +
			"Use domain-specific error types with tagged errors and payloads.",
		severity: "high",
		defaultLevel: "error",
		category: "errors",
		fixIds: ["use-domain-specific-errors"],
	},
	{
		id: "overloaded-config-objects",
		title: "Overloaded Config or Options Objects",
		message: "Using overloaded config objects like function createThing(opts: any). " +
			"Unclear required vs optional fields, silent misconfiguration, hard to validate. " +
			"Use structured config schemas with separate types for variants.",
		severity: "medium",
		defaultLevel: "warn",
		category: "validation",
		fixIds: ["structure-config-schema"],
	},
	{
		id: "domain-ids-as-raw-strings",
		title: "Domain Identifiers as Raw Strings Everywhere",
		message: "Using raw strings for domain IDs like type UserId = string across modules. " +
			"IDs are interchangeable by accident, no place to attach semantics. " +
			"Use branded IDs with constructor functions.",
		severity: "medium",
		defaultLevel: "warn",
		category: "validation",
		fixIds: ["introduce-branded-ids"],
	},
	{
		id: "time-as-number-or-date",
		title: "Time as number or Date in Domain Logic",
		message: "Using number or Date for time in domain logic like expiresAt: number. " +
			"Units unclear (ms? seconds?), arithmetic errors, time logic becomes brittle. " +
			"Use Duration or explicit time abstractions.",
		severity: "medium",
		defaultLevel: "warn",
		category: "validation",
		fixIds: ["use-duration-abstraction"],
	},
	{
		id: "domain-meaning-from-file-structure",
		title: "Domain Meaning Inferred from File Structure",
		message: "Encoding domain meaning implicitly by file location rather than types. " +
			"Hard to refactor, new contributors miss rules, tooling can't help. " +
			"Use explicit domain types and names that encode intent.",
		severity: "medium",
		defaultLevel: "warn",
		category: "style",
		fixIds: ["encode-domain-in-types"],
	},
	// Concurrency anti-patterns
	{
		id: "unbounded-parallelism-effect-all",
		title: "Unbounded Parallelism",
		message: "Using Effect.all(items.map(doWork)) without concurrency limits. " +
			"Can overwhelm services, no backpressure, memory spikes. " +
			"Use Effect.forEach(items, { concurrency: N }) or Effect.all with concurrency option.",
		severity: "high",
		defaultLevel: "error",
		category: "concurrency",
		fixIds: ["add-concurrency-limit-to-effect-all"],
	},
	{
		id: "fire-and-forget-forks",
		title: "Fire-and-Forget Forks",
		message: "Using Effect.fork(effect) without join, supervision, or lifetime control. " +
			"Leaks fibers, loses errors, hard to reason about shutdown. " +
			"Add fiber.join, fiber.await, or proper supervision.",
		severity: "high",
		defaultLevel: "error",
		category: "concurrency",
		fixIds: ["add-fiber-supervision-or-join"],
	},
	{
		id: "forking-inside-loops",
		title: "Forking Inside Loops",
		message: "Using Effect.fork inside for/while loops. " +
			"Explosive concurrency, almost always accidental. " +
			"Replace with Effect.forEach with concurrency control.",
		severity: "high",
		defaultLevel: "error",
		category: "concurrency",
		fixIds: ["replace-loop-fork-with-foreach"],
	},
	{
		id: "racing-without-handling-losers",
		title: "Racing Effects Without Handling Losers",
		message: "Using Effect.race(a, b) without understanding interruption semantics. " +
			"Loser fibers may hold resources, side effects may still run. " +
			"Ensure proper cleanup and understand interruption behavior.",
		severity: "high",
		defaultLevel: "error",
		category: "concurrency",
		fixIds: ["handle-race-interruption"],
	},
	{
		id: "blocking-calls-in-effect-logic",
		title: "Blocking Calls Inside Effect Logic",
		message: "Using synchronous blocking operations (filesystem, crypto, compression, CPU-heavy work) inside Effect. " +
			"Blocks the fiber pool, starves unrelated work. " +
			"Use Effect.blocking or offload to separate thread pool.",
		severity: "high",
		defaultLevel: "error",
		category: "concurrency",
		fixIds: ["offload-blocking-work"],
	},
	{
		id: "promise-concurrency-in-effect",
		title: "Using Promise Concurrency Instead of Effect",
		message: "Using Promise.all(...) inside Effect logic. " +
			"No interruption, no supervision, no structured error handling. " +
			"Replace with Effect.all for proper concurrency control.",
		severity: "medium",
		defaultLevel: "warn",
		category: "concurrency",
		fixIds: ["replace-promise-all-with-effect-all"],
	},
	{
		id: "ignoring-fiber-failures",
		title: "Ignoring Fiber Failures",
		message: "Forked fiber fails but result is never observed. " +
			"Silent data loss, debugging nightmare. " +
			"Add fiber.join or fiber.await to observe results.",
		severity: "medium",
		defaultLevel: "warn",
		category: "concurrency",
		fixIds: ["observe-fiber-results"],
	},
	{
		id: "retrying-concurrently-without-limits",
		title: "Retrying Concurrently Without Limits",
		message: "Retrying parallel effects without coordination. " +
			"Retry storms, thundering herd problems. " +
			"Add retry coordination mechanisms or exponential backoff.",
		severity: "high",
		defaultLevel: "error",
		category: "concurrency",
		fixIds: ["add-retry-coordination"],
	},
	{
		id: "shared-mutable-state-across-fibers",
		title: "Shared Mutable State Across Fibers",
		message: "Using mutable objects captured by multiple fibers. " +
			"Race conditions, non-deterministic bugs. " +
			"Use Effect.Ref for safe concurrent state management.",
		severity: "high",
		defaultLevel: "error",
		category: "concurrency",
		fixIds: ["use-ref-for-shared-state"],
	},
	{
		id: "timeouts-without-cancellation-awareness",
		title: "Timeouts Without Cancellation Awareness",
		message: "Applying timeouts but inner effects ignore interruption. " +
			"Work continues after timeout, resources leak. " +
			"Ensure inner effects properly handle interruption signals.",
		severity: "medium",
		defaultLevel: "warn",
		category: "concurrency",
		fixIds: ["ensure-cancellation-awareness"],
	},
	// Scope anti-patterns
	{
		id: "resources-without-acquire-release",
		title: "Resources Created Without acquireRelease",
		message: "Manual open/close logic inside Effect without using Effect.acquireRelease. " +
			"Cleanup not guaranteed, easy to miss failure paths. " +
			"Use Effect.acquireRelease to ensure cleanup happens even on errors.",
		severity: "high",
		defaultLevel: "error",
		category: "resources",
		fixIds: ["wrap-with-acquire-release"],
	},
	{
		id: "returning-resources-instead-of-effects",
		title: "Returning Resources Instead of Effects",
		message: "Using Effect.succeed(resource) to return a resource directly. " +
			"Lifetime escapes scope, callers can misuse resource. " +
			"Return an effect that manages the resource lifetime instead.",
		severity: "high",
		defaultLevel: "error",
		category: "resources",
		fixIds: ["return-scoped-effect"],
	},
	{
		id: "creating-scopes-without-binding",
		title: "Creating Scopes Without Binding Them",
		message: "Creating a Scope but not tying it to the effect lifetime. " +
			"Cleanup never runs, leaks are invisible. " +
			"Bind scopes to effect lifetime using Effect.scoped.",
		severity: "high",
		defaultLevel: "error",
		category: "resources",
		fixIds: ["bind-scope-to-lifetime"],
	},
	{
		id: "long-lived-resources-in-short-scopes",
		title: "Long-Lived Resources in Short-Lived Scopes",
		message: "Database clients, HTTP pools inside request scopes. " +
			"Reconnection storms, performance degradation. " +
			"Move long-lived resources to application layer.",
		severity: "high",
		defaultLevel: "error",
		category: "resources",
		fixIds: ["move-resource-to-app-layer"],
	},
	{
		id: "global-singletons-instead-of-layers",
		title: "Using Global Singletons Instead of Layers",
		message: "Using const client = new Client() instead of Effect layers. " +
			"Hard to test, hard to swap implementations, hidden lifecycle. " +
			"Convert to Effect layer for proper lifecycle management.",
		severity: "medium",
		defaultLevel: "warn",
		category: "resources",
		fixIds: ["convert-singleton-to-layer"],
	},
	{
		id: "closing-resources-manually",
		title: "Closing Resources Manually",
		message: "Calling .close() explicitly inside Effect logic. " +
			"Double-close bugs, missed paths. " +
			"Use acquireRelease for automatic cleanup.",
		severity: "medium",
		defaultLevel: "warn",
		category: "resources",
		fixIds: ["remove-manual-close"],
	},
	{
		id: "effect-run-with-open-resources",
		title: "Effect.run* While Resources Are Open",
		message: "Running effects before all resources are scoped. " +
			"Cleanup skipped, shutdown hangs. " +
			"Ensure all resources are properly scoped before running effects.",
		severity: "high",
		defaultLevel: "error",
		category: "resources",
		fixIds: ["scope-resources-before-run"],
	},
	{
		id: "nested-resource-acquisition",
		title: "Nested Resource Acquisition",
		message: "Deeply nested acquireRelease blocks. " +
			"Hard to reason about lifetime, indicates missing composition. " +
			"Flatten into composable resource layers.",
		severity: "medium",
		defaultLevel: "warn",
		category: "resources",
		fixIds: ["flatten-resource-acquisition"],
	},
	{
		id: "using-scope-global-for-convenience",
		title: "Using Scope.global for Convenience",
		message: "Using Scope.global to avoid explicit scope management. " +
			"Hides ownership, makes cleanup implicit. " +
			"Use explicit scope management for clear resource ownership.",
		severity: "medium",
		defaultLevel: "warn",
		category: "resources",
		fixIds: ["use-explicit-scope"],
	},
	{
		id: "forgetting-to-provide-layers",
		title: "Forgetting to Provide Required Layers",
		message: "Effect expects a resource but relies on ambient context. " +
			"Runtime failures, environment confusion. " +
			"Explicitly provide all required layers.",
		severity: "medium",
		defaultLevel: "warn",
		category: "resources",
		fixIds: ["add-layer-provision"],
	},
];

/** Total number of rules in the registry (full set). Use in tests/telemetry. */
export const allRulesCount = Rules.length;

/** True when the rule is in the recommended ruleset (defaultLevel !== "off"). Single source of truth. */
export function isRecommended(rule: RuleDefinition): boolean {
	return rule.defaultLevel !== "off";
}

/** Number of rules in the recommended ruleset (no config). Use in tests/telemetry. */
export const recommendedRulesetCount = Rules.filter(isRecommended).length;

/**
 * Service for managing and retrieving rules and fixes.
 */
export class RuleRegistryService extends Effect.Service<RuleRegistryService>()(
	"RuleRegistryService",
	{
		dependencies: [ConfigService.Default],
		effect: Effect.gen(function* () {
			const config = yield* ConfigService;
			const listRules = (cfg?: AnalysisConfig) =>
				Effect.succeed(config.applyConfigToRules(Rules, cfg));
			const listFixes = () => Effect.succeed(Fixes);
			const getResolvedConfig = (cfg?: AnalysisConfig) =>
				Effect.succeed(config.resolveConfig(Rules, cfg));

			return {
				listRules,
				listFixes,
				getResolvedConfig,
			} satisfies RuleRegistryServiceApi;
		}),
	}
) { }

/**
 * Default live layer for `RuleRegistryService`.
 */
export const RuleRegistryServiceLive = RuleRegistryService.Default;