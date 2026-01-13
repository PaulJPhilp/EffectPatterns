import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { CodeAnalyzerService } from "./code-analyzer";

describe("CodeAnalyzerService (Option A)", () => {
	it("flags try/catch in Effect logic as an anti-pattern", async () => {
		const source = `
import { Effect } from "effect";

export const program = Effect.gen(function* () {
	try {
		return 1;
	} catch (e) {
		return 0;
	}
});
`;

		const result = await Effect.gen(function* () {
			const analyzer = yield* CodeAnalyzerService;
			return yield* analyzer.analyze({
				source,
				filename: "src/services/my-service.ts",
				analysisType: "all",
			});
		}).pipe(Effect.provide(CodeAnalyzerService.Default), Effect.runPromise);

		expect(result.suggestions.map((s) => s.id)).toContain(
			"try-catch-in-effect"
		);
		expect(result.findings.map((f) => f.ruleId)).toContain(
			"try-catch-in-effect"
		);
	});

	it("flags async/await usage in service code", async () => {
		const source = `
export const foo = async () => {
	await Promise.resolve(1);
	return 1;
};
`;

		const result = await Effect.gen(function* () {
			const analyzer = yield* CodeAnalyzerService;
			return yield* analyzer.analyze({
				source,
				filename: "src/services/my-service.ts",
				analysisType: "all",
			});
		}).pipe(Effect.provide(CodeAnalyzerService.Default), Effect.runPromise);

		expect(result.suggestions.map((s) => s.id)).toContain(
			"async-await"
		);
		expect(result.findings.map((f) => f.ruleId)).toContain(
			"async-await"
		);
	});

	it("treats try/catch in route handlers as boundary guidance", async () => {
		const source = `
import { NextResponse } from "next/server";
import { Effect } from "effect";

export async function GET() {
	try {
		return NextResponse.json({ ok: true });
	} catch (e) {
		return NextResponse.json({ ok: false }, { status: 500 });
	}
}
`;

		const result = await Effect.gen(function* () {
			const analyzer = yield* CodeAnalyzerService;
			return yield* analyzer.analyze({
				source,
				filename: "app/api/health/route.ts",
				analysisType: "all",
			});
		}).pipe(Effect.provide(CodeAnalyzerService.Default), Effect.runPromise);

		expect(result.suggestions.map((s) => s.id)).toContain(
			"try-catch-boundary-ok"
		);
		expect(result.findings.map((f) => f.ruleId)).toContain(
			"try-catch-boundary-ok"
		);
	});

	it("flags catch blocks that log and swallow errors", async () => {
		const source = `
import { Effect } from "effect";

export const program = Effect.gen(function* () {
	try {
		return 1;
	} catch (e) {
		console.error(e);
		return;
	}
});
`;

		const result = await Effect.gen(function* () {
			const analyzer = yield* CodeAnalyzerService;
			return yield* analyzer.analyze({
				source,
				filename: "src/services/my-service.ts",
				analysisType: "all",
			});
		}).pipe(Effect.provide(CodeAnalyzerService.Default), Effect.runPromise);

		expect(result.suggestions.map((s) => s.id)).toContain(
			"catch-log-and-swallow"
		);
		expect(result.findings.map((f) => f.ruleId)).toContain(
			"catch-log-and-swallow"
		);
	});

	it("flags throw inside Effect code", async () => {
		const source = `
import { Effect } from "effect";

export const program = Effect.gen(function* () {
	throw new Error("boom");
});
`;

		const result = await Effect.gen(function* () {
			const analyzer = yield* CodeAnalyzerService;
			return yield* analyzer.analyze({
				source,
				filename: "src/services/my-service.ts",
				analysisType: "all",
			});
		}).pipe(Effect.provide(CodeAnalyzerService.Default), Effect.runPromise);

		expect(result.suggestions.map((s) => s.id)).toContain(
			"throw-in-effect-code"
		);
		expect(result.findings.map((f) => f.ruleId)).toContain(
			"throw-in-effect-code"
		);
	});

	it("flags Effect.map(functionReference) and links the wrap-effect-map-callback fix", async () => {
		const source = `
import { Effect } from "effect";

const myFn = (n: number) => n + 1;

export const program = Effect.succeed(1).pipe(Effect.map(myFn));
`;

		const result = await Effect.gen(function* () {
			const analyzer = yield* CodeAnalyzerService;
			return yield* analyzer.analyze({
				source,
				filename: "src/services/my-service.ts",
				analysisType: "all",
			});
		}).pipe(Effect.provide(CodeAnalyzerService.Default), Effect.runPromise);

		expect(result.suggestions.map((s) => s.id)).toContain(
			"effect-map-fn-reference"
		);

		const finding = result.findings.find(
			(f) => f.ruleId === "effect-map-fn-reference"
		);
		expect(finding).toBeDefined();
		expect(finding?.refactoringIds).toContain("wrap-effect-map-callback");
	});
});
