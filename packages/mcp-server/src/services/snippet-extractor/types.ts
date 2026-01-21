import type { CodeSnippet, Finding } from "../../tools/schemas";

/**
 * Configuration for snippet extraction
 */
export interface SnippetConfig {
	readonly defaultContextLines: number;
	readonly maxSnippetLines: number;
	readonly minContextLinesWhenTrimming: number;
}

/**
 * Input for extracting a code snippet
 */
export interface ExtractSnippetInput {
	readonly finding: Finding;
	readonly source: string;
	readonly contextLines?: number;
}

/**
 * Re-exported types for convenience
 */
export type { CodeSnippet, Finding };
