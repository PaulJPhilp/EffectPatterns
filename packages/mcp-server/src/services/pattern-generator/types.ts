export type ModuleType = "esm" | "cjs";

/**
 * Input for generating from hardcoded templates (quick scaffolding)
 */
export interface GenerateFromTemplateInput {
	readonly patternId: string;
	readonly variables: Record<string, string>;
}

/**
 * Input for generating from database patterns
 */
export interface GenerateFromDatabaseInput {
	readonly patternId: string;
	readonly customName?: string;
	readonly customInput?: string;
	readonly moduleType?: ModuleType;
	readonly effectVersion?: string;
}

/**
 * Output from pattern generation
 */
export interface GeneratePatternOutput {
	readonly patternId: string;
	readonly name: string;
	readonly imports: readonly string[];
	readonly code: string;
	readonly source: "template" | "database";
}
