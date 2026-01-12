/**
 * Publishing Services
 *
 * Native Effect-based services for the publishing pipeline
 */

// Types
export type {
	Frontmatter, GeneratorConfig, LinterConfig, LintIssue,
	LintResult, PatternInfo, PipelineConfig,
	PipelineResult, PublisherConfig, PublishResult, PublishSummary, TesterConfig, TestResult, TestSummary, ValidationIssue,
	ValidationResult,
	ValidatorConfig
} from "./types.js";

// API
export type { PublishService } from "./api.js";

// Errors
export {
	BackupError, CodeValidationError, FilePublishError, FrontmatterValidationError, LinkValidationError, LintConfigError, LintExecutionError, PatternMigrationError, PatternStructureError, PipelineConfigError,
	PipelineExecutionError, ReadmeGenerationError, RuntimeError, StatsCollectionError, StepDependencyError, TemplateError, TestTimeoutError, TypeScriptCompilationError
} from "./errors.js";

// Service
export { PublishServiceLive } from "./service.js";

// Helpers
export {
	calculateLintStats, calculatePublishStats, calculateTestStats, countValidationIssues, executeCommand, extractPatternInfo, fileExists, generatePatternLink, getFailedValidations, getFilesWithIssues, getMdxFiles, getTsFiles, groupLintIssuesByRule, groupValidationIssuesByCategory, readFileContent, runTypeScriptCheck,
	sortPatterns, writeFileContent
} from "./helpers.js";

// Legacy exports (keeping existing functionality)
export {
	summarizeResults as summarizeValidationResults, validateAllPatterns, validatePattern, type Frontmatter as LegacyFrontmatter,
	type ValidationIssue as LegacyValidationIssue,
	type ValidationResult as LegacyValidationResult,
	type ValidatorConfig as LegacyValidatorConfig
} from "./validator.js";

export {
	defaultTesterConfig, getFailedTests,
	getSlowestTests, runFullTestSuite, runTypeCheck,
	runTypeScriptFile, summarizeResults as summarizeTestResults, testAllPatterns, type TesterConfig as LegacyTesterConfig, type TestResult as LegacyTestResult, type TestSummary as LegacyTestSummary
} from "./tester.js";

export {
	getFailedPublishes, publishAllPatterns, publishPattern, summarizePublishResults, type PublisherConfig as LegacyPublisherConfig, type PublishResult as LegacyPublishResult, type PublishSummary as LegacyPublishSummary
} from "./publisher.js";

export {
	generateReadme,
	generateReadmeWithStats, type GeneratorConfig as LegacyGeneratorConfig, type PatternInfo as LegacyPatternInfo
} from "./generator.js";

export {
	getFilesWithIssues as LegacyGetFilesWithIssues, lintAllFiles, lintFile, summarizeLintResults, type LinterConfig as LegacyLinterConfig, type LintIssue as LegacyLintIssue,
	type LintResult as LegacyLintResult
} from "./linter.js";

export {
	runFullPipeline, runGenerationStep,
	runLintingStep, runPublishAndGenerate, runPublishingStep, runTestingStep, runValidateAndTest, runValidationStep, type PipelineConfig as LegacyPipelineConfig,
	type PipelineResult as LegacyPipelineResult
} from "./pipeline.js";

