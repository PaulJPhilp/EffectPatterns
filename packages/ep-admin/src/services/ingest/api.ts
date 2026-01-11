/**
 * Ingest Service API
 *
 * Interface for pattern ingestion and processing functionality
 */

import { Effect } from "effect";
import type {
	IngestConfig,
	IngestReport,
	IngestResult,
	Pattern,
	ProcessResult,
	ProcessSummary,
} from "./types.js";

/**
 * Ingest Service interface
 */
export interface IngestService {
	/**
	 * Discover patterns from raw directory
	 */
	readonly discoverPatterns: (
		config: IngestConfig,
	) => Effect.Effect<Pattern[], Error>;

	/**
	 * Validate a single pattern
	 */
	readonly validatePattern: (
		pattern: Pattern,
		config: IngestConfig,
	) => Effect.Effect<IngestResult, Error>;

	/**
	 * Validate multiple patterns
	 */
	readonly validatePatterns: (
		patterns: Pattern[],
		config: IngestConfig,
	) => Effect.Effect<IngestResult[], Error>;

	/**
	 * Test a pattern's TypeScript code
	 */
	readonly testPattern: (
		result: IngestResult,
	) => Effect.Effect<IngestResult, Error>;

	/**
	 * Test multiple patterns
	 */
	readonly testPatterns: (
		results: IngestResult[],
	) => Effect.Effect<IngestResult[], Error>;

	/**
	 * Check for duplicate patterns
	 */
	readonly checkDuplicates: (
		results: IngestResult[],
		config: IngestConfig,
	) => Effect.Effect<IngestResult[], Error>;

	/**
	 * Migrate a pattern to published directory
	 */
	readonly migratePattern: (
		result: IngestResult,
		config: IngestConfig,
	) => Effect.Effect<boolean, Error>;

	/**
	 * Migrate multiple patterns
	 */
	readonly migratePatterns: (
		results: IngestResult[],
		config: IngestConfig,
	) => Effect.Effect<IngestResult[], Error>;

	/**
	 * Generate ingest report
	 */
	readonly generateReport: (results: IngestResult[]) => IngestReport;

	/**
	 * Run the complete ingest pipeline
	 */
	readonly runIngestPipeline: (
		config: IngestConfig,
	) => Effect.Effect<IngestReport, Error>;

	/**
	 * Process a single file
	 */
	readonly processFile: (
		file: string,
		config: IngestConfig,
	) => Effect.Effect<ProcessResult, Error>;

	/**
	 * Process multiple files
	 */
	readonly processFiles: (
		files: string[],
		config: IngestConfig,
	) => Effect.Effect<ProcessSummary, Error>;
}
