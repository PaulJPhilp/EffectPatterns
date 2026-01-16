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

describe("Correctness Rule Tests", () => {
	describe("async-await", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  async function fetchData() {
    const response = await fetch('/api/data');
    return response.json();
  }
  return yield* fetchData();
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "async-await")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
const fetchData = Effect.gen(function* () {
  const response = yield* Effect.tryPromise(() => fetch('/api/data'));
  return yield* Effect.tryPromise(() => response.json());
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "async-await")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function fetchData() {
  return fetch('/api/data').then(response => response.json());
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "async-await")).toBe(false);
		});
	});

	describe("promise-all-in-effect", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const results = yield* Promise.all([
    fetch('/api/1'),
    fetch('/api/2'),
    fetch('/api/3')
  ]);
  return results;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "promise-all-in-effect")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const results = yield* Effect.all([
    Effect.tryPromise(() => fetch('/api/1')),
    Effect.tryPromise(() => fetch('/api/2')),
    Effect.tryPromise(() => fetch('/api/3'))
  ]);
  return results;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "promise-all-in-effect")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function fetchAll() {
  return Promise.all([
    fetch('/api/1'),
    fetch('/api/2'),
    fetch('/api/3')
  ]);
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "promise-all-in-effect")).toBe(false);
		});
	});

	describe("console-log", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  console.log('Processing data');
  const data = yield* fetchData();
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "console-log-in-effect")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  yield* Effect.log('Processing data');
  const data = yield* fetchData();
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "console-log-in-effect")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function processData() {
  console.log('Processing data');
  return fetchData();
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "console-log-in-effect")).toBe(false);
		});
	});

	describe("node-fs", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
import { readFile } from "node:fs/promises";

Effect.gen(function* () {
  const content = yield* Effect.tryPromise(() => readFile("file.txt", "utf-8"));
  return content;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "node-fs")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const content = yield* fs.readFile("file.txt");
  return content;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "node-fs")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function readFile() {
  return import("node:fs/promises").then(fs => fs.readFile("file.txt", "utf-8"));
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "node-fs")).toBe(false);
		});
	});

	describe("throw-in-effect-code", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  if (!isValid) {
    throw new Error('Invalid data');
  }
  return yield* processData();
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
  if (!isValid) {
    return yield* Effect.fail(new Error('Invalid data'));
  }
  return yield* processData();
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "throw-inside-effect-logic")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function processData() {
  if (!isValid) {
    throw new Error('Invalid data');
  }
  return data;
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "throw-inside-effect-logic")).toBe(false);
		});
	});

	describe("any-type", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const data: any = yield* fetchData();
  return data.process();
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "any-type")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const data = yield* fetchData();
  return data.process();
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "any-type")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function processData(data: unknown) {
  return typeof data === 'object' && data !== null ? data : null;
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "any-type")).toBe(false);
		});
	});

	describe("effect-runSync-unsafe", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const data = Effect.runSync(fetchData());
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "effect-runSync-unsafe")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const data = yield* fetchData();
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "effect-runSync-unsafe")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"app/api/route.ts",
				`
function getData() {
  return Effect.runSync(Effect.succeed(42));
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "effect-runSync-unsafe")).toBe(false);
		});
	});

	describe("effect-run-promise-boundary", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const data = yield* Effect.runPromise(fetchData());
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "effect-run-promise-boundary")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const data = yield* fetchData();
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "effect-run-promise-boundary")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"app/api/route.ts",
				`
async function main() {
  const data = await Effect.runPromise(fetchData());
  return data;
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "effect-run-promise-boundary")).toBe(false);
		});
	});

	describe("incorrect-promise-bridge", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const promise = fetchData();
  const data = yield* Effect.tryPromise(() => promise);
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "incorrect-promise-bridge")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const data = yield* fetchData();
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "incorrect-promise-bridge")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function processData() {
  return Effect.tryPromise(() => fetchData());
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "incorrect-promise-bridge")).toBe(false);
		});
	});

	describe("run-effect-outside-boundary", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
function processData() {
  return Effect.runPromise(
    Effect.gen(function* () {
      const data = yield* fetchData();
      return data;
    })
  );
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "run-effect-outside-boundary")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
const processData = Effect.gen(function* () {
  const data = yield* fetchData();
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "run-effect-outside-boundary")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"app/api/route.ts",
				`
async function main() {
  return await Effect.runPromise(
    Effect.gen(function* () {
      const data = yield* fetchData();
      return data;
    })
  );
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "run-effect-outside-boundary")).toBe(false);
		});
	});

	describe("yield-instead-of-yield-star", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const data = yield fetchData();
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "yield-instead-of-yield-star")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const data = yield* fetchData();
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "yield-instead-of-yield-star")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function* generator() {
  const data = yield fetchData();
  return data;
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "yield-instead-of-yield-star")).toBe(false);
		});
	});

	describe("async-callbacks-in-effect-combinators", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const items = [1, 2, 3];
  return yield* Effect.forEach(items, async (item) => {
    return await processItem(item);
  });
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "async-callbacks-in-effect-combinators")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const items = [1, 2, 3];
  return yield* Effect.forEach(items, (item) => processItem(item));
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "async-callbacks-in-effect-combinators")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function processItems(items: number[]) {
  return items.map(async (item) => await processItem(item));
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "async-callbacks-in-effect-combinators")).toBe(false);
		});
	});

	describe("promise-apis-inside-effect-logic", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const data = yield* Effect.tryPromise(() => 
    Promise.all([fetchData1(), fetchData2()])
  );
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "promise-apis-inside-effect-logic")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const data = yield* Effect.all([fetchData1(), fetchData2()]);
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "promise-apis-inside-effect-logic")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function fetchAll() {
  return Promise.all([fetchData1(), fetchData2()]);
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "promise-apis-inside-effect-logic")).toBe(false);
		});
	});
});
