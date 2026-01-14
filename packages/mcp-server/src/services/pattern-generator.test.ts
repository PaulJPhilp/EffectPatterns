import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import {
	PatternGeneratorService,
	PatternGeneratorServiceLive,
} from "./pattern-generator";

const TestLayer = Layer.provide(PatternGeneratorServiceLive, Layer.empty);

describe("PatternGeneratorService", () => {
	it("should generate code for a known pattern", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const generator = yield* PatternGeneratorService;
				return yield* generator.generate({
					patternId: "validation-filter-or-fail",
					variables: {
						Name: "FilePath",
						paramName: "filePath",
						paramType: "string",
						shortName: "p",
						condition: "p.length > 0",
						errorMessage: "bad",
					},
				});
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.patternId).toBe("validation-filter-or-fail");
		expect(result.imports.length).toBeGreaterThan(0);
		expect(result.code).toContain("validateFilePath");
	});

	it("should fail when patternId is unknown", async () => {
		await expect(
			Effect.runPromise(
				Effect.gen(function* () {
					const generator = yield* PatternGeneratorService;
					return yield* generator.generate({
						patternId: "does-not-exist",
						variables: {},
					});
				}).pipe(Effect.provide(TestLayer))
			)
		).rejects.toThrow(/Unknown patternId/);
	});

	it("should fail when required variables are missing", async () => {
		await expect(
			Effect.runPromise(
				Effect.gen(function* () {
					const generator = yield* PatternGeneratorService;
					return yield* generator.generate({
						patternId: "service-effect-service",
						variables: { ServiceName: "Foo" },
					});
				}).pipe(Effect.provide(TestLayer))
			)
		).rejects.toThrow(/Missing template variables/);
	});
});
