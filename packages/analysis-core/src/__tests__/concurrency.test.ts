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

describe("Concurrency Rule Tests", () => {
	describe("unbounded-parallelism", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const items = Array.from({ length: 10000 }, (_, i) => i);
  return yield* Effect.all(items.map(item => processItem(item)));
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "unbounded-parallelism")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const items = Array.from({ length: 10000 }, (_, i) => i);
  return yield* Effect.all(items.map(item => processItem(item)), {
    concurrency: 10
  });
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "unbounded-parallelism")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function processAll(items: number[]) {
  return Promise.all(items.map(item => processItem(item)));
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "unbounded-parallelism")).toBe(false);
		});
	});

	describe("unbounded-parallelism-effect-all", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const items = Array.from({ length: 10000 }, (_, i) => i);
  return yield* Effect.all(items.map(item => processItem(item)));
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "unbounded-parallelism-effect-all")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const items = Array.from({ length: 10000 }, (_, i) => i);
  return yield* Effect.all(items.map(item => processItem(item)), {
    concurrency: 10
  });
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "unbounded-parallelism-effect-all")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function processAll(items: number[]) {
  return Promise.all(items.map(item => processItem(item)));
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "unbounded-parallelism-effect-all")).toBe(false);
		});
	});

	describe("fire-and-forget-fork", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  Effect.fork(backgroundTask());
  return yield* mainTask();
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "fire-and-forget-fork")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const fiber = yield* Effect.fork(backgroundTask());
  return yield* mainTask().pipe(
    Effect.tap(() => fiber.join())
  );
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "fire-and-forget-fork")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function startTasks() {
  setTimeout(backgroundTask, 0);
  return mainTask();
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "fire-and-forget-fork")).toBe(false);
		});
	});

	describe("forking-inside-loops", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const items = [1, 2, 3, 4, 5];
  for (const item of items) {
    Effect.fork(processItem(item));
  }
  return yield* finalize();
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "forking-inside-loops")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const items = [1, 2, 3, 4, 5];
  const fibers = yield* Effect.forEach(items, (item) => 
    Effect.fork(processItem(item))
  );
  return yield* Effect.forEach(fibers, (fiber) => fiber.join());
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "forking-inside-loops")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function processItems(items: number[]) {
  for (const item of items) {
    setTimeout(() => processItem(item), 0);
  }
  return finalize();
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "forking-inside-loops")).toBe(false);
		});
	});

	describe("racing-without-handling-losers", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const result = yield* Effect.race(
    fetchData(),
    timeout()
  );
  return result;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "racing-without-handling-losers")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  return yield* Effect.race(
    fetchData(),
    timeout(),
    Effect.match({
      onSuccess: (data) => data,
      onTimeout: () => null,
      onInterrupt: () => null
    })
  );
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "racing-without-handling-losers")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function raceOperations() {
  return Promise.race([
    fetchData(),
    timeout()
  ]);
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "racing-without-handling-losers")).toBe(false);
		});
	});

	describe("blocking-calls-in-effect", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
import * as fs from 'fs';
import { Effect } from 'effect';

Effect.gen(function* () {
  const data = fs.readFileSync('file.txt', 'utf-8');
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "blocking-calls-in-effect")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const data = yield* fs.readFile('file.txt');
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "blocking-calls-in-effect")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function readFile() {
  return fs.readFileSync('file.txt', 'utf-8');
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "blocking-calls-in-effect")).toBe(false);
		});
	});

	describe("blocking-calls-in-effect-logic", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
import * as fs from 'fs';
import { Effect } from 'effect';

Effect.gen(function* () {
  const data = fs.readFileSync('file.txt', 'utf-8');
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "blocking-calls-in-effect-logic")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const data = yield* fs.readFile('file.txt');
  return data;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "blocking-calls-in-effect-logic")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function readFile() {
  return fs.readFileSync('file.txt', 'utf-8');
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "blocking-calls-in-effect-logic")).toBe(false);
		});
	});

	describe("promise-concurrency-in-effect", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const promises = [
    fetch('/api/1'),
    fetch('/api/2'),
    fetch('/api/3')
  ];
  const results = yield* Promise.all(promises);
  return results;
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "promise-concurrency-in-effect")).toBe(true);
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
			expect(report.findings.some((f) => f.ruleId === "promise-concurrency-in-effect")).toBe(false);
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
			expect(report.findings.some((f) => f.ruleId === "promise-concurrency-in-effect")).toBe(false);
		});
	});

	describe("ignoring-fiber-failures", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  yield* Effect.fork(riskyOperation());
  return yield* mainTask();
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "ignoring-fiber-failures")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  const fiber = yield* Effect.fork(riskyOperation());
  return yield* mainTask().pipe(
    Effect.tap(() => fiber.join())
  );
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "ignoring-fiber-failures")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function startBackgroundTask() {
  // Not Effect code, or handled differently
  setTimeout(riskyOperation, 0);
  return mainTask();
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "ignoring-fiber-failures")).toBe(false);
		});
	});

	describe("retrying-concurrently-without-limits", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  return yield* Effect.all(
    items.map(i => Effect.retry(riskyOperation(i)))
  );
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "retrying-concurrently-without-limits")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  return yield* Effect.all(
    items.map(i => Effect.retry(riskyOperation(i))), 
    { concurrency: 5 }
  );
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "retrying-concurrently-without-limits")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function retrySequentially() {
  for (let i = 0; i < 100; i++) {
    try {
      return riskyOperation(\`item-\${i}\`);
    } catch {
      continue;
    }
  }
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "retrying-concurrently-without-limits")).toBe(false);
		});
	});

	describe("shared-mutable-state-across-fibers", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
let counter = 0;

Effect.gen(function* () {
  const fiber1 = yield* Effect.fork(Effect.sync(() => { counter++; }));
  const fiber2 = yield* Effect.fork(Effect.sync(() => { counter++; }));
  yield* fiber1.join();
  yield* fiber2.join();
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "shared-mutable-state-across-fibers")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
class Counter {
  constructor(private value: number = 0) {}
  increment() { return new Counter(this.value + 1); }
  get() { return this.value; }
}

Effect.gen(function* () {
  const counter = new Counter();
  // ... using immutable counter ...
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "shared-mutable-state-across-fibers")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function processItems(items: number[]) {
  return items.reduce((sum, item) => sum + item, 0);
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "shared-mutable-state-across-fibers")).toBe(false);
		});
	});

	describe("timeouts-without-cancellation-awareness", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  return yield* Effect.timeout(5000)(
    Effect.gen(function* () {
      yield* Effect.sleep(10000);
      return "done";
    })
  );
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "timeouts-without-cancellation-awareness")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
Effect.gen(function* () {
  return yield* Effect.timeout(5000)(
    Effect.gen(function* () {
      yield* Effect.sleep(3000);
      return "done";
    })
  ).pipe(
    Effect.catchTag("Timeout", () => "timed out")
  );
});
`
			);
			expect(report.findings.some((f) => f.ruleId === "timeouts-without-cancellation-awareness")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function timeoutAfter(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function longRunningTask() {
  return timeoutAfter(10000);
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "timeouts-without-cancellation-awareness")).toBe(false);
		});
	});
});
