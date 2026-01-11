/**
 * QA Service API
 *
 * Interface for QA status, reporting, and repair functionality
 */

import { Effect } from "effect";
import type {
	QAConfig,
	QAReport,
	QAStatus,
	RepairResult,
	RepairSummary,
} from "./types.js";

/**
 * QA Service interface
 */
export interface QAService {
	/**
	 * Get current QA status summary
	 */
	readonly getQAStatus: (
		config: QAConfig,
	) => Effect.Effect<QAStatus, Error>;

	/**
	 * Generate comprehensive QA report
	 */
	readonly generateQAReport: (
		config: QAConfig,
	) => Effect.Effect<QAReport, Error>;

	/**
	 * Repair a single failed pattern
	 */
	readonly repairPattern: (
		patternId: string,
		config: QAConfig,
		dryRun: boolean,
	) => Effect.Effect<RepairResult, Error>;

	/**
	 * Repair all failed patterns
	 */
	readonly repairAllFailed: (
		config: QAConfig,
		dryRun: boolean,
	) => Effect.Effect<RepairSummary, Error>;

	/**
	 * Load QA results from files
	 */
	readonly loadQAResults: (
		config: QAConfig,
	) => Effect.Effect<any[], Error>;

	/**
	 * Categorize QA errors by type
	 */
	readonly categorizeError: (error: string) => string;

	/**
	 * Generate repair recommendations
	 */
	readonly generateRecommendations: (results: any[]) => string[];
}
