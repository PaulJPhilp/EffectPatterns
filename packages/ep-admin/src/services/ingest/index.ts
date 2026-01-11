/**
 * Ingest Services
 *
 * Native Effect-based services for pattern ingestion and processing
 */

// Types
export type {
	IngestConfig, IngestIssue, IngestReport, IngestResult, Pattern, ProcessResult,
	ProcessSummary
} from "./types.js";

// API
export type { IngestService } from "./api.js";

// Errors
export {
	DuplicatePatternError,
	FileProcessingError,
	FrontmatterParseError, PatternDiscoveryError, PatternMigrationError, PatternTestError, PatternValidationError, TypeScriptExtractionError
} from "./errors.js";

// Pipeline
export {
	checkDuplicates, discoverPatterns, generateReport, migratePattern,
	migratePatterns, runIngestPipeline, testPattern,
	testPatterns, validatePattern,
	validatePatterns
} from "./pipeline.js";

// Processor
export {
	processAllPatterns, processPattern, summarizeProcessResults
} from "./processor.js";

// Helpers
export {
	createPatternFromFile, createProcessResult, extractTypeScriptCode, filterMdxFiles, generatePatternId,
	generatePatternPaths, hasTypeScriptCode, parseFrontmatter, readMdxFile, REQUIRED_CONTENT_SECTIONS, REQUIRED_FRONTMATTER_FIELDS, validateContentStructure, validateFrontmatter, writeTypeScriptFile
} from "./helpers.js";

