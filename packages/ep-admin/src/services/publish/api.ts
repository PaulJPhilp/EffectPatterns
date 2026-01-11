/**
 * Publish Service API
 *
 * Interface for the complete publishing pipeline
 */

import { Effect } from "effect";
import type {
	GeneratorConfig,
	LinterConfig,
	LintResult,
	PatternInfo,
	PipelineConfig,
	PipelineResult,
	PublisherConfig,
	PublishResult,
	TesterConfig,
	TestResult,
	TestSummary,
	ValidationResult,
	ValidatorConfig
} from "./types.js";

/**
 * Publish Service interface
 */
export interface PublishService {
	/**
	 * Validate a single pattern
	 */
	readonly validatePattern: (
		patternPath: string,
		config: ValidatorConfig,
	) => Effect.Effect<ValidationResult, Error>;

	/**
	 * Validate all patterns
	 */
	readonly validateAllPatterns: (
		config: ValidatorConfig,
	) => Effect.Effect<ValidationResult[], Error>;

	/**
	 * Test a single pattern
	 */
	readonly testPattern: (
		patternPath: string,
		config: TesterConfig,
	) => Effect.Effect<TestResult, Error>;

	/**
	 * Test all patterns
	 */
	readonly testAllPatterns: (
		config: TesterConfig,
	) => Effect.Effect<TestResult[], Error>;

	/**
	 * Run TypeScript type checking
	 */
	readonly runTypeCheck: (
		patternPath: string,
	) => Effect.Effect<boolean, Error>;

	/**
	 * Run full test suite
	 */
	readonly runFullTestSuite: (
		config: TesterConfig,
	) => Effect.Effect<TestSummary, Error>;

	/**
	 * Publish a single pattern
	 */
	readonly publishPattern: (
		patternPath: string,
		config: PublisherConfig,
	) => Effect.Effect<PublishResult, Error>;

	/**
	 * Publish all patterns
	 */
	readonly publishAllPatterns: (
		config: PublisherConfig,
	) => Effect.Effect<PublishResult[], Error>;

	/**
	 * Lint a single file
	 */
	readonly lintFile: (
		filePath: string,
		config: LinterConfig,
	) => Effect.Effect<LintResult, Error>;

	/**
	 * Lint all files
	 */
	readonly lintAllFiles: (
		config: LinterConfig,
	) => Effect.Effect<LintResult[], Error>;

	/**
	 * Generate README
	 */
	readonly generateReadme: (
		config: GeneratorConfig,
	) => Effect.Effect<string, Error>;

	/**
	 * Generate README with stats
	 */
	readonly generateReadmeWithStats: (
		config: GeneratorConfig,
	) => Effect.Effect<{ readme: string; stats: PatternInfo[] }, Error>;

	/**
	 * Run validation step
	 */
	readonly runValidationStep: (
		config: PipelineConfig,
	) => Effect.Effect<ValidationResult[], Error>;

	/**
	 * Run testing step
	 */
	readonly runTestingStep: (
		config: PipelineConfig,
	) => Effect.Effect<TestResult[], Error>;

	/**
	 * Run linting step
	 */
	readonly runLintingStep: (
		config: PipelineConfig,
	) => Effect.Effect<LintResult[], Error>;

	/**
	 * Run publishing step
	 */
	readonly runPublishingStep: (
		config: PipelineConfig,
	) => Effect.Effect<PublishResult[], Error>;

	/**
	 * Run generation step
	 */
	readonly runGenerationStep: (
		config: PipelineConfig,
	) => Effect.Effect<string, Error>;

	/**
	 * Run full pipeline
	 */
	readonly runFullPipeline: (
		config: PipelineConfig,
	) => Effect.Effect<PipelineResult, Error>;

	/**
	 * Run validate and test
	 */
	readonly runValidateAndTest: (
		config: PipelineConfig,
	) => Effect.Effect<{ validation: ValidationResult[]; testing: TestResult[] }, Error>;

	/**
	 * Run publish and generate
	 */
	readonly runPublishAndGenerate: (
		config: PipelineConfig,
	) => Effect.Effect<{ publishing: PublishResult[]; generation: string }, Error>;
}
