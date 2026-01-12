/**
 * Execution service helper tests - NO MOCKS
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { getTUISpinner, withSpinner } from "../helpers.js";

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

	describe("getTUISpinner", () => {
		it("should return TUI spinner info", () => {
			const result = getTUISpinner();
			expect(result).toHaveProperty("spinnerEffectTUI");
			expect(result).toHaveProperty("InkService");
		});
	});
});