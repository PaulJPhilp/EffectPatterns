import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { AnalysisService } from "../services/analysis-service";

const run = (filename: string, source: string) =>
	Effect.runPromise(
		Effect.gen(function* () {
			const analysisService = yield* AnalysisService;
			return yield* analysisService.analyzeFile(filename, source);
		}).pipe(
			Effect.provide(AnalysisService.Default)
		)
	);

describe("Error Modeling Rule Tests", () => {
	describe("throw-in-effect-code", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
import { Effect } from "effect";

function unsafeMethod() {
  // This file looks like Effect code because of the import
  if (Math.random() > 0.5) {
    throw new Error('Random failure');
  }
  return Effect.succeed(1);
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "throw-in-effect-code")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
import { Effect } from "effect";

function safeMethod() {
  if (Math.random() > 0.5) {
    return Effect.fail(new Error('Random failure'));
  }
  return Effect.succeed(1);
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "throw-in-effect-code")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
// No Effect import or usage, so likely legacy code
function legacyMethod() {
  throw new Error('Legacy error');
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "throw-in-effect-code")).toBe(false);
		});
	});

	describe("try-catch-in-effect", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  try {
    const data = yield* riskyOperation();
    return data;
  } catch (error) {
    yield* Effect.log(\`Error: \${error}\`);
    throw error;
  }
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "try-catch-in-effect")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  return yield* riskyOperation().pipe(
    Effect.catchAll((error) => Effect.log(\`Error: \${error}\`))
  );
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "try-catch-in-effect")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function processData() {
  try {
    return riskyOperation();
  } catch (error) {
    console.error(error);
    throw error;
  }
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "try-catch-in-effect")).toBe(false);
		});
	});

	describe("catch-log-and-swallow", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  return yield* riskyOperation().pipe(
    Effect.catchAll((error) => {
      console.log(\`Error: \${error}\`);
      return Effect.succeed(null);
    })
  );
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "catch-log-and-swallow")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  return yield* riskyOperation().pipe(
    Effect.catchAll((error) => Effect.fail(error))
  );
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "catch-log-and-swallow")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function processData() {
  try {
    return riskyOperation();
  } catch (error) {
    console.log(\`Error: \${error}\`);
    return null;
  }
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "catch-log-and-swallow")).toBe(false);
		});
	});

	describe("missing-error-channel", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  try {
    return yield* riskyOperation();
  } catch (error) {
    // Error not propagated via Effect.fail
    return null;
  }
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "missing-error-channel")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  return yield* riskyOperation().pipe(
    Effect.catchAll((error) => Effect.fail(error))
  );
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "missing-error-channel")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function processData() {
  try {
    return riskyOperation();
  } catch (error) {
    throw error; // Re-throw to preserve error channel
  }
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "missing-error-channel")).toBe(false);
		});
	});

	describe("throw-in-effect-pipeline", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
import { Effect } from "effect";

Effect.map(Effect.succeed([1, 2, 3]), items => {
  if (items.length === 0) {
    throw new Error('No items');
  }
  return items;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "throw-in-effect-pipeline")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
import { Effect } from "effect";

Effect.flatMap(Effect.succeed([1, 2, 3]), items => {
  if (items.length === 0) {
    return Effect.fail(new Error('No items'));
  }
  return Effect.succeed(items);
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "throw-in-effect-pipeline")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function processItems(items) {
  if (items.length === 0) {
    throw new Error('No items');
  }
  return items;
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "throw-in-effect-pipeline")).toBe(false);
		});
	});

	describe("swallow-failures-without-logging", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  return yield* riskyOperation().pipe(
    Effect.catchAll(() => Effect.succeed(null))
  );
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "swallow-failures-without-logging")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  return yield* riskyOperation().pipe(
    Effect.catchAll((error) => Effect.log(\`Error: \${error}\`).pipe(Effect.map(() => null)))
  );
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "swallow-failures-without-logging")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function processData() {
  try {
    return riskyOperation();
  } catch {
    return null;
  }
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "swallow-failures-without-logging")).toBe(false);
		});
	});

	describe("generic-error-type", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  return yield* riskyOperation().pipe(
    Effect.catchAll((error: Error) => Effect.fail(error))
  );
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "generic-error-type")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  return yield* riskyOperation().pipe(
    Effect.catchAll((error: NetworkError) => Effect.fail(error))
  );
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "generic-error-type")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function handleError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "generic-error-type")).toBe(false);
		});
	});

	describe("throw-inside-effect-logic", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const data = yield* fetchData();
  if (!data.valid) {
    throw new Error('Invalid data');
  }
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "throw-inside-effect-logic")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const data = yield* fetchData();
  if (!data.valid) {
    return yield* Effect.fail(new Error('Invalid data'));
  }
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "throw-inside-effect-logic")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function validateData(data) {
  if (!data.valid) {
    throw new Error('Invalid data');
  }
  return data;
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "throw-inside-effect-logic")).toBe(false);
		});
	});
});
