import { Effect } from "effect";
import type { FixId, RuleId } from "../tools/ids";
import { RuleRegistryService } from "./rule-registry";

export interface CodeSuggestion {
	readonly id: RuleId;
	readonly title: string;
	readonly message: string;
	readonly severity: "low" | "medium" | "high";
}

export interface SourceRange {
	readonly startLine: number;
	readonly startCol: number;
	readonly endLine: number;
	readonly endCol: number;
}

export interface CodeFinding {
	readonly id: string;
	readonly ruleId: RuleId;
	readonly title: string;
	readonly message: string;
	readonly severity: "low" | "medium" | "high";
	readonly filename?: string;
	readonly range: SourceRange;
	readonly refactoringIds: readonly FixId[];
}

export interface AnalyzeCodeInput {
	readonly source: string;
	readonly filename?: string;
	readonly analysisType?: "validation" | "patterns" | "errors" | "all";
}

export interface AnalyzeCodeOutput {
	readonly suggestions: readonly CodeSuggestion[];
	readonly findings: readonly CodeFinding[];
}

const toLineCol = (
	source: string,
	index: number
): { readonly line: number; readonly col: number } => {
	const clamped = Math.max(0, Math.min(index, source.length));
	let line = 1;
	let lastNewline = -1;

	for (let i = 0; i < clamped; i++) {
		if (source.charCodeAt(i) === 10) {
			line++;
			lastNewline = i;
		}
	}

	return { line, col: clamped - lastNewline };
};

const firstRange = (
	source: string,
	re: RegExp
): SourceRange => {
	const match = re.exec(source);
	if (!match || match.index == null) {
		return { startLine: 1, startCol: 1, endLine: 1, endCol: 1 };
	}

	const start = toLineCol(source, match.index);
	const end = toLineCol(source, match.index + match[0].length);
	return {
		startLine: start.line,
		startCol: start.col,
		endLine: end.line,
		endCol: end.col,
	};
};

const ruleIdToRange = (input: AnalyzeCodeInput, ruleId: RuleId): SourceRange => {
	const source = input.source;

	switch (ruleId) {
		case "async-await":
			return firstRange(source, /\bawait\b|\basync\b/);
		case "node-fs":
			return firstRange(
				source,
				/from\s+"node:fs"|from\s+"node:fs\/promises"/
			);
		case "missing-validation":
			return firstRange(
				source,
				/export\s+const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*Effect\.gen/
			);
		case "try-catch-in-effect":
			return firstRange(source, /\btry\s*\{/);
		case "try-catch-boundary-ok":
			return firstRange(source, /\btry\s*\{/);
		case "catch-log-and-swallow":
			return firstRange(source, /\bcatch\s*\([^)]*\)\s*\{/);
		case "throw-in-effect-code":
			return firstRange(source, /\bthrow\b/);
		case "any-type":
			return firstRange(source, /\bany\b/);
		case "yield-star-non-effect":
			return firstRange(source, /yield\*\s+\w+\.dirname\(/);
		case "non-typescript":
			return { startLine: 1, startCol: 1, endLine: 1, endCol: 1 };
	}
};

const isTsLike = (filename?: string): boolean => {
	if (!filename) return true;
	return filename.endsWith(".ts") || filename.endsWith(".tsx");
};

const isBoundaryFile = (filename?: string): boolean => {
	if (!filename) return false;
	return filename.includes("app/api/") && filename.endsWith("route.ts");
};

const looksLikeEffectCode = (source: string): boolean => {
	return (
		/\bEffect\.gen\b/.test(source) ||
		/\byield\*\b/.test(source) ||
		/from\s+"effect"/.test(source) ||
		/import\s+\{[^}]*\bEffect\b[^}]*\}\s+from\s+"effect"/.test(source)
	);
};

const detectRuleIds = (
	input: AnalyzeCodeInput
): readonly RuleId[] => {
	const source = input.source;
	const ruleIds: Array<RuleId> = [];

	if (!isTsLike(input.filename)) {
		ruleIds.push("non-typescript");
	}

	// Obvious anti-pattern: Node fs usage when platform is available
	if (/from\s+"node:fs"|from\s+"node:fs\/promises"/.test(source)) {
		ruleIds.push("node-fs");
	}

	// Anti-pattern: async/await for core logic instead of Effect
	// MVP heuristic: flag when async/await appears in Effect-ish modules
	if (/(\basync\b|\bawait\b)/.test(source)) {
		const boundary = isBoundaryFile(input.filename);
		const isEffectCode = looksLikeEffectCode(source);
		const serviceLike =
			input.filename?.includes("/services/") ||
			input.filename?.includes("service") ||
			input.filename?.includes("layer");

		if (isEffectCode && !boundary) {
			ruleIds.push("async-await");
		} else if (serviceLike && !boundary) {
			ruleIds.push("async-await");
		}
	}

	// Missing validation patterns
	if (/export\s+const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*Effect\.gen/.test(source)) {
		if (!/filterOrFail\(/.test(source)) {
			ruleIds.push("missing-validation");
		}
	}

	// any types
	if (/\bany\b/.test(source)) {
		ruleIds.push("any-type");
	}

	// yield* on non-Effect (common error)
	if (/yield\*\s+\w+\.dirname\(/.test(source)) {
		ruleIds.push("yield-star-non-effect");
	}

	const boundary = isBoundaryFile(input.filename);
	const isEffectCode = looksLikeEffectCode(source);

	// Option A (MVP): try/catch guidance and anti-pattern detection
	if (/\btry\s*\{/.test(source) && isEffectCode) {
		if (boundary) {
			ruleIds.push("try-catch-boundary-ok");
		} else {
			const serviceLike =
				input.filename?.includes("/services/") ||
				input.filename?.includes("service") ||
				input.filename?.includes("layer");
			void serviceLike;
			ruleIds.push("try-catch-in-effect");
		}
	}

	// Catch block logs and continues (high signal)
	const catchLogs = /\bcatch\s*\([^)]*\)\s*\{[\s\S]*?(console\.|logger\.)/;
	const catchReturns =
		/\bcatch\s*\([^)]*\)\s*\{[\s\S]*?\breturn\b[\s\S]*?\}/;
	const catchContainsThrow =
		/\bcatch\s*\([^)]*\)\s*\{[\s\S]*?\bthrow\b[\s\S]*?\}/;
	const catchFailsEffect =
		/\bcatch\s*\([^)]*\)\s*\{[\s\S]*?Effect\.fail\b[\s\S]*?\}/;

	if (
		isEffectCode &&
		catchLogs.test(source) &&
		catchReturns.test(source) &&
		!catchContainsThrow.test(source) &&
		!catchFailsEffect.test(source)
	) {
		ruleIds.push("catch-log-and-swallow");
	}

	// Throw inside Effect code (anti-pattern)
	if (/\bthrow\b/.test(source) && isEffectCode) {
		const serviceLike =
			input.filename?.includes("/services/") ||
			input.filename?.includes("service") ||
			input.filename?.includes("layer");
		void serviceLike;
		ruleIds.push("throw-in-effect-code");
	}

	return ruleIds;
};

export class CodeAnalyzerService extends Effect.Service<CodeAnalyzerService>()(
	"CodeAnalyzerService",
	{
		effect: Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			const rules = yield* registry.listRules();
			const ruleById = new Map(rules.map((r) => [r.id, r] as const));

			const analyze = (
				input: AnalyzeCodeInput
			): Effect.Effect<AnalyzeCodeOutput, never> =>
				Effect.gen(function* () {
					const detected = detectRuleIds(input);
					const suggestions = detected.map((ruleId) => {
						const rule = ruleById.get(ruleId);
						if (!rule) {
							return {
								id: ruleId,
								title: "",
								message: "",
								severity: "low",
							} satisfies CodeSuggestion;
						}
						return {
							id: ruleId,
							title: rule.title,
							message: rule.message,
							severity: rule.severity,
						} satisfies CodeSuggestion;
					});
					const findings = detected.map((ruleId) => {
						const rule = ruleById.get(ruleId);
						const range = ruleIdToRange(input, ruleId);
						const id = `${ruleId}:${input.filename ?? ""}:${range.startLine}:${range.startCol}`;

						return {
							id,
							ruleId,
							title: rule?.title ?? "",
							message: rule?.message ?? "",
							severity: rule?.severity ?? "low",
							filename: input.filename,
							range,
							refactoringIds: rule?.fixIds ?? [],
						} satisfies CodeFinding;
					});

					return { suggestions, findings };
				});

			return { analyze };
		}),
		dependencies: [RuleRegistryService.Default],
	}
) { }

export const CodeAnalyzerServiceLive = CodeAnalyzerService.Default;
