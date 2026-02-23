/**
 * Tests for pattern repository command handlers
 */

import { Effect, Exit } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureConsole } from "../../test/helpers.js";
import { runCli } from "../../index.js";

const run = (args: string[]) =>
	Effect.runPromiseExit(runCli(["bun", "ep", ...args]));

describe("pattern repo commands", () => {
	let capture: ReturnType<typeof captureConsole>;

	beforeEach(() => {
		capture = captureConsole();
	});

	afterEach(() => {
		capture.restore();
	});

	describe("search", () => {
		it("shows help text", async () => {
			const exit = await run(["search", "--help"]);
			expect(Exit.isSuccess(exit)).toBe(true);
		});

		it("requires a query argument", async () => {
			const exit = await run(["search"]);
			expect(Exit.isFailure(exit)).toBe(true);
		});
	});

	describe("list", () => {
		it("shows help text", async () => {
			const exit = await run(["list", "--help"]);
			expect(Exit.isSuccess(exit)).toBe(true);
		});
	});

	describe("show", () => {
		it("shows help text", async () => {
			const exit = await run(["show", "--help"]);
			expect(Exit.isSuccess(exit)).toBe(true);
		});

		it("requires a pattern-id argument", async () => {
			const exit = await run(["show"]);
			expect(Exit.isFailure(exit)).toBe(true);
		});
	});
});
