import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import {
	ConsistencyAnalyzerService,
	ConsistencyAnalyzerServiceLive,
} from "./consistency-analyzer";

const TestLayer = Layer.provide(
	ConsistencyAnalyzerServiceLive,
	Layer.empty
);

describe("ConsistencyAnalyzerService", () => {
	it("should detect mixed filesystem abstractions", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* ConsistencyAnalyzerService;
				const analysis = yield* analyzer.analyze({
					files: [
						{
							filename: "a.ts",
							source: 'import { readFile } from "node:fs/promises";',
						},
						{
							filename: "b.ts",
							source: 'import { FileSystem } from "@effect/platform";',
						},
					],
				});

				return analysis;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.issues).toHaveLength(1);
		expect(result.issues[0].id).toBe("mixed-fs");
		expect(result.issues[0].filenames).toEqual(["a.ts", "b.ts"]);
	});

	it("should detect mixed validation approaches", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* ConsistencyAnalyzerService;
				const analysis = yield* analyzer.analyze({
					files: [
						{
							filename: "a.ts",
							source: 'import { FileSystem } from "@effect/platform"; const validate = Effect.filterOrFail(...);',
						},
						{
							filename: "b.ts",
							source: "const foo = () => {}",
						},
					],
				});

				return analysis;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.issues).toHaveLength(1);
		expect(result.issues[0].id).toBe("mixed-validation");
		expect(result.issues[0].filenames).toEqual(["b.ts"]);
	});

	it("should report no issues when consistent", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* ConsistencyAnalyzerService;
				const analysis = yield* analyzer.analyze({
					files: [
						{
							filename: "a.ts",
							source: 'import { FileSystem } from "@effect/platform"; const validate = Effect.filterOrFail(...);',
						},
						{
							filename: "b.ts",
							source: "const validate = Effect.filterOrFail(...);",
						},
						{
							filename: "c.ts",
							source: "const other = Effect.filterOrFail(...);",
						},
					],
				});

				return analysis;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.issues).toHaveLength(0);
	});

	it("should handle empty file list", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* ConsistencyAnalyzerService;
				const analysis = yield* analyzer.analyze({ files: [] });

				return analysis;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.issues).toHaveLength(0);
	});
});
