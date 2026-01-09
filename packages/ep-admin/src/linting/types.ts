/**
 * Type definitions for the Effect patterns linter
 */

export interface LintIssue {
	rule: string;
	severity: "error" | "warning" | "info";
	message: string;
	line: number;
	column: number;
	suggestion?: string;
}

export interface LintResult {
	file: string;
	issues: LintIssue[];
	errors: number;
	warnings: number;
	info: number;
}

export interface LintRule {
	name: string;
	description: string;
	defaultSeverity: "error" | "warning" | "info" | "off";
	canFix: boolean;
}
