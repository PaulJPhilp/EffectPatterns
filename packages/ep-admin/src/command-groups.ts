/**
 * Command Group Composition
 *
 * Organizes all ep-admin commands into logical hierarchical groups
 * for better discoverability and user experience.
 *
 * Structure:
 * - publish: Pattern publishing workflow
 * - pattern: Pattern discovery and management
 * - data: Data ingestion and quality assurance
 * - db: Database operations and migrations
 * - dev: Development tools and utilities
 * - ops: Operations and infrastructure
 * - config: Configuration and setup
 * - pipeline: Pipeline management
 * - system: System-level utilities (completions)
 */

import { Command } from "@effect/cli";
import { autofixCommand } from "./autofix-commands.js";
import {
	dbMigrateRemoteCommand,
	dbMockCommand,
	dbStatusCommand,
	dbTestCommand,
	dbTestQuickCommand,
	dbVerifyMigrationCommand,
} from "./db-commands.js";
import { discordCommand } from "./discord-commands.js";
import { ingestCommand } from "./ingest-commands.js";
import { installCommand, rulesCommand } from "./install-commands.js";
import { lockCommand, unlockCommand } from "./lock-commands.js";
import { mcpCommand } from "./mcp-commands.js";
import { migrateCommand } from "./migrate-commands.js";
import { opsCommand } from "./ops-commands.js";
import { publishCommand } from "./publish-commands.js";
import { qaCommand } from "./qa-commands.js";
import { patternNewCommand, releaseCommand } from "./release-commands.js";
import { searchCommand } from "./search-commands.js";
import { showCommand } from "./show-commands.js";
import { skillsCommand } from "./skills-commands.js";
import { testUtilsCommand } from "./test-utils-commands.js";
import { utilsCommand } from "./utils-commands.js";

/**
 * Pattern Management Group
 *
 * Commands for discovering, creating, and managing patterns
 */
export const patternGroup = Command.make("pattern").pipe(
	Command.withDescription("Pattern discovery and management"),
	Command.withSubcommands([searchCommand, patternNewCommand, skillsCommand]),
);

/**
 * Data Operations Group
 *
 * Commands for data ingestion and quality assurance
 */
export const dataGroup = Command.make("data").pipe(
	Command.withDescription("Data ingestion and quality assurance"),
	Command.withSubcommands([ingestCommand, discordCommand, qaCommand]),
);

/**
 * Database Operations Group
 *
 * Commands for database operations and migrations
 */
export const dbGroup = Command.make("db").pipe(
	Command.withDescription("Database operations and migrations"),
	Command.withSubcommands([
		showCommand,
		dbTestCommand,
		dbTestQuickCommand,
		dbVerifyMigrationCommand,
		dbMockCommand,
		dbStatusCommand,
		dbMigrateRemoteCommand,
		migrateCommand,
	]),
);

/**
 * Development Tools Group
 *
 * Commands for development utilities and testing
 */
export const devGroup = Command.make("dev").pipe(
	Command.withDescription("Development tools and utilities"),
	Command.withSubcommands([testUtilsCommand, autofixCommand]),
);

/**
 * Operations & Infrastructure Group
 *
 * Commands for infrastructure operations and external services
 */
export const opsGroup = Command.make("ops").pipe(
	Command.withDescription("Operations and infrastructure"),
	Command.withSubcommands([opsCommand, mcpCommand]),
);

/**
 * Configuration & Setup Group
 *
 * Commands for system configuration and entity management
 */
export const configGroup = Command.make("config").pipe(
	Command.withDescription("Configuration, setup, and entity management"),
	Command.withSubcommands([
		installCommand,
		rulesCommand,
		utilsCommand,
		// Entities management sub-group
		Command.make("entities").pipe(
			Command.withDescription("Manage entity lifecycle (lock/unlock)"),
			Command.withSubcommands([lockCommand, unlockCommand]),
		),
	]),
);

/**
 * Pipeline Management Group
 *
 * Commands for pipeline orchestration and monitoring
 *
 * NOTE: Commented out due to TypeScript/WeakMap issues
 * Pipeline functionality is available via:
 * - `publish pipeline` for full pipeline execution
 * - `publish` group for individual commands
 */
// export const pipelineGroup = Command.make("pipeline").pipe(
// 	Command.withDescription("Pipeline orchestration and monitoring"),
// 	Command.withSubcommands([
// 		pipelineStatusCommand,
// 	])
// );

// Note: System Utilities Group is created in index.ts with completions command

/**
 * All root-level command groups in hierarchical order
 *
 * This is the organized structure that replaces the flat command list.
 */
export const allCommandGroups = [
	publishCommand, // Pattern publishing workflow
	patternGroup, // Pattern discovery and management
	dataGroup, // Data ingestion and QA
	dbGroup, // Database operations
	devGroup, // Development tools
	opsGroup, // Operations and infrastructure
	configGroup, // Configuration and setup
	// pipelineGroup removed due to TypeScript/WeakMap issues
] as const;

/**
 * Commands that stay at root level (not grouped further)
 *
 * - releaseCommand: High-level release management (separate from publish)
 */
export const rootLevelCommands = [releaseCommand] as const;

/**
 * All commands organized hierarchically
 */
export const allHierarchicalCommands = [
	...allCommandGroups,
	...rootLevelCommands,
] as const;
