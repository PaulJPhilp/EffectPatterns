import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
	getPattern,
	listPatterns,
	renderTemplate,
	validateVariables,
} from "./patterns";

describe("tools/patterns", () => {
	it("listPatterns should return at least one pattern", () => {
		const patterns = listPatterns();
		expect(patterns.length).toBeGreaterThan(0);
	});

	it("getPattern should return known pattern", async () => {
		const pattern = await Effect.runPromise(
			getPattern("validation-filter-or-fail")
		);
		expect(pattern.id).toBe("validation-filter-or-fail");
	});

	it("getPattern should fail for unknown pattern", async () => {
		await expect(
			Effect.runPromise(getPattern("does-not-exist"))
		).rejects.toThrow(/Unknown patternId/);
	});

	it("renderTemplate should replace tokens", () => {
		const out = renderTemplate("Hello {{Name}}", { Name: "World" });
		expect(out).toBe("Hello World");
	});

	it("validateVariables should succeed when all variables present", async () => {
		const pattern = await Effect.runPromise(
			getPattern("validation-filter-or-fail")
		);

		await Effect.runPromise(
			validateVariables(pattern, {
				Name: "FilePath",
				paramName: "filePath",
				paramType: "string",
				shortName: "p",
				condition: "p.length > 0",
				errorMessage: "bad",
			})
		);
	});

	it("validateVariables should fail when variables missing", async () => {
		const pattern = await Effect.runPromise(
			getPattern("service-effect-service")
		);

		await expect(
			Effect.runPromise(validateVariables(pattern, { ServiceName: "Foo" }))
		).rejects.toThrow(/Missing template variables/);
	});
});
