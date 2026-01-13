import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import {
	RefactoringEngineService,
	RefactoringEngineServiceLive,
} from "./refactoring-engine";

const TestLayer = Layer.provide(
	RefactoringEngineServiceLive,
	Layer.empty
);

describe("RefactoringEngineService", () => {
	it("should always return applied=false (preview-only)", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				const output = yield* engine.apply({
					refactoringId: "replace-node-fs",
					files: [
						{
							filename: "test.ts",
							source: 'import { readFile } from "node:fs/promises";',
						},
					],
					preview: false,
				});

				return output;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.applied).toBe(false);
	});

	it("should replace node:fs imports", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				const output = yield* engine.apply({
					refactoringId: "replace-node-fs",
					files: [
						{
							filename: "test.ts",
							source: 'import { readFile } from "node:fs/promises";',
						},
					],
					preview: true,
				});

				return output;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.applied).toBe(false);
		expect(result.changes).toHaveLength(1);
		expect(result.changes[0].filename).toBe("test.ts");
		expect(result.changes[0].before).toContain('from "node:fs/promises"');
		expect(result.changes[0].after).toContain('from "@effect/platform"');
	});

	it("should add filterOrFail validator", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				const output = yield* engine.apply({
					refactoringId: "add-filter-or-fail-validator",
					files: [
						{
							filename: "test.ts",
							source: "export const foo = () => {}",
						},
					],
					preview: true,
				});

				return output;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.applied).toBe(false);
		expect(result.changes).toHaveLength(1);
		expect(result.changes[0].after).toContain("validateFilePath");
		expect(result.changes[0].after).toContain("Effect.filterOrFail");
	});

	it("should return empty changes when refactoring does not apply", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				const output = yield* engine.apply({
					refactoringId: "replace-node-fs",
					files: [
						{
							filename: "test.ts",
							source: 'import { Effect } from "effect";',
						},
					],
					preview: true,
				});

				return output;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.applied).toBe(false);
		expect(result.changes).toHaveLength(0);
	});

	it("should handle empty file list", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				const output = yield* engine.apply({
					refactoringId: "replace-node-fs",
					files: [],
					preview: true,
				});

				return output;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.applied).toBe(false);
		expect(result.changes).toHaveLength(0);
	});
});
