/**
 * Execution service helper tests - NO MOCKS
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { shouldRenderProgress, withSpinner } from "../helpers.js";

describe("Execution Helpers", () => {
	describe("withSpinner", () => {
		it("should wrap effect and return result", async () => {
			const result = await Effect.runPromise(
				withSpinner("Test task", Effect.succeed("result"))
			);

			expect(result).toBe("result");
		});

		it("should propagate effect errors", async () => {
			await expect(
				Effect.runPromise(
					withSpinner("Test task", Effect.fail(new Error("Failed")))
				)
			).rejects.toThrow("Failed");
		});
	});

	describe("shouldRenderProgress", () => {
		it("returns true in interactive tty mode", () => {
			expect(
				shouldRenderProgress(undefined, {
					isTTY: true,
					ci: undefined,
					term: "xterm-256color",
				})
			).toBe(true);
		});

		it("returns false in non-tty mode", () => {
			expect(
				shouldRenderProgress(undefined, {
					isTTY: false,
					ci: undefined,
					term: "xterm-256color",
				})
			).toBe(false);
		});

		it("returns false in CI mode", () => {
			expect(
				shouldRenderProgress(undefined, {
					isTTY: true,
					ci: "true",
					term: "xterm-256color",
				})
			).toBe(false);
		});

		it("returns false when terminal is dumb", () => {
			expect(
				shouldRenderProgress(undefined, {
					isTTY: true,
					ci: undefined,
					term: "dumb",
				})
			).toBe(false);
		});

		it("returns false in verbose mode", () => {
			expect(
				shouldRenderProgress(
					{ verbose: true },
					{
						isTTY: true,
						ci: undefined,
						term: "xterm-256color",
					}
				)
			).toBe(false);
		});
	});

});
