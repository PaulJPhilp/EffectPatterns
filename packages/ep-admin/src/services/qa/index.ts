/**
 * QA Services
 *
 * Native Effect-based services for QA status, reporting, and repair functionality
 */

// Types
export type {
	QAConfig, QAReport, QAReportSummary, QAResult, QAStatus,
	RepairResult,
	RepairSummary
} from "./types.js";

// API
export type { QAService } from "./api.js";

// Errors
export {
	BackupCreationError, PatternNotFoundError, PatternRepairError, QAConfigurationError, QAFileParseError, QAReportGenerationError, QAResultsLoadError
} from "./errors.js";

// Service
export {
	generateQAReport, getQAStatus, repairAllFailed, repairPattern
} from "./service.js";

// Helpers
export {
	ERROR_CATEGORIES,
	QA_FILE_SUFFIX, calculatePassRate, categorizeError, countFailuresByCategory, createPatternBackup, extractFailedPatternIds, filterFailedPatterns, generateRecommendations, groupBySkillLevel,
	groupByTags, loadQAResults, patternExists
} from "./helpers.js";

