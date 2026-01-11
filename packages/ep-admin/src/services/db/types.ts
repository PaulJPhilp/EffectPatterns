/**
 * Database Service Types
 */

export interface DBTestResult {
	name: string;
	passed: boolean;
	error?: string;
	duration: number;
}

export interface DBTestSummary {
	total: number;
	passed: number;
	failed: number;
	totalDuration: number;
	results: DBTestResult[];
}

export interface DBStats {
	applicationPatterns: number;
	effectPatterns: number;
	jobs: number;
	tables: string[];
}

export interface TableStatus {
	name: string;
	exists: boolean;
}

export interface DBQuickTestResult {
	connected: boolean;
	tablesExist: boolean;
	tables: TableStatus[];
	stats: DBStats;
	searchWorks: boolean;
	repositoriesWork: boolean;
}
