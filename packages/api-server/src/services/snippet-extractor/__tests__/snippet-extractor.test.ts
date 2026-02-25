import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import type { Finding } from "../../../tools/schemas";
import { MCPConfigService } from "../../config";
import { MCPLoggerService } from "../../logger";
import { SnippetExtractorService } from "../api";

const TestLayer = Layer.provideMerge(
	SnippetExtractorService.Default,
	Layer.provideMerge(
		MCPLoggerService.Default,
		MCPConfigService.Default
	)
);

describe("SnippetExtractorService", () => {
	it("should extract a code snippet with context", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* SnippetExtractorService;

		const sourceCode = `function test() {
	if (true) {
		const x = 1;
		const y = 2;
		const z = 3;
	}
}`;

		const finding: Finding = {
			id: "test-1",
			title: "Test finding",
			range: {
				startLine: 4,
				startCol: 0,
				endLine: 4,
				endCol: 15,
			},
			message: "Test finding",
			ruleId: "async-await",
			severity: "medium",
			refactoringIds: [],
		};

		const res = yield* service.extract(finding, sourceCode, 2);
		return res;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toHaveProperty("beforeContext");
		expect(result).toHaveProperty("targetLines");
		expect(result).toHaveProperty("afterContext");
		expect(result.startLine).toBe(4);
		expect(result.endLine).toBe(4);
		expect(result.targetLines.length).toBe(1);
	});

	it("should extract snippet from input object", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* SnippetExtractorService;

		const sourceCode = `const a = 1;
const b = 2;
const c = 3;`;

		const input = {
			finding: {
				id: "test-2",
				title: "Test",
				range: {
					startLine: 2,
					startCol: 0,
					endLine: 2,
					endCol: 10,
				},
				message: "Test",
				ruleId: "async-await" as const,
				severity: "low" as const,
				refactoringIds: [],
			},
			source: sourceCode,
			contextLines: 1,
		};

		const res = yield* service.extractFromInput(input);
		return res;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toHaveProperty("beforeContext");
		expect(result).toHaveProperty("targetLines");
		expect(result).toHaveProperty("afterContext");
	});

	it("should handle multi-line findings", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* SnippetExtractorService;

		const sourceCode = `line 1
line 2
line 3
line 4
line 5`;

		const finding: Finding = {
			id: "test-3",
			title: "Multi-line finding",
			range: {
				startLine: 2,
				startCol: 0,
				endLine: 4,
				endCol: 6,
			},
			message: "Multi-line finding",
			ruleId: "async-await",
			severity: "high",
			refactoringIds: [],
		};

		const res = yield* service.extract(finding, sourceCode);
		return res;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.targetLines.length).toBe(3);
		expect(result.startLine).toBe(2);
		expect(result.endLine).toBe(4);
	});
});
