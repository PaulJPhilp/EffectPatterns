import { Effect } from "effect";

export interface CodeSuggestion {
	readonly id: string;
	readonly title: string;
	readonly message: string;
	readonly severity: "low" | "medium" | "high";
}

export interface AnalyzeCodeInput {
	readonly source: string;
	readonly filename?: string;
	readonly analysisType?: "validation" | "patterns" | "errors" | "all";
}

export interface AnalyzeCodeOutput {
	readonly suggestions: readonly CodeSuggestion[];
}

const isTsLike = (filename?: string): boolean => {
	if (!filename) return true;
	return filename.endsWith(".ts") || filename.endsWith(".tsx");
};

const detectSuggestions = (
	input: AnalyzeCodeInput
): readonly CodeSuggestion[] => {
	const source = input.source;
	const suggestions: Array<CodeSuggestion> = [];

	if (!isTsLike(input.filename)) {
		suggestions.push({
			id: "non-typescript",
			title: "Non-TypeScript input",
			message:
				"This analyzer is tuned for TypeScript/TSX. Results may be limited.",
			severity: "low",
		});
	}

	// Obvious anti-pattern: Node fs usage when platform is available
	if (/from\s+"node:fs"|from\s+"node:fs\/promises"/.test(source)) {
		suggestions.push({
			id: "node-fs",
			title: "Prefer @effect/platform FileSystem",
			message:
				"Replace Node.js fs usage with @effect/platform FileSystem service for " +
				"better testability and Effect integration.",
			severity: "medium",
		});
	}

	// Missing validation patterns
	if (/export\s+const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*Effect\.gen/.test(source)) {
		if (!/filterOrFail\(/.test(source)) {
			suggestions.push({
				id: "missing-validation",
				title: "Add input validation",
				message:
					"Consider validating user-controlled inputs using Effect.filterOrFail " +
					"(or Schema.decodeUnknown) at the boundary.",
				severity: "high",
			});
		}
	}

	// any types
	if (/\bany\b/.test(source)) {
		suggestions.push({
			id: "any-type",
			title: "Avoid any",
			message:
				"Replace `any` with specific types and/or @effect/schema schemas to " +
				"improve safety and inference.",
			severity: "high",
		});
	}

	// yield* on non-Effect (common error)
	if (/yield\*\s+\w+\.dirname\(/.test(source)) {
		suggestions.push({
			id: "yield-star-non-effect",
			title: "yield* used on non-Effect value",
			message:
				"Some platform services (e.g. Path.dirname) are pure functions. " +
				"Avoid `yield*` when the method returns a plain value.",
			severity: "medium",
		});
	}

	return suggestions;
};

export class CodeAnalyzerService extends Effect.Service<CodeAnalyzerService>()(
	"CodeAnalyzerService",
	{
		effect: Effect.gen(function* () {
			const analyze = (
				input: AnalyzeCodeInput
			): Effect.Effect<AnalyzeCodeOutput, never> =>
				Effect.gen(function* () {
					const suggestions = detectSuggestions(input);

					return { suggestions };
				});

			return { analyze };
		}),
	}
) { }

export const CodeAnalyzerServiceLive = CodeAnalyzerService.Default;
