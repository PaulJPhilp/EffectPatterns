/**
 * Publishing Services
 *
 * Native Effect-based services for the publishing pipeline
 */

// Types
export type {
	Frontmatter, GeneratorConfig, LintIssue,
	LintResult,
	LinterConfig,
	PatternInfo, PipelineConfig,
	PipelineResult, PublishResult, PublishSummary, PublisherConfig, TestResult, TestSummary, TesterConfig, ValidationIssue,
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
	calculateLintStats, calculatePublishStats, calculateTestStats, countValidationIssues, executeCommand, extractPatternInfo, fileExists, generatePatternLink, getFailedPublishes, getFailedTests, getFailedValidations, getFilesWithIssues, getMdxFiles, getSlowestTests, getTsFiles, groupLintIssuesByRule, groupValidationIssuesByCategory, readFileContent, runTypeScriptCheck,
	runTypeScriptFile, sortPatterns, writeFileContent
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
	runTypeScriptFile, summarizeResults as summarizeTestResults, testAllPatterns, type TestResult as LegacyTestResult, type TestSummary as LegacyTestSummary, type TesterConfig as LegacyTesterConfig
} from "./tester.js";

export {
	getFailedPublishes, publishAllPatterns, publishPattern, summarizePublishResults, type PublishResult as LegacyPublishResult, type PublishSummary as LegacyPublishSummary, type PublisherConfig as LegacyPublisherConfig
} from "./publisher.js";

export {
	generateReadme,
	generateReadmeWithStats, type GeneratorConfig as LegacyGeneratorConfig, type PatternInfo as LegacyPatternInfo
} from "./generator.js";

export {
	getFilesWithIssues as LegacyGetFilesWithIssues, lintAllFiles, lintFile, summarizeLintResults, type LintIssue as LegacyLintIssue,
	type LintResult as LegacyLintResult, type LinterConfig as LegacyLinterConfig
} from "./linter.js";

export {
	runFullPipeline, runGenerationStep,
	runLintingStep, runPublishAndGenerate, runPublishingStep, runTestingStep, runValidateAndTest, runValidationStep, type PipelineConfig as LegacyPipelineConfig,
	type PipelineResult as LegacyPipelineResult
} from "./pipeline.js";

