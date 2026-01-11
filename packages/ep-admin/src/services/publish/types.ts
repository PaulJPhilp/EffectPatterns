/**
 * Publish Service Types
 *
 * Type definitions for the complete publishing pipeline
 */

// --- VALIDATION TYPES ---

export interface Frontmatter {
	id?: string;
	title?: string;
	skillLevel?: string;
	useCase?: string | string[];
	summary?: string;
	tags?: string[];
	[key: string]: unknown;
}

export interface ValidationIssue {
	type: "error" | "warning";
	category:
	| "frontmatter"
	| "structure"
	| "links"
	| "code"
	| "content"
	| "files";
	message: string;
}

export interface ValidationResult {
	file: string;
	valid: boolean;
	issues: ValidationIssue[];
	warnings: number;
	errors: number;
}

export interface ValidatorConfig {
	publishedDir: string;
	srcDir: string;
	enableLinkCheck: boolean;
	enableCodeValidation: boolean;
}

// --- TESTING TYPES ---

export interface TestResult {
	file: string;
	success: boolean;
	duration: number;
	error?: string;
	expectedError?: boolean;
}

export interface TesterConfig {
	srcDir: string;
	concurrency: number;
	enableTypeCheck: boolean;
	timeout: number;
	expectedErrors: Map<string, string[]>;
}

export interface TestSummary {
	total: number;
	passed: number;
	failed: number;
	expectedErrors: number;
	totalDuration: number;
	avgDuration: number;
	minDuration: number;
	maxDuration: number;
}

// --- PUBLISHING TYPES ---

export interface PublishResult {
	file: string;
	success: boolean;
	duration: number;
	error?: string;
	publishedPath?: string;
}

export interface PublisherConfig {
	rawDir: string;
	publishedDir: string;
	srcDir: string;
	enableBackup: boolean;
	backupDir: string;
}

export interface PublishSummary {
	total: number;
	published: number;
	failed: number;
	totalDuration: number;
	avgDuration: number;
}

// --- LINTING TYPES ---

export interface LintIssue {
	rule: string;
	severity: "error" | "warning";
	message: string;
	line?: number;
	column?: number;
}

export interface LintResult {
	file: string;
	success: boolean;
	issues: LintIssue[];
	warnings: number;
	errors: number;
	duration: number;
}

export interface LinterConfig {
	targetDir: string;
	rules: string[];
	enableTypeCheck: boolean;
	enableStyleCheck: boolean;
}

// --- GENERATION TYPES ---

export interface PatternInfo {
	id: string;
	title: string;
	skillLevel: string;
	useCase: string | string[];
	tags: string[];
	filePath: string;
}

export interface GeneratorConfig {
	publishedDir: string;
	outputFile: string;
	includeStats: boolean;
	templatePath?: string;
}

// --- PIPELINE TYPES ---

export interface PipelineConfig {
	// Validation
	validation: ValidatorConfig;

	// Testing
	testing: TesterConfig;

	// Publishing
	publishing: PublisherConfig;

	// Linting
	linting: LinterConfig;

	// Generation
	generation: GeneratorConfig;

	// Pipeline options
	enableValidation: boolean;
	enableTesting: boolean;
	enableLinting: boolean;
	enablePublishing: boolean;
	enableGeneration: boolean;
	parallel: boolean;
}

export interface PipelineResult {
	validation: {
		enabled: boolean;
		results: ValidationResult[];
		summary: {
			total: number;
			passed: number;
			failed: number;
			duration: number;
		};
	};

	testing: {
		enabled: boolean;
		results: TestResult[];
		summary: TestSummary;
	};

	linting: {
		enabled: boolean;
		results: LintResult[];
		summary: {
			total: number;
			passed: number;
			failed: number;
			duration: number;
		};
	};

	publishing: {
		enabled: boolean;
		results: PublishResult[];
		summary: PublishSummary;
	};

	generation: {
		enabled: boolean;
		readme: string;
		stats?: PatternInfo[];
	};

	overall: {
		totalDuration: number;
		success: boolean;
		stepsCompleted: string[];
		stepsFailed: string[];
	};
}
