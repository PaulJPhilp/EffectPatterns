/**
 * Tests for install command handlers
 */

import { Effect, Exit } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureConsole } from "../../test/helpers.js";
import { runCli } from "../../index.js";

const run = (args: string[]) =>
	Effect.runPromiseExit(runCli(["bun", "ep", ...args]));

describe("install commands", () => {
	let capture: ReturnType<typeof captureConsole>;

	beforeEach(() => {
		capture = captureConsole();
	});

	afterEach(() => {
		capture.restore();
	});

	describe("install list", () => {
		it("lists supported tools", async () => {
			const exit = await run(["install", "list"]);
			expect(Exit.isSuccess(exit)).toBe(true);
			const output = capture.logs.join("\n");
			expect(output).toContain("agents");
			expect(output).toContain("cursor");
			expect(output).toContain("vscode");
			expect(output).toContain("windsurf");
		});

		it("outputs JSON for --json", async () => {
			const exit = await run(["install", "list", "--json"]);
			expect(Exit.isSuccess(exit)).toBe(true);
			const jsonLines = capture.logs.join("\n");
			const parsed = JSON.parse(jsonLines);
			expect(Array.isArray(parsed.tools)).toBe(true);
			expect(parsed.tools).toContain("cursor");
			expect(parsed.tools).toContain("agents");
		});

		it("outputs JSON for --installed --json with no rules", async () => {
			const exit = await run(["install", "list", "--installed", "--json"]);
			expect(Exit.isSuccess(exit)).toBe(true);
			const jsonLines = capture.logs.join("\n");
			const parsed = JSON.parse(jsonLines);
			expect(parsed.count).toBe(0);
			expect(Array.isArray(parsed.rules)).toBe(true);
		});
	});

	describe("install add", () => {
		it("rejects unsupported tool", async () => {
			const exit = await run(["install", "add", "--tool", "not-a-tool"]);
			expect(Exit.isFailure(exit)).toBe(true);
			const output = capture.errors.join("\n");
			expect(output).toContain("not supported");
		});

		it("shows help text", async () => {
			const exit = await run(["install", "add", "--help"]);
			expect(Exit.isSuccess(exit)).toBe(true);
		});
	});

	describe("install help", () => {
		it("shows install help", async () => {
			const exit = await run(["install", "--help"]);
			expect(Exit.isSuccess(exit)).toBe(true);
		});
	});
});
