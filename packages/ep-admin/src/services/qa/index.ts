/**
 * QA Services
 *
 * Native Effect-based services for QA operations
 */

// Types
export type {
	QAConfig,
	QAReport,
	QAReportSummary,
	QAResult,
	QAStatus,
	RepairResult,
	RepairSummary
} from "./types.js";

// Service
export {
	generateQAReport,
	getQAStatus,
	repairAllFailed,
	repairPattern
} from "./service.js";

