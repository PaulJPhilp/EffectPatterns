import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { RefactoringEngineService } from "../services/refactoring-engine";

describe("RefactoringEngineService", () => {
	it("replaces node:fs imports", async () => {
		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringId: "replace-node-fs",
					files: [
						{
							filename: "a.ts",
							source: "import { readFile } from \"node:fs/promises\";\n",
						},
					],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.applied).toBe(false);
		expect(output.changes).toHaveLength(1);
		expect(output.changes[0].after).toContain("@effect/platform");
	});

	it("replaces node:fs import (non-promises)", async () => {
		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringId: "replace-node-fs",
					files: [
						{
							filename: "a.ts",
							source: "import * as fs from \"node:fs\";\n",
						},
					],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.changes).toHaveLength(1);
		expect(output.changes[0].after).toContain("@effect/platform");
	});

	it("does not change file when replace-node-fs pattern is absent", async () => {
		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringId: "replace-node-fs",
					files: [{ filename: "a.ts", source: "export const x = 1;\n" }],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.changes).toHaveLength(0);
	});

	it("wraps Effect.map callback when passed a function reference", async () => {
		const source = [
			"import { Effect } from \"effect\";\n",
			"const myFn = (n: number) => n + 1;\n",
			"const program = Effect.succeed(1).pipe(Effect.map(myFn));\n",
		].join("");

		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringId: "wrap-effect-map-callback",
					files: [{ filename: "a.ts", source }],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.applied).toBe(false);
		expect(output.changes).toHaveLength(1);
		expect(output.changes[0].after).toMatch(
			/Effect\.map\(\(?x\)?\s*=>\s*myFn\(x\)\)/
		);
	});

	it("replaces Promise.all with Effect.all", async () => {
		const source = [
			"import { Effect } from \"effect\";\n",
			"const program = Promise.all([Promise.resolve(1)]);\n",
		].join("");

		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringId: "replace-promise-all",
					files: [{ filename: "a.ts", source }],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.applied).toBe(false);
		expect(output.changes).toHaveLength(1);
		expect(output.changes[0].after).toContain("Effect.all");
		expect(output.changes[0].after).not.toContain("Promise.all");
	});

	it("replaces console log calls with Effect log calls", async () => {
		const source = [
			"import { Effect } from \"effect\";\n",
			"console.log(\"a\");\n",
			"console.info(\"b\");\n",
			"console.warn(\"c\");\n",
			"console.error(\"d\");\n",
			"const x = \"console.log(\\\"nope\\\")\";\n",
		].join("");

		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringId: "replace-console-log",
					files: [{ filename: "a.ts", source }],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.applied).toBe(false);
		expect(output.changes).toHaveLength(1);
		const after = output.changes[0].after;
		expect(after).toContain("Effect.log(\"a\")");
		expect(after).toContain("Effect.log(\"b\")");
		expect(after).toContain("Effect.logWarning(\"c\")");
		expect(after).toContain("Effect.logError(\"d\")");
		expect(after).toContain("const x = \"console.log(\\\"nope\\\")\"");
	});

	it("adds schema decode comment to JSON.parse calls", async () => {
		const source = [
			"const data = JSON.parse(raw);\n",
			"const s = \"JSON.parse(raw)\";\n",
		].join("");

		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringId: "add-schema-decode",
					files: [{ filename: "a.ts", source }],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.applied).toBe(false);
		expect(output.changes).toHaveLength(1);
		const after = output.changes[0].after;
		expect(after).toContain("TODO: Use Schema.decodeUnknown");
		expect(after).toContain("JSON.parse(raw)");
		expect(after).toContain("const s = \"JSON.parse(raw)\"");
	});

	it("replaces Context.Tag with Effect.Service class", async () => {
		const source = [
			"import { Context } from \"effect\";\n",
			"export interface Foo { readonly x: number }\n",
			"export const Foo = Context.Tag<Foo>(\"Foo\");\n",
		].join("");

		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringId: "replace-context-tag",
					files: [{ filename: "a.ts", source }],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.applied).toBe(false);
		expect(output.changes).toHaveLength(1);
		const after = output.changes[0].after;
		expect(after).toContain("import { Context, Effect }");
		expect(after).toContain("export class Foo extends Effect.Service<Foo>()");
		expect(after).not.toContain("Context.Tag<Foo>");
	});

	it("adds filterOrFail validator at end of file and ensures Effect import", async () => {
		const source = [
			"export const ok = 1;\n",
		].join("");

		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringId: "add-filter-or-fail-validator",
					files: [{ filename: "a.ts", source }],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.applied).toBe(false);
		expect(output.changes).toHaveLength(1);
		const after = output.changes[0].after;
		expect(after).toContain("from \"effect\"");
		expect(after).toContain("validateFilePath");
		expect(after).toContain("Effect.filterOrFail");
	});

	it("no-op when no refactoring ids provided", async () => {
		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					files: [{ filename: "a.ts", source: "export const x = 1;\n" }],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);
		expect(output.changes).toHaveLength(0);
	});

	it("applies multiple refactoringIds in order", async () => {
		const source = [
			"import { readFile } from \"node:fs/promises\";\n",
			"console.log(\"x\");\n",
		].join("");
		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringIds: ["replace-node-fs", "replace-console-log"],
					files: [{ filename: "a.ts", source }],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.changes).toHaveLength(1);
		const after = output.changes[0].after;
		expect(after).toContain("@effect/platform");
		expect(after).toContain("Effect.log(\"x\")");
	});

	it("does not add validator when filterOrFail already exists", async () => {
		const source = [
			"import { Effect } from \"effect\";\n",
			"const x = Effect.succeed(1).pipe(Effect.filterOrFail(() => true, () => new Error()));\n",
		].join("");

		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringId: "add-filter-or-fail-validator",
					files: [{ filename: "a.ts", source }],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.changes).toHaveLength(0);
	});

	it("adds Effect to existing named import from effect", async () => {
		const source = [
			"import { Layer } from \"effect\";\n",
			"export const ok = 1;\n",
		].join("");

		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringId: "add-filter-or-fail-validator",
					files: [{ filename: "a.ts", source }],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.changes).toHaveLength(1);
		const after = output.changes[0].after;
		expect(after).toContain("import { Layer, Effect } from \"effect\"");
	});

	it("handles side-effect import of effect", async () => {
		const source = [
			"import \"effect\";\n",
			"export const ok = 1;\n",
		].join("");

		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringId: "add-filter-or-fail-validator",
					files: [{ filename: "a.ts", source }],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.changes).toHaveLength(1);
		const after = output.changes[0].after;
		expect(after).toContain("import { Effect } from \"effect\";");
	});

	it("does not modify effect namespace import", async () => {
		const source = [
			"import * as Effect from \"effect\";\n",
			"export const ok = 1;\n",
		].join("");

		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringId: "add-filter-or-fail-validator",
					files: [{ filename: "a.ts", source }],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.changes).toHaveLength(1);
		const after = output.changes[0].after;
		expect(after).toContain("import * as Effect from \"effect\"");
	});

	it("replaces Context.GenericTag with Effect.Service class", async () => {
		const source = [
			"import { Context } from \"effect\";\n",
			"export interface Bar { readonly y: number }\n",
			"export const Bar = Context.GenericTag<Bar>(\"Bar\");\n",
		].join("");

		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringId: "replace-context-tag",
					files: [{ filename: "a.ts", source }],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.changes).toHaveLength(1);
		const after = output.changes[0].after;
		expect(after).toContain("export class Bar extends Effect.Service<Bar>()");
		expect(after).not.toContain("Context.GenericTag<Bar>");
	});
});
