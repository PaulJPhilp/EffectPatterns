import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { CodeAnalyzerService } from "../services/code-analyzer";

describe("CodeAnalyzerService", () => {
	it("flags try/catch in Effect code", async () => {
		const source = [
			"import { Effect } from \"effect\";\n",
			"export const program = Effect.gen(function* () {\n",
			"  try {\n",
			"    return 1;\n",
			"  } catch (e) {\n",
			"    return 0;\n",
			"  }\n",
			"});\n",
		].join("");

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({
					source,
					filename: "src/services/a.ts",
					analysisType: "all",
				});
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);

		expect(result.findings.some((f) => f.ruleId === "try-catch-in-effect"))
			.toBe(true);
	});

	it("treats try/catch in route handlers as boundary guidance", async () => {
		const source = [
			"export async function GET() {\n",
			"  try {\n",
			"    return { ok: true };\n",
			"  } catch (e) {\n",
			"    return { ok: false };\n",
			"  }\n",
			"}\n",
		].join("");

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({
					source,
					filename: "app/api/health/route.ts",
					analysisType: "all",
				});
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);

		expect(result.findings.some((f) => f.ruleId === "try-catch-boundary-ok"))
			.toBe(true);
	});

	it("flags node:fs imports", async () => {
		const source = "import { readFile } from \"node:fs/promises\";\n";

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({
					source,
					filename: "src/services/fs.ts",
					analysisType: "all",
				});
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);

		expect(result.findings.some((f) => f.ruleId === "node-fs")).toBe(true);
	});
});
