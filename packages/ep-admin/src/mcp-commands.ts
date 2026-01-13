/**
 * MCP commands for ep-admin
 *
 * Provides governance visibility by calling the MCP server endpoints:
 * - POST /api/list-rules
 * - POST /api/list-fixes
 */

import { Command } from "@effect/cli";
import { Console, Effect } from "effect";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";
import { McpService } from "./services/mcp/service.js";

const isRecord = (u: unknown): u is Record<string, unknown> =>
	typeof u === "object" && u !== null;

type RuleRow = {
	id: string;
	title: string;
	severity: string;
	category: string;
	fixes: string;
};

type FixRow = {
	id: string;
	title: string;
	description: string;
};

const toRuleRow = (u: unknown): RuleRow | undefined => {
	if (!isRecord(u)) return undefined;
	if (typeof u.id !== "string") return undefined;
	if (typeof u.title !== "string") return undefined;
	if (typeof u.message !== "string") return undefined;

	const severity = typeof u.severity === "string" ? u.severity : "";
	const category = typeof u.category === "string" ? u.category : "";
	const fixIds = Array.isArray(u.fixIds)
		? u.fixIds.filter((x) => typeof x === "string")
		: [];

	return {
		id: u.id,
		title: u.title,
		severity,
		category,
		fixes: fixIds.join(","),
	};
};

const toFixRow = (u: unknown): FixRow | undefined => {
	if (!isRecord(u)) return undefined;
	if (typeof u.id !== "string") return undefined;
	if (typeof u.title !== "string") return undefined;
	if (typeof u.description !== "string") return undefined;

	return {
		id: u.id,
		title: u.title,
		description: u.description,
	};
};

const listRulesCommand = Command.make("list-rules", {
	options: {
		...globalOptions,
	},
}).pipe(
	Command.withDescription("List governed analyzer rules from MCP server"),
	Command.withHandler(({ options }) =>
		Effect.gen(function* () {
			yield* configureLoggerFromOptions(options);
			const display = yield* Display;
			const mcp = yield* McpService;
			const result = yield* mcp.listRules();

			if (options.json) {
				yield* Console.log(JSON.stringify(result, null, 2));
				return;
			}

			const rows = result.rules
				.map(toRuleRow)
				.filter((r): r is RuleRow => r !== undefined);

			yield* display.showInfo(
				`Rules: ${rows.length} (traceId: ${result.traceId})`
			);
			yield* display.showTable(rows, {
				columns: [
					{ key: "id", header: "ID", width: 22 },
					{ key: "severity", header: "Severity", width: 10 },
					{ key: "category", header: "Category", width: 18 },
					{ key: "fixes", header: "Fixes", width: 22 },
					{ key: "title", header: "Title", width: 40 },
				],
				bordered: true,
			});
		})
	),
);

const listFixesCommand = Command.make("list-fixes", {
	options: {
		...globalOptions,
	},
}).pipe(
	Command.withDescription("List governed refactoring fixes from MCP server"),
	Command.withHandler(({ options }) =>
		Effect.gen(function* () {
			yield* configureLoggerFromOptions(options);
			const display = yield* Display;
			const mcp = yield* McpService;
			const result = yield* mcp.listFixes();

			if (options.json) {
				yield* Console.log(JSON.stringify(result, null, 2));
				return;
			}

			const rows = result.fixes
				.map(toFixRow)
				.filter((r): r is FixRow => r !== undefined);

			yield* display.showInfo(
				`Fixes: ${rows.length} (traceId: ${result.traceId})`
			);
			yield* display.showTable(rows, {
				columns: [
					{ key: "id", header: "ID", width: 28 },
					{ key: "title", header: "Title", width: 36 },
					{ key: "description", header: "Description", width: 50 },
				],
				bordered: true,
			});
		})
	),
);

export const mcpCommand = Command.make("mcp").pipe(
	Command.withDescription("Interact with the MCP server"),
	Command.withSubcommands([listRulesCommand, listFixesCommand]),
);
