import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { CodeAnalyzerService } from "../services/code-analyzer";

describe("CodeAnalyzerService - branch coverage", () => {
	it("flags non-typescript files", async () => {
		const source = "console.log('x')\n";

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({
					source,
					filename: "README.md",
					analysisType: "all",
					config: { rules: { "non-typescript": "warn" } },
				});
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);

		expect(
			result.findings.some((f) => f.ruleId === "non-typescript")
		).toBe(true);
	});

	it("flags try/catch as boundary-ok in route handlers", async () => {
		const source = [
			"import { NextRequest, NextResponse } from \"next/server\";",
			"export async function GET(req: NextRequest) {",
			"  try {",
			"    return NextResponse.json({ ok: true });",
			"  } catch (e) {",
			"    return NextResponse.json({ error: String(e) }, { status: 500 });",
			"  }",
			"}",
		].join("\n");

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({
					source,
					filename: "app/api/foo/route.ts",
					analysisType: "all",
					config: { rules: { "try-catch-boundary-ok": "warn" } },
				});
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);

		expect(
			result.findings.some((f) => f.ruleId === "try-catch-boundary-ok")
		).toBe(true);
	});

	it("does not flag try/catch in boundary files", async () => {
		const source = [
			"import { NextRequest, NextResponse } from \"next/server\";",
			"export async function handler(req: NextRequest) {",
			"  try {",
			"    return NextResponse.json({ ok: true });",
			"  } catch (e) {",
			"    return NextResponse.json({ error: e.message }, { status: 500 });",
			"  }",
			"}",
		].join("\n");

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({
					source,
					filename: "route.ts",
					analysisType: "all",
				});
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);

		expect(result.findings.some(f => f.ruleId === "try-catch-in-effect")).toBe(false);
	});

	it("detects catch-log-and-swallow pattern", async () => {
		const source = [
			"import { Effect } from \"effect\";",
			"const program = Effect.succeed(1).pipe(",
			"  Effect.map(() => { throw new Error(\"boom\"); })",
			");",
			"Effect.runSync(() => {",
			"  try {",
			"    const x = program;",
			"  } catch (e) {",
			"    console.log(e);",
			"    return;",
			"  }",
			"});",
		].join("\n");

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({
					source,
					filename: "a.ts",
					analysisType: "all",
				});
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);

		expect(result.findings.some(f => f.ruleId === "catch-log-and-swallow")).toBe(true);
	});

	it("does not flag catch-log-and-swallow when Effect.fail is present", async () => {
		const source = [
			"import { Effect } from \"effect\";",
			"const program = Effect.succeed(1).pipe(",
			"  Effect.map(() => { throw new Error(\"boom\"); })",
			");",
			"Effect.runSync(() => {",
			"  try {",
			"    const x = program;",
			"  } catch (e) {",
			"    console.log(e);",
			"    Effect.fail(e);",
			"  }",
			"});",
		].join("\n");

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({
					source,
					filename: "a.ts",
					analysisType: "all",
				});
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);

		expect(result.findings.some(f => f.ruleId === "catch-log-and-swallow")).toBe(false);
	});

	it("detects throw in Effect code", async () => {
		const source = [
			"import { Effect } from \"effect\";",
			"Effect.runSync(() => {",
			"  if (Math.random() > 0.5) {",
			"    throw new Error(\"bad luck\");",
			"  }",
			"});",
		].join("\n");

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({
					source,
					filename: "a.ts",
					analysisType: "all",
				});
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);

		expect(result.findings.some(f => f.ruleId === "throw-in-effect-code")).toBe(true);
	});

	it("does not flag throw in non-Effect code", async () => {
		const source = [
			"function foo() {",
			"  throw new Error(\"no effect\");",
			"}",
		].join("\n");

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({
					source,
					filename: "a.ts",
					analysisType: "all",
				});
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);

		expect(result.findings.some(f => f.ruleId === "throw-in-effect-code")).toBe(false);
	});

	it("detects mutable refs inside Effect.gen", async () => {
		const source = `
import { Effect } from "effect";
const program = Effect.gen(function* () {
  let x = 1;
  yield* Effect.log(x);
});
`;
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({ source, filename: "a.ts" });
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);
		expect(result.findings.some(f => f.ruleId === "mutable-ref-in-effect")).toBe(true);
	});

	it("detects Layer.provide inside a service definition", async () => {
		const source = `
import { Effect, Layer } from "effect";
class MyService extends Effect.Service<MyService>()("MyService", {
  sync: () => {
    Layer.provide(Layer.succeed(1, 1));
    return {};
  }
}) {}
`;
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({ source, filename: "a.ts" });
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);
		expect(result.findings.some(f => f.ruleId === "layer-provide-anti-pattern")).toBe(true);
	});

	it("detects Effect.gen without yield*", async () => {
		const source = `
import { Effect } from "effect";
const program = Effect.gen(function* () {
  return 42;
});
`;
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({ source, filename: "a.ts" });
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);
		expect(result.findings.some(f => f.ruleId === "effect-gen-no-yield")).toBe(true);
	});
});
