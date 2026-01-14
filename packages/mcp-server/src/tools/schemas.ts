import { Schema as S } from "effect";
import { FixIdValues, RuleIdValues } from "./ids";

export const RuleId = S.Literal(...RuleIdValues);

export type RuleId = typeof RuleId.Type;

export const FixId = S.Literal(...FixIdValues);

export type FixId = typeof FixId.Type;

export const AnalysisType = S.Literal(
	"validation",
	"patterns",
	"errors",
	"all"
);

export type AnalysisType = typeof AnalysisType.Type;

export const RuleSeverity = S.Literal("low", "medium", "high");

export type RuleSeverity = typeof RuleSeverity.Type;

export const RuleCategory = S.Literal(
	"async",
	"errors",
	"validation",
	"resources",
	"dependency-injection",
	"style"
);

export type RuleCategory = typeof RuleCategory.Type;

export const RuleLevel = S.Literal("off", "warn", "error");

export type RuleLevel = typeof RuleLevel.Type;

export const RuleOverrides = S.Struct({
	severity: S.optional(RuleSeverity),
	options: S.optional(S.Record({ key: S.String, value: S.Unknown })),
});

export type RuleOverrides = typeof RuleOverrides.Type;

export const RuleConfig = S.Union(
	RuleLevel,
	S.Tuple(S.Literal("warn", "error"), RuleOverrides)
);

export type RuleConfig = typeof RuleConfig.Type;

export const AnalysisConfig = S.Struct({
	rules: S.optional(S.Record({ key: S.String, value: RuleConfig })),
	extends: S.optional(S.Array(S.String)),
	ignore: S.optional(S.Array(S.String)),
	include: S.optional(S.Array(S.String)),
});

export type AnalysisConfig = typeof AnalysisConfig.Type;

export const AnalyzeCodeRequest = S.Struct({
	source: S.String,
	filename: S.optional(S.String),
	analysisType: S.optional(AnalysisType),
	config: S.optional(AnalysisConfig),
});

export type AnalyzeCodeRequest = typeof AnalyzeCodeRequest.Type;

export const ListRulesRequest = S.Struct({
	config: S.optional(AnalysisConfig),
});

export type ListRulesRequest = typeof ListRulesRequest.Type;

export const GeneratePatternRequest = S.Struct({
	patternId: S.String,
	variables: S.Record({ key: S.String, value: S.String }),
});

export type GeneratePatternRequest = typeof GeneratePatternRequest.Type;

export const SuggestionSeverity = S.Literal("low", "medium", "high");

export type SuggestionSeverity = typeof SuggestionSeverity.Type;

export const Suggestion = S.Struct({
	id: RuleId,
	title: S.String,
	message: S.String,
	severity: SuggestionSeverity,
});

export type Suggestion = typeof Suggestion.Type;

export const SourceRange = S.Struct({
	startLine: S.Number,
	startCol: S.Number,
	endLine: S.Number,
	endCol: S.Number,
});

export type SourceRange = typeof SourceRange.Type;

export const Finding = S.Struct({
	id: S.String,
	ruleId: RuleId,
	title: S.String,
	message: S.String,
	severity: SuggestionSeverity,
	filename: S.optional(S.String),
	range: SourceRange,
	refactoringIds: S.Array(FixId),
});

export type Finding = typeof Finding.Type;

export const AnalyzeCodeResponse = S.Struct({
	suggestions: S.Array(Suggestion),
	findings: S.Array(Finding),
	traceId: S.String,
	timestamp: S.String,
});

export type AnalyzeCodeResponse = typeof AnalyzeCodeResponse.Type;

export const GeneratePatternResponse = S.Struct({
	patternId: S.String,
	name: S.String,
	imports: S.Array(S.String),
	code: S.String,
	traceId: S.String,
	timestamp: S.String,
});

export type GeneratePatternResponse = typeof GeneratePatternResponse.Type;

export const SourceFile = S.Struct({
	filename: S.String,
	source: S.String,
});

export type SourceFile = typeof SourceFile.Type;

export const ConsistencyIssue = S.Struct({
	id: S.String,
	title: S.String,
	message: S.String,
	severity: SuggestionSeverity,
	filenames: S.Array(S.String),
});

export type ConsistencyIssue = typeof ConsistencyIssue.Type;

export const AnalyzeConsistencyRequest = S.Struct({
	files: S.Array(SourceFile),
});

export type AnalyzeConsistencyRequest = typeof AnalyzeConsistencyRequest.Type;

export const AnalyzeConsistencyResponse = S.Struct({
	issues: S.Array(ConsistencyIssue),
	traceId: S.String,
	timestamp: S.String,
});

export type AnalyzeConsistencyResponse = typeof AnalyzeConsistencyResponse.Type;

export const RefactoringId = FixId;

export type RefactoringId = typeof RefactoringId.Type;

export const ApplyRefactoringRequest = S.Struct({
	refactoringId: S.optional(RefactoringId),
	refactoringIds: S.optional(S.Array(RefactoringId)),
	files: S.Array(SourceFile),
	preview: S.optional(S.Boolean),
});

export type ApplyRefactoringRequest = typeof ApplyRefactoringRequest.Type;

export const FileChange = S.Struct({
	filename: S.String,
	before: S.String,
	after: S.String,
});

export type FileChange = typeof FileChange.Type;

export const ApplyRefactoringResponse = S.Struct({
	applied: S.Boolean,
	changes: S.Array(FileChange),
	traceId: S.String,
	timestamp: S.String,
});

export type ApplyRefactoringResponse = typeof ApplyRefactoringResponse.Type;

export const RuleDefinition = S.Struct({
	id: RuleId,
	title: S.String,
	message: S.String,
	severity: RuleSeverity,
	category: RuleCategory,
	fixIds: S.Array(FixId),
});

export type RuleDefinition = typeof RuleDefinition.Type;

export const FixDefinition = S.Struct({
	id: FixId,
	title: S.String,
	description: S.String,
});

export type FixDefinition = typeof FixDefinition.Type;

export const ListRulesResponse = S.Struct({
	rules: S.Array(RuleDefinition),
	traceId: S.String,
	timestamp: S.String,
});

export type ListRulesResponse = typeof ListRulesResponse.Type;

export const ListFixesResponse = S.Struct({
	fixes: S.Array(FixDefinition),
	traceId: S.String,
	timestamp: S.String,
});

export type ListFixesResponse = typeof ListFixesResponse.Type;
