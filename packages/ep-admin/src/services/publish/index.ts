/**
 * Publishing Services
 *
 * Native Effect-based services for the publishing pipeline
 */

// Validator
export {
	summarizeResults as summarizeValidationResults, validateAllPatterns, validatePattern, type Frontmatter,
	type ValidationIssue,
	type ValidationResult,
	type ValidatorConfig
} from "./validator.js";

// Tester
export {
	defaultTesterConfig, getFailedTests,
	getSlowestTests, runFullTestSuite, runTypeCheck,
	runTypeScriptFile, summarizeResults as summarizeTestResults, testAllPatterns, type TesterConfig, type TestResult, type TestSummary
} from "./tester.js";

// Publisher
export {
	getFailedPublishes, publishAllPatterns, publishPattern, summarizePublishResults, type PublisherConfig, type PublishResult, type PublishSummary
} from "./publisher.js";

// Generator
export {
	generateReadme,
	generateReadmeWithStats, type GeneratorConfig, type PatternInfo
} from "./generator.js";

// Linter
export {
	getFilesWithIssues, lintAllFiles, lintFile, summarizeLintResults, type LinterConfig, type LintIssue,
	type LintResult
} from "./linter.js";

// Pipeline
export {
	runFullPipeline, runGenerationStep,
	runLintingStep, runPublishAndGenerate, runPublishingStep, runTestingStep, runValidateAndTest, runValidationStep, type PipelineConfig,
	type PipelineResult
} from "./pipeline.js";

