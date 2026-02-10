/**
 * Global constants for ep-admin CLI
 * 
 * Centralized location for all magic numbers, strings, and configuration values
 * used throughout the ep-admin CLI application.
 */

// =============================================================================
// CLI Metadata
// =============================================================================

export const CLI = {
	NAME: "ep-admin",
	VERSION: "0.2.1",
	DESCRIPTION: "Administrative CLI for Effect Patterns maintainers",
	RUNNER_NAME: "EffectPatterns Admin CLI",
} as const;

// =============================================================================
// Shell Completions
// =============================================================================

export const SHELL_TYPES = ["bash", "zsh", "fish"] as const;

export type ShellType = (typeof SHELL_TYPES)[number];

export const COMPLETION_DIRS = {
	BASH: ".bash_completion.d",
	ZSH: ".zsh/completions",
	FISH: ".config/fish/completions",
} as const;

export const COMPLETION_PREFIXES = {
	ZSH: "_",
} as const;

export const COMPLETION_EXTENSIONS = {
	FISH: ".fish",
} as const;

// =============================================================================
// File Paths
// =============================================================================

export const PATHS = {
	PACKAGE_JSON: "package.json",
	CHANGELOG: "docs/CHANGELOG.md",
	PROJECT_PACKAGE_NAME: "effect-patterns-hub",
} as const;

export const CONTENT_DIRS = {
	NEW_RAW: "content/new/raw",
	NEW_SRC: "content/new/src",
	NEW_PROCESSED: "content/new/processed",
	PUBLISHED: "content/published",
} as const;

// =============================================================================
// Task Names (Display Messages)
// =============================================================================

export const TASK_NAMES = {
	VALIDATE_PATTERNS: "Validating pattern files",
	VALIDATING_PATTERNS: "Validating patterns",
	RUN_TESTS: "Running TypeScript example tests",
	RUNNING_TYPESCRIPT_EXAMPLES: "Running TypeScript examples",
	PUBLISH_PATTERNS: "Publishing patterns",
	GENERATING_README: "Generating README.md",
	PUBLISHING_PIPELINE: "Publishing pipeline",
	PROCESSING_RAW_PATTERNS: "Processing raw patterns",
	PROCESSING_PATTERN: "Processing pattern",
	VALIDATING_INGEST_DATA: "Validating ingest data",
	TESTING_INGEST_PIPELINE: "Testing ingest pipeline",
	POPULATING_EXPECTATIONS: "Populating test expectations",
	CHECKING_INGEST_STATUS: "Checking ingest status",
	RUNNING_INGEST_PIPELINE: "Running full ingest pipeline",
	RUNNING_QA_PIPELINE: "Running QA pipeline",
	CHECKING_QA_STATUS: "Checking QA status",
	GENERATING_QA_REPORT: "Generating QA report",
	REPAIRING_QA_ISSUES: "Repairing QA issues",
	RUNNING_ENHANCED_QA_TESTS: "Running enhanced QA tests",
	TESTING_PATTERN: "Testing pattern",
	FIXING_PERMISSIONS: "Fixing file permissions",
	TESTING_DATABASE: "Testing database",
	QUICK_TESTING_DATABASE: "Quick testing database",
	VERIFYING_MIGRATION: "Verifying database migration",
	CREATING_MOCK_DB: "Creating mock database",
	RUNNING_HEALTH_CHECK: "Running health check",
	ROTATING_API_KEY: "Rotating API key",
	UPGRADING_BASELINE: "Upgrading test baseline",
	GENERATING_SKILLS: "Generating skills",
	GENERATING_SKILLS_FROM_DB: "Generating skills from database",
	RUNNING_SKILL_GENERATOR: "Running skill generator",
	GENERATING_README_SKILLS: "Generating README",
} as const;

// =============================================================================
// Step Names (Error Context)
// =============================================================================

export const STEP_NAMES = {
	VALIDATE: "validate",
	TEST: "test",
	PUBLISH: "publish",
	GENERATE_README: "generate-readme",
	GENERATE_RULES: "generate-rules",
	LINT: "lint",
	PIPELINE: "pipeline",
} as const;

// =============================================================================
// Success Messages
// =============================================================================

export const MESSAGES = {
	SUCCESS: {
		ALL_PATTERNS_VALID: "All patterns are valid!",
		PATTERNS_VALIDATED: "All patterns validated successfully!",
		ALL_EXAMPLES_PASSED: "All pattern examples passed!",
		PATTERNS_PUBLISHED: "Patterns published successfully!",
		DOCUMENTATION_GENERATED: "Documentation generated successfully!",
		LINTING_COMPLETE: "Linting complete!",
		PIPELINE_COMPLETED: "Publishing pipeline completed successfully!",
		PATTERNS_PROCESSED: "Patterns processed successfully!",
		PATTERN_PROCESSED: "Pattern processed!",
		INGEST_VALIDATION_COMPLETE: "Ingest validation complete!",
		INGEST_TESTS_PASSED: "Ingest pipeline tests passed!",
		EXPECTATIONS_POPULATED: "Test expectations populated!",
		STATUS_CHECK_COMPLETE: "Status check complete!",
		INGEST_PIPELINE_COMPLETED: "Ingest pipeline completed successfully!",
		QA_PIPELINE_COMPLETED: "QA pipeline completed!",
		QA_STATUS_COMPLETE: "Status check complete!",
		QA_REPORT_GENERATED: "QA report generated!",
		QA_REPAIR_COMPLETED: "Repair process completed!",
		QA_ENHANCED_TESTS_PASSED: "Enhanced QA tests passed!",
		PATTERN_TEST_PASSED: "Pattern test passed!",
		PERMISSIONS_FIXED: "File permissions fixed!",
		DATABASE_TESTS_PASSED: "Database tests passed!",
		QUICK_DB_TEST_PASSED: "Quick database test passed!",
		MIGRATION_VERIFIED: "Database migration verified!",
		MOCK_DB_CREATED: "Mock database created!",
		HEALTH_CHECK_COMPLETED: "Health check completed!",
		API_KEY_ROTATED: "API key rotated successfully!",
		BASELINE_UPGRADED: "Test baseline upgraded!",
		SKILLS_GENERATED: "Skills generated successfully!",
		SKILLS_GENERATED_FROM_DB: "DB-native skill generation completed!",
		SKILL_GENERATION_COMPLETED: "Skill generation completed!",
		README_GENERATED: "README generated!",
	},
	INFO: {
		CLEANING_PATTERNS: "Cleaning processed patterns...",
		STARTING_PIPELINE: "Starting publishing pipeline...",
		DRY_RUN_MODE: "Running in dry-run mode (no changes will be applied)",
		UPDATING_BASELINES: "This will update all test baselines",
		CREATING_BACKUP: "Creating backup of current API key...",
	},
} as const;

// =============================================================================
// Display Constants
// =============================================================================

export const DISPLAY = {
	SEPARATOR_CHAR: "━",
	SEPARATOR_LENGTH: 60,
} as const;

// =============================================================================
// Git Constants
// =============================================================================

export const GIT = {
	DEFAULT_REMOTE: "origin",
	DEFAULT_BRANCH: "HEAD",
	TAG_PREFIX: "v",
	INITIAL_TAG: "v0.1.0",
	COMMANDS: {
		DESCRIBE_TAGS: "describe --tags --abbrev=0",
		LOG_FORMAT: "--format=%B%n==END==",
		LOG_COMMIT_FORMAT: "--format=%H|%s|%an|%ci",
		PUSH_FOLLOW_TAGS: "--follow-tags",
		BRANCH_SHOW_CURRENT: "branch --show-current",
		STATUS_PORCELAIN: "status --porcelain",
		REV_PARSE_HEAD: "rev-parse HEAD",
		TAG_SORT_VERSION: "tag --sort=-version:refname",
		REV_LIST_ONE: "rev-list -n 1",
		LOG_FORMAT_DATE: "log -1 --format=%ci",
		TAG_FORMAT_CONTENTS: "tag -l --format=%(contents)",
		REMOTE_GET_URL: "remote get-url",
	},
	COMMIT_MESSAGE_PREFIX: "chore(release):",
} as const;

// =============================================================================
// Release Management
// =============================================================================

export const RELEASE = {
	COMMIT_PREFIX: "chore(release):",
	CHANGELOG_SECTIONS: {
		BREAKING: "## 🚨 BREAKING CHANGES",
		FEATURES: "## ✨ Features",
		BUG_FIXES: "## 🐛 Bug Fixes",
		DOCUMENTATION: "## 📚 Documentation",
		CHORES: "## 🔧 Chores & Maintenance",
		OTHER: "## 📝 Other Changes",
	},
	CHANGELOG_HEADER: "# Release",
	CHANGELOG_PREVIOUS_VERSION: "**Previous version:**",
} as const;

// =============================================================================
// Pattern Scaffolding
// =============================================================================

export const PATTERN = {
	SKILL_LEVELS: ["Beginner", "Intermediate", "Advanced"] as const,
	USE_CASES: [
		"Concurrency",
		"Error Handling",
		"Resource Management",
		"State Management",
		"Data Structures",
	] as const,
	MDX_TEMPLATE: {
		FRONTMATTER_SECTIONS: ["Good Example", "Anti-Pattern", "Rationale"],
	},
	TS_TEMPLATE: `import { Effect } from "effect";

// Add your TypeScript example code here
// This effect should successfully run
Effect.runSync(Effect.succeed("Hello, World!"));
`,
} as const;

// =============================================================================
// ANSI Color Codes
// =============================================================================

export const ANSI_COLORS = {
	RESET: "\x1b[0m",
	BRIGHT: "\x1b[1m",
	DIM: "\x1b[2m",
	RED: "\x1b[31m",
	GREEN: "\x1b[32m",
	YELLOW: "\x1b[33m",
	BLUE: "\x1b[34m",
	MAGENTA: "\x1b[35m",
	CYAN: "\x1b[36m",
	WHITE: "\x1b[37m",
	GRAY: "\x1b[90m",
} as const;

export const LOG_LEVEL_COLORS = {
	debug: ANSI_COLORS.GRAY,
	info: ANSI_COLORS.BLUE,
	warn: ANSI_COLORS.YELLOW,
	error: ANSI_COLORS.RED,
	success: ANSI_COLORS.GREEN,
	silent: "",
} as const;

// =============================================================================
// Output Formats
// =============================================================================

export const OUTPUT_FORMATS = ["text", "json"] as const;

export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

// =============================================================================
// Report Formats
// =============================================================================

export const REPORT_FORMATS = ["json", "markdown", "html"] as const;

export type ReportFormat = (typeof REPORT_FORMATS)[number];

// =============================================================================
// Skills Formats
// =============================================================================

export const SKILLS_FORMATS = ["json", "markdown", "yaml"] as const;

export type SkillsFormat = (typeof SKILLS_FORMATS)[number];
