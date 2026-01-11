/**
 * Ingest Services
 *
 * Native Effect-based services for the ingest pipeline
 */

// Types
export type {
	IngestConfig,
	IngestIssue,
	IngestReport,
	IngestResult,
	Pattern,
	ProcessResult,
	ProcessSummary
} from "./types.js";

// Processor
export {
	processAllPatterns,
	processPattern,
	summarizeProcessResults
} from "./processor.js";

// Pipeline
export {
	checkDuplicates,
	discoverPatterns,
	generateReport,
	migratePattern,
	migratePatterns,
	runIngestPipeline,
	testPattern,
	testPatterns,
	validatePattern,
	validatePatterns
} from "./pipeline.js";

