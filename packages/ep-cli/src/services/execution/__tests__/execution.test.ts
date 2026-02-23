/**
 * Execution service tests — no behavioral mocks.
 *
 * Uses real child processes with tiny test scripts in temp directories.
 */

import { Effect, Exit, Layer } from "effect";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureConsole } from "../../../test/helpers.js";
import { TUILoader } from "../../display/tui-loader.js";
import { Logger } from "../../logger/index.js";
import { Execution } from "../service.js";

const NoOpTUILoader = Layer.succeed(
	TUILoader,
	TUILoader.of({ load: () => Effect.succeed(null) })
);

const TestLayer = Execution.Default.pipe(
	Layer.provide(Logger.Default),
	Layer.provide(NoOpTUILoader)
);

const FullLayer = Layer.mergeAll(TestLayer, Logger.Default, NoOpTUILoader);

describe("Execution Service", () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ep-cli-exec-"));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	const writeScript = async (name: string, content: string) => {
		const filePath = path.join(tmpDir, name);
		await fs.writeFile(filePath, content, "utf8");
		return filePath;
	};

	describe("executeScriptCapture", () => {
		it("should capture stdout on success", async () => {
			const script = await writeScript(
				"success.ts",
				'console.log("success output");'
			);

			const program = Execution.executeScriptCapture(script).pipe(
				Effect.provide(FullLayer)
			);

			const result = await Effect.runPromise(program);
			expect(result).toContain("success output");
		});

		it("should include stderr in error on failure", async () => {
			const script = await writeScript(
				"fail.ts",
				'console.error("error output"); process.exit(1);'
			);

			const program = Execution.executeScriptCapture(script).pipe(
				Effect.provide(FullLayer)
			);

			const exit = await Effect.runPromiseExit(program);
			expect(Exit.isFailure(exit)).toBe(true);
			if (Exit.isFailure(exit) && exit.cause._tag === "Fail") {
				expect(exit.cause.error.message).toContain("exited with code 1");
				expect(exit.cause.error.scriptOutput).toContain("error output");
			}
		});
	});

	describe("executeScriptStream", () => {
		it("should succeed when script exits with 0", async () => {
			const script = await writeScript("ok.ts", "process.exit(0);");

			const program = Execution.executeScriptStream(script).pipe(
				Effect.provide(FullLayer)
			);

			await expect(Effect.runPromise(program)).resolves.toBeUndefined();
		});

		it("should fail when script exits with non-zero", async () => {
			const script = await writeScript("bad.ts", "process.exit(2);");

			const program = Execution.executeScriptStream(script).pipe(
				Effect.provide(FullLayer)
			);

			await expect(Effect.runPromise(program)).rejects.toThrow(
				/exited with code 2/
			);
		});
	});

	describe("executeScriptWithTUI", () => {
		it("should fallback to console when TUI is not available", async () => {
			const script = await writeScript("tui-ok.ts", "process.exit(0);");
			const capture = captureConsole();

			try {
				const program = Execution.executeScriptWithTUI(script, "Task").pipe(
					Effect.provide(FullLayer)
				);

				await Effect.runPromise(program);
				const output = capture.logs.join("\n");
				expect(output).toContain("Task");
			} finally {
				capture.restore();
			}
		});

		it("should handle script failure in TUI fallback path", async () => {
			const script = await writeScript(
				"tui-fail.ts",
				'console.log("some output"); process.exit(1);'
			);
			const capture = captureConsole();

			try {
				const program = Execution.executeScriptWithTUI(script, "Task").pipe(
					Effect.provide(FullLayer)
				);

				const exit = await Effect.runPromiseExit(program);
				expect(Exit.isFailure(exit)).toBe(true);
				if (Exit.isFailure(exit) && exit.cause._tag === "Fail") {
					expect(exit.cause.error.message).toContain("exited with code 1");
				}
			} finally {
				capture.restore();
			}
		});
	});

	describe("withSpinner", () => {
		it("should wrap an effect with progress messages", async () => {
			const capture = captureConsole();

			try {
				const program = Execution.withSpinner(
					"Spinning",
					Effect.succeed("Done")
				).pipe(Effect.provide(FullLayer));

				const result = await Effect.runPromise(program);
				expect(result).toBe("Done");
				const output = capture.logs.join("\n");
				expect(output).toContain("Spinning");
			} finally {
				capture.restore();
			}
		});
	});
});
