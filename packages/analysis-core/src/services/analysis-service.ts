import { Effect } from "effect";
import type { FixId, RuleId } from "../tools/ids";
import type { AnalysisConfig } from "../config/types";
import type {
	AnalyzeCodeOutput,
	CodeFinding,
	CodeSuggestion,
} from "./code-analyzer";
import { CodeAnalyzerService } from "./code-analyzer";
import { ConsistencyAnalyzerService } from "./consistency-analyzer";
import { RefactoringEngineService } from "./refactoring-engine";
import { RuleRegistryService } from "./rule-registry";

/**
 * Structured output for a single-file analysis.
 *
 * This is the primary transport-agnostic response type used by the MCP
 * server and other consumers.
 */
export interface AnalysisReport {
	readonly filename: string;
	readonly suggestions: readonly CodeSuggestion[];
	readonly findings: readonly CodeFinding[];
	readonly analyzedAt: string;
}

/**
 * Input for requesting a fix for a specific governed rule.
 */
export interface GenerateFixInput {
	readonly ruleId: RuleId;
	readonly filename: string;
	readonly source: string;
}

/**
 * Output of `generateFix`.
 *
 * This returns preview-only file changes (no files are written).
 */
export interface GenerateFixOutput {
	readonly changes: readonly {
		filename: string;
		before: string;
		after: string;
	}[];
	readonly applied: boolean;
}

/**
 * Transport-agnostic analysis API.
 *
 * All operations are pure in the sense that they operate on in-memory input
 * and return results / refactoring previews.
 */
export interface AnalysisServiceApi {
	readonly analyzeFile: (
		filename: string,
		content: string,
		options?: {
			readonly analysisType?: "validation" | "patterns" | "errors" | "all";
			readonly config?: AnalysisConfig;
		}
	) => Effect.Effect<AnalysisReport, never>;

	readonly listRules: (
		config?: AnalysisConfig
	) => Effect.Effect<readonly {
		id: RuleId;
		title: string;
		message: string;
		severity: "low" | "medium" | "high";
		category: string;
		fixIds: readonly FixId[];
	}[], never>;

	readonly listFixes: () => Effect.Effect<readonly {
		id: FixId;
		title: string;
		description: string;
	}[], never>;

	readonly generateFix: (
		input: GenerateFixInput,
		options?: { readonly config?: AnalysisConfig }
	) => Effect.Effect<GenerateFixOutput, never>;

	readonly applyRefactorings: (
		refactoringIds: readonly FixId[],
		files: readonly { filename: string; source: string }[]
	) => Effect.Effect<readonly {
		filename: string;
		before: string;
		after: string;
	}[], never>;

	readonly analyzeConsistency: (
		files: readonly { filename: string; source: string }[]
	) => Effect.Effect<readonly any[], never>;
}

/**
 * High-level facade service that composes:
 * - `RuleRegistryService` (governed rules + fix metadata)
 * - `CodeAnalyzerService` (single-file detection)
 * - `ConsistencyAnalyzerService` (multi-file heuristics)
 * - `RefactoringEngineService` (AST-based fixes)
 */
export class AnalysisService extends Effect.Service<AnalysisService>()(
	"AnalysisService",
	{
		/**
		 * Service initialization effect.
		 *
		 * This effect yields the composed service API.
		 */
		effect: Effect.gen(function* () {
			const analyzer = yield* CodeAnalyzerService;
			const rules = yield* RuleRegistryService;
			const engine = yield* RefactoringEngineService;
			const consistency = yield* ConsistencyAnalyzerService;

			const analyzeFile = (
				filename: string,
				content: string,
				options?: {
					readonly analysisType?: "validation" | "patterns" | "errors" | "all";
					readonly config?: AnalysisConfig;
				}
			): Effect.Effect<AnalysisReport, never> =>
				Effect.gen(function* () {
					const result: AnalyzeCodeOutput = yield* analyzer.analyze({
						source: content,
						filename,
						analysisType: options?.analysisType ?? "all",
						config: options?.config,
					});

					const severityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
					const sortedFindings = [...result.findings].sort((a, b) =>
						(severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0)
					);

					return {
						filename,
						suggestions: result.suggestions,
						findings: sortedFindings,
						analyzedAt: new Date().toISOString(),
					};
				});

			const listRules = (config?: AnalysisConfig) => rules.listRules(config);

			const listFixes = () => rules.listFixes();

			const generateFix = (
				input: GenerateFixInput,
				options?: { readonly config?: AnalysisConfig }
			): Effect.Effect<GenerateFixOutput, never> =>
				Effect.gen(function* () {
					const allRules = yield* rules.listRules(options?.config);
					const rule = allRules.find((r) => r.id === input.ruleId);

					if (!rule || rule.fixIds.length === 0) {
						return { changes: [], applied: false };
					}

					const output = yield* engine.apply({
						refactoringIds: rule.fixIds,
						files: [{ filename: input.filename, source: input.source }],
						preview: true,
					});

					return {
						changes: output.changes,
						applied: output.applied,
					};
				});

			const applyRefactorings = (
				refactoringIds: readonly FixId[],
				files: readonly { filename: string; source: string }[]
			) =>
				Effect.gen(function* () {
					const output = yield* engine.apply({
						refactoringIds,
						files,
						preview: true,
					});

					return output.changes;
				});

			const analyzeConsistency = (
				files: readonly { filename: string; source: string }[]
			) =>
				Effect.gen(function* () {
					const output = yield* consistency.analyze({ files });
					return output.issues;
				});

			return {
				analyzeFile,
				listRules,
				listFixes,
				generateFix,
				applyRefactorings,
				analyzeConsistency,
			} satisfies AnalysisServiceApi;
		}),
		dependencies: [
			RuleRegistryService.Default,
			CodeAnalyzerService.Default,
			RefactoringEngineService.Default,
			ConsistencyAnalyzerService.Default,
		],
	}
) { }

/**
 * Default live layer for `AnalysisService`.
 */
export const AnalysisServiceLive = AnalysisService.Default;
