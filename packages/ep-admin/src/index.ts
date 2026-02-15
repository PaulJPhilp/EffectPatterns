#!/usr/bin/env bun

/**
 * ep-admin CLI - Administrative CLI for Effect Patterns maintainers
 *
 * Built with @effect/cli for type-safe, composable command-line interfaces.
 */

import { Args, Command } from "@effect/cli";
import { Effect } from "effect";
import { Console } from "effect";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { authCommand } from "./auth-commands.js";
import { validateEnvironment } from "./config/validate-env.js";
import { CLI, SHELL_TYPES } from "./constants.js";
import {
	Auth,
	AuthConfigurationError,
	AuthInvalidCredentialsError,
	AuthNotInitializedError,
	AuthServiceTokenError,
	AuthSessionExpiredError,
	AuthUnauthorizedUserError,
} from "./services/auth/index.js";
import { Display } from "./services/display/index.js";

// Import command modules - Hierarchical organization
import {
	configGroup,
	dataGroup,
	dbGroup,
	devGroup,
	opsGroup,
	patternGroup,
	rootLevelCommands,
} from "./command-groups.js";
import {
	EP_ADMIN_COMMANDS,
	generateCompletion,
	getInstallInstructions,
	installCompletion,
	type Shell,
} from "./completions.js";
import { publishCommand } from "./publish-commands.js";

// --- COMPLETIONS COMMAND ---

const completionsGenerateCommand = Command.make("generate", {
	shell: Args.text({ name: "shell" }).pipe(
		Args.withDescription("Shell type (bash, zsh, or fish)"),
	),
}).pipe(
	Command.withDescription("Generate shell completion script"),
	Command.withHandler(({ shell }) =>
		Effect.gen(function* () {
			const shellType = shell.toLowerCase() as Shell;
			if (!SHELL_TYPES.includes(shellType as Shell)) {
				yield* Effect.fail(
					new Error(
						`Invalid shell: ${shell}. Must be one of: ${SHELL_TYPES.join(", ")}`,
					),
				);
			}

			const completion = generateCompletion(shellType, EP_ADMIN_COMMANDS);
			const display = yield* Display;
			yield* display.showText(completion);
		}),
	),
);

const completionsInstallCommand = Command.make("install", {
	shell: Args.text({ name: "shell" }).pipe(
		Args.withDescription("Shell type (bash, zsh, or fish)"),
	),
}).pipe(
	Command.withDescription("Install shell completions"),
	Command.withHandler(({ shell }) =>
		Effect.gen(function* () {
			const shellType = shell.toLowerCase() as Shell;
			if (!SHELL_TYPES.includes(shellType as Shell)) {
				yield* Effect.fail(
					new Error(
						`Invalid shell: ${shell}. Must be one of: ${SHELL_TYPES.join(", ")}`,
					),
				);
			}

			const filePath = yield* installCompletion(shellType, EP_ADMIN_COMMANDS);

			const instructions = getInstallInstructions(shellType, filePath);
			const display = yield* Display;
			yield* display.showText(instructions);
		}),
	),
);

const completionsCommand = Command.make("completions").pipe(
	Command.withDescription(
		"Generate or install shell completions for bash, zsh, or fish",
	),
	Command.withSubcommands([
		completionsGenerateCommand,
		completionsInstallCommand,
	]),
);

// --- COMMAND COMPOSITION ---

// Build system group with completions command
const systemGroup = Command.make("system").pipe(
	Command.withDescription("System utilities"),
	Command.withSubcommands([completionsCommand]),
);

// Hierarchical command structure (organized by domain/function)
const adminSubcommands = [
	authCommand, // Local authentication and sessions
	publishCommand, // Pattern publishing workflow
	patternGroup, // Pattern discovery and management
	dataGroup, // Data ingestion and quality assurance
	dbGroup, // Database operations and migrations
	devGroup, // Development tools and utilities
	opsGroup, // Operations and infrastructure
	configGroup, // Configuration, setup, and entity management
	systemGroup, // System utilities (completions)
	...rootLevelCommands, // Root-level commands (release)
] as const;

export const adminRootCommand = Command.make(CLI.NAME).pipe(
	Command.withDescription(CLI.DESCRIPTION),
	Command.withSubcommands(adminSubcommands),
);

// --- RUNTIME SETUP ---

import { ProductionLayer } from "./runtime/production.js";

// Re-export for backward compatibility
export const runtimeLayer = ProductionLayer;

const adminCliRunner = Command.run(adminRootCommand, {
	name: CLI.RUNNER_NAME,
	version: CLI.VERSION,
});

const EP_ADMIN_DOCS_URL =
	"https://github.com/PaulJPhilp/EffectPatterns/tree/main/EP-ADMIN-CLI-README.md";

type PreparedArgv = {
	readonly argv: ReadonlyArray<string>;
	readonly warnings: ReadonlyArray<string>;
};

const LEGACY_COMMAND_MAPPINGS: ReadonlyArray<{
	readonly from: string;
	readonly to: ReadonlyArray<string>;
}> = [
	{ from: "search", to: ["pattern", "search"] },
	{ from: "skills", to: ["pattern", "skills"] },
	{ from: "ingest", to: ["data", "ingest"] },
	{ from: "qa", to: ["data", "qa"] },
	{ from: "discord", to: ["data", "discord"] },
	{ from: "install", to: ["config", "install"] },
	{ from: "rules", to: ["config", "rules"] },
	{ from: "utils", to: ["config", "utils"] },
	{ from: "show", to: ["db", "show"] },
	{ from: "migrate", to: ["db", "migrate"] },
	{ from: "test-utils", to: ["dev", "test-utils"] },
	{ from: "autofix", to: ["dev", "autofix"] },
	{ from: "mcp", to: ["ops", "mcp"] },
];

const ROOT_COMMANDS = [
	"auth",
	"publish",
	"pattern",
	"data",
	"db",
	"dev",
	"ops",
	"config",
	"system",
	"release",
] as const;

const NESTED_COMMANDS: Record<string, readonly string[]> = {
	auth: ["init", "login", "logout", "status"],
	publish: ["validate", "test", "run", "generate", "lint", "pipeline"],
	pattern: ["search", "new", "skills"],
	data: ["ingest", "discord", "qa"],
	db: ["show", "test", "test-quick", "verify-migration", "mock", "status", "migrate-remote", "migrate"],
	dev: ["test-utils", "autofix"],
	ops: ["health-check", "rotate-api-key", "upgrade-baseline", "mcp"],
	config: ["install", "rules", "utils", "entities"],
	system: ["completions"],
	release: ["preview", "create"],
};

const normalizeArgsForSuggestion = (argv: ReadonlyArray<string>): string[] =>
	argv.slice(2).filter((token) => token.length > 0 && !token.startsWith("-"));

const levenshtein = (a: string, b: string): number => {
	const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
		Array.from({ length: b.length + 1 }, () => 0)
	);

	for (let i = 0; i <= a.length; i++) dp[i]![0] = i;
	for (let j = 0; j <= b.length; j++) dp[0]![j] = j;

	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			dp[i]![j] = Math.min(
				dp[i - 1]![j]! + 1,
				dp[i]![j - 1]! + 1,
				dp[i - 1]![j - 1]! + cost
			);
		}
	}

	return dp[a.length]![b.length]!;
};

const findClosest = (input: string, candidates: readonly string[]): string | null => {
	if (candidates.length === 0) return null;
	let best: string | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;

	for (const candidate of candidates) {
		const distance = levenshtein(input.toLowerCase(), candidate.toLowerCase());
		if (distance < bestDistance) {
			bestDistance = distance;
			best = candidate;
		}
	}

	if (!best) return null;
	return bestDistance <= Math.max(2, Math.floor(input.length / 2)) ? best : null;
};

const getCommandSuggestion = (argv: ReadonlyArray<string>): string | null => {
	const args = normalizeArgsForSuggestion(argv);
	const first = args[0];
	if (!first) return null;

	if (!ROOT_COMMANDS.includes(first as (typeof ROOT_COMMANDS)[number])) {
		const suggested = findClosest(first, ROOT_COMMANDS);
		return suggested ? `Did you mean: ep-admin ${suggested}` : null;
	}

	const nested = NESTED_COMMANDS[first];
	const second = args[1];
	if (!nested || !second) return null;

	if (!nested.includes(second)) {
		const suggested = findClosest(second, nested);
		return suggested ? `Did you mean: ep-admin ${first} ${suggested}` : null;
	}

	return null;
};

const isAuthExemptArgv = (argv: ReadonlyArray<string>): boolean => {
	const args = argv.slice(2);
	if (args.length === 0) return true;
	if (args.includes("--help") || args.includes("-h") || args.includes("--version")) {
		return true;
	}
	const first = args.find((token) => !token.startsWith("-"));
	if (!first) return true;
	return first === "auth";
};

const normalizeLegacyArgs = (
	argv: ReadonlyArray<string> = process.argv
): PreparedArgv => {
	const args = [...argv];
	const tokens = args.slice(2);
	const firstTokenIndex = tokens.findIndex((token) => !token.startsWith("-"));
	if (firstTokenIndex === -1) {
		return { argv: args, warnings: [] };
	}

	const firstTokenValue = tokens[firstTokenIndex];
	if (!firstTokenValue) {
		return { argv: args, warnings: [] };
	}
	const actualIndex = firstTokenIndex + 2;
	const warnings: string[] = [];

	if (firstTokenValue === "ops" && args[actualIndex + 1] === "ops") {
		args.splice(actualIndex + 1, 1);
		warnings.push(
			"Deprecated command path: 'ep-admin ops ops ...'. Use 'ep-admin ops ...' instead."
		);
		return { argv: args, warnings };
	}

	if (firstTokenValue === "publish" && args[actualIndex + 1] === "publish") {
		args.splice(actualIndex + 1, 1, "run");
		warnings.push(
			"Deprecated command path: 'ep-admin publish publish ...'. Use 'ep-admin publish run ...' instead."
		);
		return { argv: args, warnings };
	}

	const mapping = LEGACY_COMMAND_MAPPINGS.find((candidate) => candidate.from === firstTokenValue);
	if (!mapping) {
		return { argv: args, warnings };
	}

	args.splice(actualIndex, 1, ...mapping.to);
	warnings.push(
		`Deprecated command path: 'ep-admin ${mapping.from} ...'. Use 'ep-admin ${mapping.to.join(" ")} ...' instead.`
	);
	return { argv: args, warnings };
};

const extractErrorMessage = (error: unknown, argv: ReadonlyArray<string>): string | null => {
	if (error instanceof AuthNotInitializedError) {
		return [
			"ep-admin authentication is not initialized.",
			"Run: ep-admin auth init",
			`Docs: ${EP_ADMIN_DOCS_URL}`,
		].join("\n");
	}

	if (error instanceof AuthInvalidCredentialsError) {
		return [
			"ep-admin login required.",
			"Run: ep-admin auth login",
			`Docs: ${EP_ADMIN_DOCS_URL}`,
		].join("\n");
	}

	if (error instanceof AuthSessionExpiredError) {
		return [
			"ep-admin session expired.",
			"Run: ep-admin auth login",
			`Docs: ${EP_ADMIN_DOCS_URL}`,
		].join("\n");
	}

	if (error instanceof AuthUnauthorizedUserError) {
		return [
			`Unauthorized OS user '${error.currentUser}'.`,
			`Authorized user: '${error.expectedUser}'.`,
			`Docs: ${EP_ADMIN_DOCS_URL}`,
		].join("\n");
	}

	if (error instanceof AuthServiceTokenError) {
		return `${error.message}\nDocs: ${EP_ADMIN_DOCS_URL}`;
	}

	if (error instanceof AuthConfigurationError) {
		return `${error.message}\nDocs: ${EP_ADMIN_DOCS_URL}`;
	}

	if (typeof error === "string") return error;

	if (error instanceof Error) {
		const combined = [error.message, error.stack].filter(Boolean).join("\n");
		if (combined.includes("CommandMismatch")) {
			const suggestion = getCommandSuggestion(argv);
			return [
				suggestion ? suggestion : "Need command help? Run 'ep-admin --help'.",
				`Docs: ${EP_ADMIN_DOCS_URL}`,
			].join("\n");
		}

		if (error.message.trim()) {
			return `${error.message.trim()}\nDocs: ${EP_ADMIN_DOCS_URL}`;
		}
	}

	return String(error);
};

export const createAdminProgram = (
	argv: ReadonlyArray<string> = process.argv
) => Effect.scoped(adminCliRunner(argv));

export const runCli = (
	argv: ReadonlyArray<string> = process.argv
): Effect.Effect<void, unknown, never> =>
	Effect.gen(function* () {
		const prepared = normalizeLegacyArgs(argv);
		for (const warning of prepared.warnings) {
			yield* Console.error(`⚠ ${warning}`);
		}

		// Validate env before runtime operations.
		yield* validateEnvironment;

		if (!isAuthExemptArgv(prepared.argv)) {
			const auth = yield* Auth;
			yield* auth.ensureAuthorized(process.env.EP_ADMIN_SERVICE_TOKEN);
		}

		yield* createAdminProgram(prepared.argv);
	}) as Effect.Effect<void, unknown, never>;

/**
 * Run CLI when executed directly.
 *
 * ESM-compatible check that works with both direct execution and when imported.
 * Checks if the current module's file path matches the executed argv[1].
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine if this module is being run directly
const isDirectExecution = (() => {
	const executedFile = process.argv[1];
	if (!executedFile) return false;

	// Handle direct execution (bun run index.ts)
	if (executedFile === __filename) return true;

	// Handle execution through wrapper script (ep-admin binary)
	if (
		executedFile.endsWith("ep-admin") ||
		executedFile.endsWith("ep-admin.js")
	) {
		return true;
	}

	// Handle execution in development (bun dist/index.js)
	if (executedFile.includes("dist") && executedFile.includes("index.js")) {
		return true;
	}

	return false;
})();

if (isDirectExecution) {
	const provided = Effect.provide(runCli(process.argv), ProductionLayer) as Effect.Effect<
		void,
		unknown,
		never
	>;
	void Effect.runPromise(provided).catch((error) => {
		const message = extractErrorMessage(error, process.argv);
		if (message) {
			console.error(message);
		}
		process.exitCode = 1;
	});
}
