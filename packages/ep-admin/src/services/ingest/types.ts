/**
 * Ingest Service Types
 */

export interface IngestConfig {
	rawDir: string;
	srcDir: string;
	processedDir: string;
	publishedDir: string;
	targetPublishedDir: string;
	reportDir: string;
}

export interface Pattern {
	id: string;
	title: string;
	rawPath: string;
	srcPath: string;
	processedPath: string;
	frontmatter: Record<string, unknown>;
	hasTypeScript: boolean;
}

export interface IngestIssue {
	type: "error" | "warning";
	category: string;
	message: string;
}

export interface IngestResult {
	pattern: Pattern;
	valid: boolean;
	issues: IngestIssue[];
	qaScore?: number;
	qaPassed?: boolean;
	qaIssues?: string[];
	testPassed?: boolean;
	isDuplicate?: boolean;
	existingPatternId?: string;
}

export interface IngestReport {
	timestamp: string;
	totalPatterns: number;
	validated: number;
	testsPassed: number;
	duplicates: number;
	migrated: number;
	failed: number;
	results: IngestResult[];
}

export interface ProcessResult {
	file: string;
	success: boolean;
	id?: string;
	error?: string;
}

export interface ProcessSummary {
	total: number;
	processed: number;
	failed: number;
	processedFiles: string[];
	failedFiles: Array<{ file: string; error: string }>;
}
