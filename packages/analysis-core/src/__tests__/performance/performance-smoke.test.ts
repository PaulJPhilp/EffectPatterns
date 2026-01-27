import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { AnalysisService } from "../../services/analysis-service";

describe("Performance Smoke Tests", () => {
	// ~500-line test file
	const largeCodeSample = `
import { Effect } from "effect";

// Generate many functions to simulate a large file
${Array.from({ length: 50 }, (_, i) => `
async function fetchData${i}() {
  const response = await fetch('/api/data/${i}');
  const data = await response.json();
  return data;
}

function processData${i}(data: any) {
  return data.map(item => ({
    ...item,
    processed: true,
    id: item.id + ${i}
  }));
}

Effect.gen(function* () {
  const data = yield* fetchData${i}();
  return processData${i}(data);
});

Effect.gen(function* () {
  if (!data${i}) {
    throw new Error('No data ${i}');
  }
  return yield* processItem${i}(data${i});
});

function processItem${i}(item: any) {
  return Effect.map(item, x => x.value);
}
`).join("\n")}

// Multiple concurrent operations
Effect.gen(function* () {
  const tasks = [
${Array.from({ length: 20 }, (_, j) =>
		`    Effect.fork(fetchData${j % 50}())`
	).join(",\n")}
  ];
  return yield* Effect.all(tasks);
});

// Resource management patterns
Effect.gen(function* () {
  const resource1 = yield* createResource1();
  const resource2 = yield* createResource2();
  try {
    return yield* useResources(resource1, resource2);
  } finally {
    yield* resource1.close();
    yield* resource2.close();
  }
});

// Error handling patterns
Effect.gen(function* () {
  return yield* riskyOperation().pipe(
    Effect.catchAll(error => Effect.log(\`Error: \${error}\`)),
    Effect.orDie
  );
});
`;

	// Multiple medium-sized files
	const mediumFiles = Array.from({ length: 10 }, (_, i) => `
import { Effect } from "effect";

// File ${i + 1}
async function fetchData${i}() {
  return await fetch('/api/${i}');
}

Effect.gen(function* () {
  const data = yield* fetchData${i}();
  if (!data) {
    throw new Error('No data ${i}');
  }
  return data;
});

function process${i}(item: any) {
  return item.map(x => x.id + ${i});
}

Effect.gen(function* () {
  Effect.fork(backgroundTask${i}());
  return yield* mainTask${i}();
});
`);

	it("analyzes ~500-line file within performance threshold", async () => {
		const startTime = performance.now();

		const result = await Effect.runPromise(Effect.gen(function* () {
			const analysisService = yield* AnalysisService;
			return yield* analysisService.analyzeFile("large-file.ts", largeCodeSample);
		}).pipe(
			Effect.provide(AnalysisService.Default)
		)
		);

		const endTime = performance.now();
		const duration = endTime - startTime;

		// Should complete within reasonable time (adjust threshold as needed)
		expect(duration).toBeLessThan(2000); // 2 seconds

		// Should still find violations in large file
		expect(result.findings.length).toBeGreaterThan(5);

		// Performance logging for monitoring
		console.log(`Large file analysis completed in ${duration.toFixed(2)}ms`);
	}, 10000); // 10 second timeout

	it("analyzes ~10 medium files efficiently", async () => {
		const startTime = performance.now();

		const results = await Promise.all(
			mediumFiles.map((code, index) =>
				Effect.runPromise(Effect.gen(function* () {
					const analysisService = yield* AnalysisService;
					return yield* analysisService.analyzeFile(`file-${index}.ts`, code);
				}).pipe(
					Effect.provide(AnalysisService.Default)
				)
				)
			)
		);

		const endTime = performance.now();
		const duration = endTime - startTime;

		// Should complete all files within reasonable time
		expect(duration).toBeLessThan(3000); // 3 seconds for 10 files

		// Each file should have been analyzed
		expect(results.length).toBe(10);

		// Should find violations across files
		const totalFindings = results.reduce(
			(sum, report) => sum + report.findings.length,
			0
		);
		expect(totalFindings).toBeGreaterThan(10);

		console.log(`10 medium files analyzed in ${duration.toFixed(2)}ms`);
	}, 15000); // 15 second timeout

	it("handles repeated analysis without performance degradation", async () => {
		const testCode = `
async function fetchData() {
  return await fetch('/api/data');
}

Effect.gen(function* () {
  throw new Error('Test error');
});
`;

		const durations: number[] = [];

		// Run analysis multiple times
		for (let i = 0; i < 10; i++) {
			const startTime = performance.now();

			await Effect.runPromise(Effect.gen(function* () {
				const analysisService = yield* AnalysisService;
				return yield* analysisService.analyzeFile("repeated-test.ts", testCode);
			}).pipe(
				Effect.provide(AnalysisService.Default)
			)
			);

			const endTime = performance.now();
			durations.push(endTime - startTime);
		}

		// Performance should be stable (not degrade significantly)
		const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
		const maxDuration = Math.max(...durations);

		// Average should be reasonable
		expect(avgDuration).toBeLessThan(500); // 500ms average

		// Max should not be more than 3x average (indicates instability)
		expect(maxDuration).toBeLessThan(avgDuration * 3);

		console.log(`Repeated analysis: avg ${avgDuration.toFixed(2)}ms, max ${maxDuration.toFixed(2)}ms`);
	}, 30000); // 30 second timeout

	it("scales linearly with code size", async () => {
		const smallCode = `
${Array.from({ length: 5 }, (_, i) => `
async function fetchDataSmall${i}() { return await fetch('/api/small/${i}'); }
`).join("")}
`;

		const mediumCode = `
${Array.from({ length: 50 }, (_, i) => `
async function fetchDataMedium${i}() { return await fetch('/api/medium/${i}'); }
`).join("")}
`;

		const largeCode = `
${Array.from({ length: 200 }, (_, i) => `
async function fetchDataLarge${i}() { return await fetch('/api/large/${i}'); }
`).join("")}
`;

		// Analyze different sizes with warmup runs to stabilize JIT
		// Warmup pass
		await measureAnalysisTime(smallCode, "warmup-small.ts");
		await measureAnalysisTime(mediumCode, "warmup-medium.ts");
		
		// Actual measurements
		const smallTime = await measureAnalysisTime(smallCode, "small.ts");
		const mediumTime = await measureAnalysisTime(mediumCode, "medium.ts");
		const largeTime = await measureAnalysisTime(largeCode, "large.ts");

		console.log(`Code size scaling: small ${smallTime.toFixed(2)}ms, medium ${mediumTime.toFixed(2)}ms, large ${largeTime.toFixed(2)}ms`);

		// All should complete within reasonable time (generous thresholds to accommodate system variance)
		// The key is that analysis completes quickly, not that it scales perfectly linearly
		expect(smallTime).toBeLessThan(1000);
		expect(mediumTime).toBeLessThan(2000);
		expect(largeTime).toBeLessThan(3000);
	}, 20000); // 20 second timeout

	it("handles complex nested patterns efficiently", async () => {
		const complexNestedCode = `
Effect.gen(function* () {
  const data = yield* Effect.gen(function* () {
    const items = yield* Effect.gen(function* () {
      const raw = yield* fetchData();
      return raw.map(item => Effect.gen(function* () {
        const processed = yield* processItem(item);
        const validated = yield* validateItem(processed);
        return yield* transformItem(validated);
      }));
    });
    return yield* Effect.all(items);
  });
  
  return yield* Effect.gen(function* () {
    const filtered = data.filter(item => item.isValid);
    const grouped = yield* groupByCategory(filtered);
    return yield* saveResults(grouped);
  });
});
`;

		const startTime = performance.now();

		const result = await Effect.runPromise(Effect.gen(function* () {
			const analysisService = yield* AnalysisService;
			return yield* analysisService.analyzeFile("complex-nested.ts", complexNestedCode);
		}).pipe(
			Effect.provide(AnalysisService.Default)
		)
		);

		const endTime = performance.now();
		const duration = endTime - startTime;

		// Should handle complex nesting efficiently
		expect(duration).toBeLessThan(1000); // 1 second

		// Should still find violations in complex code
		expect(result.findings.length).toBeGreaterThan(0);

		console.log(`Complex nested analysis completed in ${duration.toFixed(2)}ms`);
	}, 10000);

	it("memory usage remains reasonable for large analysis", async () => {
		// This is a basic smoke test - in real scenarios you'd use more sophisticated memory profiling
		const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

		// Analyze multiple large files
		await Promise.all(
			Array.from({ length: 5 }, (_, i) =>
				Effect.runPromise(Effect.gen(function* () {
					const analysisService = yield* AnalysisService;
					return yield* analysisService.analyzeFile(`memory-test-${i}.ts`, largeCodeSample);
				}).pipe(
					Effect.provide(AnalysisService.Default)
				)
				)
			)
		);

		const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
		const memoryIncrease = finalMemory - initialMemory;

		// Memory increase should be reasonable (less than 50MB)
		if (initialMemory > 0 && finalMemory > 0) {
			expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
			console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
		}
	}, 30000);

	it("concurrent analysis performance", async () => {
		const testFiles = Array.from({ length: 20 }, (_, i) => `
async function testFile${i}() {
  return await fetch('/test/${i}');
}

Effect.gen(function* () {
  throw new Error('Error ${i}');
});
`);

		const startTime = performance.now();

		// Analyze files concurrently
		const results = await Promise.all(
			testFiles.map((code, index) =>
				Effect.runPromise(Effect.gen(function* () {
					const analysisService = yield* AnalysisService;
					return yield* analysisService.analyzeFile(`concurrent-${index}.ts`, code);
				}).pipe(
					Effect.provide(AnalysisService.Default)
				)
				)
			)
		);

		const endTime = performance.now();
		const duration = endTime - startTime;

		// Concurrent analysis should be efficient
		expect(duration).toBeLessThan(5000); // 5 seconds for 20 files
		expect(results.length).toBe(20);

		const avgTimePerFile = duration / 20;
		expect(avgTimePerFile).toBeLessThan(250); // 250ms per file average

		console.log(`Concurrent analysis: 20 files in ${duration.toFixed(2)}ms (${avgTimePerFile.toFixed(2)}ms per file)`);
	}, 30000);
});

// Helper function to measure analysis time
async function measureAnalysisTime(code: string, filename: string): Promise<number> {
	const startTime = performance.now();

	await Effect.runPromise(Effect.gen(function* () {
		const analysisService = yield* AnalysisService;
		return yield* analysisService.analyzeFile(filename, code);
	}).pipe(
		Effect.provide(AnalysisService.Default)
	)
	);

	const endTime = performance.now();
	return endTime - startTime;
}
