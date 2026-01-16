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

describe("Scope Rule Tests", () => {
	describe("closing-resources-manually", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const file = yield* fs.readFile("file.txt");
  file.close(); // Manual cleanup
  return file;
})
`
			);
			expect(report.findings.some((f) => f.ruleId === "closing-resources-manually")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const content = yield* fs.readFile("file.txt");
  return content;
})
`
			);
			expect(report.findings.some((f) => f.ruleId === "closing-resources-manually")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  return yield* Effect.acquireRelease(
    Effect.gen(function* () {
      const file = yield* fs.readFile("file.txt");
      return file;
    }),
    (file) => Effect.sync(() => file.close())
  );
})
`
			);
			expect(report.findings.some((f) => f.ruleId === "closing-resources-manually")).toBe(false);
		});
	});

	describe("returning-resources-instead-of-effects", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
class DatabaseConnection {
  constructor(public readonly connection: any) {}
}

function createConnection(): DatabaseConnection {
  return new DatabaseConnection({ connect: () => {} });
}

Effect.gen(function* () {
  const conn = createConnection();
  return yield* Effect.succeed(conn);
})
`
			);
			expect(report.findings.some((f) => f.ruleId === "returning-resources-instead-of-effects")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const conn = yield* DatabaseService;
  return yield* conn.query("SELECT * FROM users");
})
`
			);
			expect(report.findings.some((f) => f.ruleId === "returning-resources-instead-of-effects")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function processData() {
  return Effect.succeed("data");
}

function useData() {
  return processData();
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "returning-resources-instead-of-effects")).toBe(false);
		});
	});

	describe("node-fs", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const fs = require('fs');
  fs.readFileSync('file.txt', 'utf-8');
  return yield* Effect.succeed("done");
})
`
			);
			expect(report.findings.some((f) => f.ruleId === "node-fs")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const content = yield* readFile("file.txt");
  return content;
})
`
			);
			expect(report.findings.some((f) => f.ruleId === "node-fs")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
import { readFile } from './fs-utils';

Effect.gen(function* () {
  const content = yield* readFile("file.txt");
  return content;
})
`
			);
			expect(report.findings.some((f) => f.ruleId === "node-fs")).toBe(false);
		});
	});

	describe("manual-resource-lifecycle", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const connection = yield* Effect.succeed({ close: () => {} });
  try {
    return yield* Effect.succeed("result");
  } finally {
    connection.close(); // Manual cleanup
  }
})
`
			);
			expect(report.findings.some((f) => f.ruleId === "manual-resource-lifecycle")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const content = yield* fs.readFile("file.txt");
  return content;
})
`
			);
			expect(report.findings.some((f) => f.ruleId === "manual-resource-lifecycle")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  return yield* Effect.acquireRelease(
    Effect.gen(function* () {
      const connection = yield* Effect.succeed({ close: () => {} });
      return yield* Effect.succeed("result");
    }),
    (connection) => Effect.sync(() => connection.close())
  );
})
`
			);
			expect(report.findings.some((f) => f.ruleId === "manual-resource-lifecycle")).toBe(false);
		});
	});
});
