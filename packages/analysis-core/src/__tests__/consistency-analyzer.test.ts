import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { ConsistencyAnalyzerService } from "../services/consistency-analyzer";

describe("ConsistencyAnalyzerService", () => {
	it("detects mixed filesystem abstractions", async () => {
		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* ConsistencyAnalyzerService;
				return yield* analyzer.analyze({
					files: [
						{
							filename: "a.ts",
							source: "import { readFile } from \"node:fs/promises\";\n",
						},
						{
							filename: "b.ts",
							source: "import { FileSystem } from \"@effect/platform\";\n",
						},
					],
				});
			}).pipe(Effect.provide(ConsistencyAnalyzerService.Default))
		);

		expect(output.issues.some((i) => i.id === "mixed-fs")).toBe(true);
	});

	it("detects mixed validation approaches", async () => {
		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* ConsistencyAnalyzerService;
				return yield* analyzer.analyze({
					files: [
						{
							filename: "a.ts",
							source: "const x = Effect.filterOrFail(1, () => new Error());\n",
						},
						{ filename: "b.ts", source: "const y = 1;\n" },
					],
				});
			}).pipe(Effect.provide(ConsistencyAnalyzerService.Default))
		);

		expect(output.issues.some((i) => i.id === "mixed-validation"))
			.toBe(true);
	});

	it("returns no issues when all files use platform fs", async () => {
		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* ConsistencyAnalyzerService;
				return yield* analyzer.analyze({
					files: [
						{
							filename: "a.ts",
							source: "import { FileSystem } from \"@effect/platform\";\n",
						},
						{
							filename: "b.ts",
							source: "import { FileSystem } from \"@effect/platform\";\n",
						},
					],
				});
			}).pipe(Effect.provide(ConsistencyAnalyzerService.Default))
		);

		expect(output.issues.some((i) => i.id === "mixed-fs")).toBe(false);
	});

	it("returns no issues when all files use node:fs", async () => {
		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* ConsistencyAnalyzerService;
				return yield* analyzer.analyze({
					files: [
						{
							filename: "a.ts",
							source: "import fs from \"node:fs\";\n",
						},
						{
							filename: "b.ts",
							source: "import { readFile } from \"node:fs/promises\";\n",
						},
					],
				});
			}).pipe(Effect.provide(ConsistencyAnalyzerService.Default))
		);

		expect(output.issues.some((i) => i.id === "mixed-fs")).toBe(false);
	});

	it("returns no issues when all files use filterOrFail", async () => {
		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* ConsistencyAnalyzerService;
				return yield* analyzer.analyze({
					files: [
						{
							filename: "a.ts",
							source: "const x = Effect.filterOrFail(1, () => new Error());\n",
						},
						{
							filename: "b.ts",
							source: "const y = filterOrFail(2, () => new Error());\n",
						},
					],
				});
			}).pipe(Effect.provide(ConsistencyAnalyzerService.Default))
		);

		expect(output.issues.some((i) => i.id === "mixed-validation")).toBe(false);
	});

	it("returns no issues for empty file list", async () => {
		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* ConsistencyAnalyzerService;
				return yield* analyzer.analyze({ files: [] });
			}).pipe(Effect.provide(ConsistencyAnalyzerService.Default))
		);

		expect(output.issues).toHaveLength(0);
	});
});
