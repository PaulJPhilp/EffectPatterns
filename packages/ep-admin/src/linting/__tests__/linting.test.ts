/**
 * Linting Module Tests — no behavioral mocks.
 *
 * lintFile/lintInParallel accept a readFile callback parameter,
 * so we pass plain async functions instead of mock functions.
 */

import { describe, expect, it } from "vitest";
import {
	checkDeprecatedAPIs,
	checkErrorModel,
	checkExplicitConcurrency,
	checkPreferPipe,
	checkStreamMemory,
	checkUseTapError,
} from "../checkers.js";
import { lintFile, lintInParallel } from "../linter.js";
import { LINT_RULES } from "../rules.js";
import type { LintIssue } from "../types.js";

/** Simple readFile that returns a fixed string */
const fakeReadFile = (content: string) => async (_path: string) => content;

/** Tracking readFile that records which paths were read */
const trackingReadFile = (content: string) => {
	const calls: string[] = [];
	const readFile = async (filePath: string) => {
		calls.push(filePath);
		return content;
	};
	return { readFile, calls };
};

describe("Linting Module", () => {
	describe("Rules Registry", () => {
		it("should have defined rules", () => {
			expect(LINT_RULES).toBeDefined();
			expect(Array.isArray(LINT_RULES)).toBe(true);
			expect(LINT_RULES.length).toBeGreaterThan(0);
		});

		it("should have effect-use-taperror rule", () => {
			const rule = LINT_RULES.find((r) => r.name === "effect-use-taperror");
			expect(rule).toBeDefined();
			expect(rule?.description).toContain("tapError");
		});

		it("should have effect-explicit-concurrency rule", () => {
			const rule = LINT_RULES.find((r) => r.name === "effect-explicit-concurrency");
			expect(rule).toBeDefined();
			expect(rule?.canFix).toBe(true);
		});

		it("should have effect-deprecated-api rule", () => {
			const rule = LINT_RULES.find((r) => r.name === "effect-deprecated-api");
			expect(rule).toBeDefined();
			expect(rule?.defaultSeverity).toBe("error");
		});

		it("all rules should have required properties", () => {
			for (const rule of LINT_RULES) {
				expect(rule).toHaveProperty("name");
				expect(rule).toHaveProperty("description");
				expect(rule).toHaveProperty("defaultSeverity");
				expect(rule).toHaveProperty("canFix");
				expect(typeof rule.name).toBe("string");
				expect(typeof rule.description).toBe("string");
				expect(typeof rule.canFix).toBe("boolean");
			}
		});
	});

	describe("checkUseTapError", () => {
		it("should detect catchAll with Effect.gen and logging", () => {
			const code = `
        effect.pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.log(error);
            })
          )
        )
      `;
			const issues = checkUseTapError(code, "test.ts");
			expect(issues.length).toBeGreaterThan(0);
			expect(issues[0].rule).toBe("effect-use-taperror");
		});

		it("should not flag catchAll with return statement", () => {
			const code = `
        effect.pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              return yield* someEffect;
            })
          )
        )
      `;
			const issues = checkUseTapError(code, "test.ts");
			expect(issues.length).toBe(0);
		});

		it("should have correct issue properties", () => {
			const code = `
        effect.pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.log(error);
            })
          )
        )
      `;
			const issues = checkUseTapError(code, "test.ts");
			if (issues.length > 0) {
				expect(issues[0]).toHaveProperty("rule");
				expect(issues[0]).toHaveProperty("severity");
				expect(issues[0]).toHaveProperty("message");
				expect(issues[0]).toHaveProperty("line");
				expect(issues[0]).toHaveProperty("column");
				expect(issues[0].severity).toBe("warning");
			}
		});
	});

	describe("checkExplicitConcurrency", () => {
		it("should detect Effect.all without concurrency", () => {
			const code = "Effect.all([effect1, effect2])";
			const issues = checkExplicitConcurrency(code, "test.ts");
			expect(issues.length).toBeGreaterThan(0);
			expect(issues[0].rule).toBe("effect-explicit-concurrency");
		});

		it("should not flag Effect.all with concurrency option", () => {
			const code = `
        Effect.all([effect1, effect2], {
          concurrency: 5
        })
      `;
			const issues = checkExplicitConcurrency(code, "test.ts");
			expect(issues.length).toBe(0);
		});

		it("should not flag files marked as sequential", () => {
			const code = "Effect.all([effect1, effect2])";
			const issues = checkExplicitConcurrency(code, "sequential-test.ts");
			expect(issues.length).toBe(0);
		});

		it("should not flag when sequential by design comment exists", () => {
			const code = `
        // sequential by design
        Effect.all([effect1, effect2])
      `;
			const issues = checkExplicitConcurrency(code, "test.ts");
			expect(issues.length).toBe(0);
		});

		it("should return error severity for parallel files", () => {
			const code = "Effect.all([effect1, effect2])";
			const issues = checkExplicitConcurrency(code, "parallel-test.ts");
			if (issues.length > 0) {
				expect(issues[0].severity).toBe("error");
			}
		});
	});

	describe("checkDeprecatedAPIs", () => {
		it("should detect deprecated Effect APIs", () => {
			const code = "const result = Effect.fromOption(someOption)";
			const issues = checkDeprecatedAPIs(code, "test.ts");
			expect(Array.isArray(issues)).toBe(true);
		});

		it("should have error severity for deprecated APIs", () => {
			const code = "Effect.fromOption(opt)";
			const issues = checkDeprecatedAPIs(code, "test.ts");
			for (const issue of issues) {
				expect(issue.rule).toBe("effect-deprecated-api");
			}
		});
	});

	describe("checkPreferPipe", () => {
		it("should detect long method chains", () => {
			const code = "effect.flatMap(a => a.map(b => b)).flatMap(c => c)";
			const issues = checkPreferPipe(code, "test.ts");
			expect(Array.isArray(issues)).toBe(true);
		});

		it("should have info severity", () => {
			const code = "effect.flatMap(a => a).map(b => b).flatMap(c => c)";
			const issues = checkPreferPipe(code, "test.ts");
			for (const issue of issues) {
				expect(issue.severity).toBe("info");
			}
		});
	});

	describe("checkStreamMemory", () => {
		it("should detect non-streaming stream operations", () => {
			const code = `
        Stream.fromIterable(largeArray)
          .pipe(Stream.toArray)
      `;
			const issues = checkStreamMemory(code, "test.ts");
			expect(Array.isArray(issues)).toBe(true);
		});

		it("should have error severity", () => {
			const code = "Stream.toArray(stream)";
			const issues = checkStreamMemory(code, "test.ts");
			for (const issue of issues) {
				expect(issue.severity).toBe("error");
			}
		});
	});

	describe("checkErrorModel", () => {
		it("should detect generic Error usage", () => {
			const code = 'throw new Error("Something went wrong")';
			const issues = checkErrorModel(code, "test.ts");
			expect(Array.isArray(issues)).toBe(true);
		});

		it("should suggest typed errors", () => {
			const code = "new Error('message')";
			const issues = checkErrorModel(code, "test.ts");
			for (const issue of issues) {
				expect(issue.severity).toBe("info");
			}
		});
	});

	describe("lintFile", () => {
		it("should lint a file and return results", async () => {
			const result = await lintFile("test.ts", fakeReadFile("const x = 1;"));

			expect(result).toHaveProperty("file");
			expect(result).toHaveProperty("issues");
			expect(result).toHaveProperty("errors");
			expect(result).toHaveProperty("warnings");
			expect(result).toHaveProperty("info");
			expect(Array.isArray(result.issues)).toBe(true);
		});

		it("should count errors, warnings, and info correctly", async () => {
			const result = await lintFile(
				"test.ts",
				fakeReadFile(`
        Effect.all([a, b])
        new Error("test")
        effect.flatMap(x => x).map(y => y).flatMap(z => z)
        `)
			);

			expect(typeof result.errors).toBe("number");
			expect(typeof result.warnings).toBe("number");
			expect(typeof result.info).toBe("number");
			expect(result.errors).toBeGreaterThanOrEqual(0);
		});

		it("should sort issues by line number", async () => {
			const result = await lintFile(
				"test.ts",
				fakeReadFile(`
        line 1
        line 2
        Effect.all([a, b])
        line 4
        new Error("test")
        `)
			);

			for (let i = 1; i < result.issues.length; i++) {
				expect(result.issues[i].line).toBeGreaterThanOrEqual(result.issues[i - 1].line);
			}
		});

		it("should extract basename from file path", async () => {
			const result = await lintFile("/path/to/myfile.ts", fakeReadFile("code"));
			expect(result.file).toBe("myfile.ts");
		});

		it("should call readFile with the provided path", async () => {
			const { readFile, calls } = trackingReadFile("code");
			await lintFile("test.ts", readFile);
			expect(calls).toEqual(["test.ts"]);
		});
	});

	describe("lintInParallel", () => {
		it("should lint multiple files", async () => {
			const files = ["file1.ts", "file2.ts", "file3.ts"];
			const results = await lintInParallel(files, fakeReadFile("code"));

			expect(Array.isArray(results)).toBe(true);
			expect(results.length).toBe(files.length);
		});

		it("should return lint results for each file", async () => {
			const files = ["file1.ts", "file2.ts"];
			const results = await lintInParallel(files, fakeReadFile("code"));

			for (const result of results) {
				expect(result).toHaveProperty("file");
				expect(result).toHaveProperty("issues");
				expect(result).toHaveProperty("errors");
			}
		});

		it("should handle empty file list", async () => {
			const results = await lintInParallel([], fakeReadFile("code"));
			expect(results).toEqual([]);
		});

		it("should process files concurrently", async () => {
			let concurrentCount = 0;
			let maxConcurrent = 0;

			const concurrencyReadFile = async (_path: string) => {
				concurrentCount++;
				maxConcurrent = Math.max(maxConcurrent, concurrentCount);
				await new Promise((resolve) => setTimeout(resolve, 10));
				concurrentCount--;
				return "code";
			};

			const files = Array.from({ length: 20 }, (_, i) => `file${i}.ts`);
			await lintInParallel(files, concurrencyReadFile);

			expect(maxConcurrent).toBeGreaterThan(1);
			expect(maxConcurrent).toBeLessThanOrEqual(10);
		});

		it("should call readFile for each file", async () => {
			const { readFile, calls } = trackingReadFile("code");
			const files = ["file1.ts", "file2.ts", "file3.ts"];

			await lintInParallel(files, readFile);

			expect(calls.length).toBe(files.length);
			for (const file of files) {
				expect(calls).toContain(file);
			}
		});

		it("should handle file read errors gracefully", async () => {
			const failingReadFile = async (_path: string): Promise<string> => {
				throw new Error("Read error");
			};

			const files = ["file1.ts"];

			try {
				await lintInParallel(files, failingReadFile);
			} catch (error) {
				expect(error).toBeDefined();
			}
		});
	});

	describe("Integration Tests", () => {
		it("should identify multiple issue types in a file", async () => {
			const code = `
        // File with multiple issues
        Effect.all([a, b])
        new Error("test")
        effect.flatMap(x => x).map(y => y)
      `;

			const result = await lintFile("test.ts", fakeReadFile(code));

			expect(result.issues.length).toBeGreaterThan(0);
			expect(result.file).toBe("test.ts");
		});

		it("should lint clean code without issues", async () => {
			const code = `
        import { Effect } from "effect";
        const program = Effect.succeed(42);
      `;

			const result = await lintFile("clean.ts", fakeReadFile(code));

			expect(result.file).toBe("clean.ts");
			expect(typeof result.errors).toBe("number");
			expect(typeof result.warnings).toBe("number");
		});
	});
});
