/**
 * QA Service Types
 */

export interface QAConfig {
	qaDir: string;
	resultsDir: string;
	backupsDir: string;
	repairsDir: string;
	patternsDir: string;
	reportFile: string;
}

export interface QAResult {
	passed: boolean;
	patternId?: string;
	fileName?: string;
	tokens?: number;
	cost?: number;
	duration?: number;
	metadata?: {
		title?: string;
		skillLevel?: string;
		tags?: string[];
	};
	errors?: string[];
	warnings?: string[];
	suggestions?: string[];
	qaFile?: string;
}

export interface QAReportSummary {
	totalPatterns: number;
	passed: number;
	failed: number;
	passRate: number;
	totalTokens: number;
	totalCost: number;
	averageDuration: number;
	generatedAt: string;
}

export interface QAReport {
	summary: QAReportSummary;
	failures: {
		byCategory: Record<string, number>;
		bySkillLevel: Record<string, { passed: number; failed: number }>;
		byTag: Record<string, { passed: number; failed: number }>;
		patterns: Array<{
			patternId: string;
			fileName: string;
			title: string;
			skillLevel: string;
			tags: string[];
			errors: string[];
			warnings: string[];
			suggestions: string[];
		}>;
	};
	metrics: {
		tokenUsage: { min: number; max: number; average: number };
		costAnalysis: { min: number; max: number; average: number; total: number };
		durationStats: { min: number; max: number; average: number };
	};
	recommendations: string[];
}

export interface QAStatus {
	total: number;
	passed: number;
	failed: number;
	passRate: number;
	failuresByCategory: Record<string, number>;
	bySkillLevel: Record<string, { passed: number; failed: number }>;
}

export interface RepairResult {
	patternId: string;
	success: boolean;
	changesApplied?: number;
	error?: string;
}

export interface RepairSummary {
	attempted: number;
	repaired: number;
	failed: number;
	results: RepairResult[];
}
