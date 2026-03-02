/**
 * Tests for install command handlers
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { captureConsole } from "../../test/helpers.js";
import { startFixtureServer, type FixtureServer } from "../../test/fixture-server.js";
import { runCli } from "../../index.js";

const run = (args: string[]) =>
	Effect.runPromiseExit(runCli(["bun", "ep", ...args]));

/**
 * Fixture patterns covering multiple categories for file-output tests.
 */
const fixturePatterns = [
	{
		id: "catch-tag-errors",
		title: "Handle Errors with catchTag",
		description: "Use catchTag for type-safe error recovery.",
		category: "error-management",
		difficulty: "intermediate",
		tags: ["error"],
		useCases: ["resilience"],
	},
	{
		id: "retry-with-schedule",
		title: "Retry with Schedule",
		description: "Retry transient failures using Schedule combinators.",
		category: "error-management",
		difficulty: "beginner",
		tags: ["retry"],
		useCases: ["resilience"],
	},
	{
		id: "effect-gen-basics",
		title: "Effect.gen Fundamentals",
		description: "Use generator syntax for sequential Effect composition.",
		category: "core-concepts",
		difficulty: "beginner",
		tags: ["basics"],
		useCases: ["getting-started"],
	},
	{
		id: "parallel-execution",
		title: "Run Effects in Parallel",
		description: "Use Effect.all with concurrency option for parallel execution.",
		category: "concurrency",
		difficulty: "intermediate",
		tags: ["parallel"],
		useCases: ["performance"],
	},
];

describe("install commands", () => {
	let capture: ReturnType<typeof captureConsole>;
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ep-cli-test-"));
		process.env.EP_INSTALLED_STATE_FILE = path.join(tempDir, "installed-rules.json");
		capture = captureConsole();
	});

	afterEach(async () => {
		capture.restore();
		delete process.env.EP_INSTALLED_STATE_FILE;
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	describe("install list", () => {
		it("lists supported tools", async () => {
			const exit = await run(["install", "list"]);
			expect(Exit.isSuccess(exit)).toBe(true);
			const output = capture.logs.join("\n");
			expect(output).toContain("agent");
			expect(output).toContain("claude");
			expect(output).toContain("cursor");
			expect(output).toContain("vscode");
			expect(output).toContain("windsurf");
		});

		it("outputs JSON for --json", async () => {
			const exit = await run(["install", "list", "--json"]);
			expect(Exit.isSuccess(exit)).toBe(true);
			const jsonLines = capture.logs.join("\n");
			const parsed = JSON.parse(jsonLines);
			expect(Array.isArray(parsed.tools)).toBe(true);
			expect(parsed.tools).toContain("cursor");
			expect(parsed.tools).toContain("agent");
			expect(parsed.tools).toContain("claude");
		});

		it("outputs JSON for --installed --json with no rules", async () => {
			const exit = await run(["install", "list", "--installed", "--json"]);
			expect(Exit.isSuccess(exit)).toBe(true);
			const jsonLines = capture.logs.join("\n");
			const parsed = JSON.parse(jsonLines);
			expect(parsed.count).toBe(0);
			expect(Array.isArray(parsed.rules)).toBe(true);
		});
	});

	describe("install add", () => {
		it("rejects unsupported tool", async () => {
			const exit = await run(["install", "add", "--tool", "not-a-tool"]);
			expect(Exit.isFailure(exit)).toBe(true);
			const output = capture.errors.join("\n");
			expect(output).toContain("not supported");
		});

		it("shows help text", async () => {
			const exit = await run(["install", "add", "--help"]);
			expect(Exit.isSuccess(exit)).toBe(true);
		});
	});

	describe("install add (file output)", () => {
		let server: FixtureServer;
		let originalCwd: string;
		let projectDir: string;

		beforeAll(async () => {
			server = await startFixtureServer([
				{
					path: "/api/patterns",
					status: 200,
					body: { patterns: fixturePatterns },
				},
			]);
		});

		afterAll(async () => {
			await server.close();
		});

		beforeEach(async () => {
			originalCwd = process.cwd();
			projectDir = await fs.mkdtemp(path.join(os.tmpdir(), "ep-cli-project-"));
			process.chdir(projectDir);
			process.env.EFFECT_PATTERNS_API_URL = server.url;
			process.env.PATTERN_API_KEY = "test-key";
		});

		afterEach(async () => {
			process.chdir(originalCwd);
			delete process.env.EFFECT_PATTERNS_API_URL;
			delete process.env.PATTERN_API_KEY;
			await fs.rm(projectDir, { recursive: true, force: true });
		});

		describe("cursor", () => {
			it("writes .mdc files to .cursor/rules/", async () => {
				const exit = await run(["install", "add", "--tool", "cursor"]);
				expect(Exit.isSuccess(exit)).toBe(true);

				const rulesDir = path.join(projectDir, ".cursor", "rules");
				const files = await fs.readdir(rulesDir);
				const mdcFiles = files.filter((f) => f.endsWith(".mdc"));

				expect(mdcFiles.length).toBeGreaterThanOrEqual(3);
				expect(mdcFiles).toContain("effect-error-management.mdc");
				expect(mdcFiles).toContain("effect-core-concepts.mdc");
				expect(mdcFiles).toContain("effect-concurrency.mdc");
			});

			it("generates .mdc files with YAML frontmatter", async () => {
				await run(["install", "add", "--tool", "cursor"]);

				const filePath = path.join(projectDir, ".cursor", "rules", "effect-error-management.mdc");
				const content = await fs.readFile(filePath, "utf8");

				expect(content).toMatch(/^---\n/);
				expect(content).toContain('description: "Effect patterns:');
				expect(content).toContain('globs: "**/*.ts, **/*.tsx"');
				expect(content).toContain("alwaysApply: false");
				expect(content).toContain("# Effect Patterns: Error Management");
				expect(content).toContain("Handle Errors with catchTag");
				expect(content).toContain("Retry with Schedule");
			});

			it("prints success message with file count", async () => {
				const exit = await run(["install", "add", "--tool", "cursor"]);
				expect(Exit.isSuccess(exit)).toBe(true);
				const output = capture.logs.join("\n");
				expect(output).toContain(".cursor/rules/");
				expect(output).toMatch(/\d+ rule\(s\) across \d+ file\(s\)/);
			});
		});

		describe("windsurf", () => {
			it("writes .mdc files to .windsurf/rules/", async () => {
				const exit = await run(["install", "add", "--tool", "windsurf"]);
				expect(Exit.isSuccess(exit)).toBe(true);

				const rulesDir = path.join(projectDir, ".windsurf", "rules");
				const files = await fs.readdir(rulesDir);
				const mdcFiles = files.filter((f) => f.endsWith(".mdc"));

				expect(mdcFiles.length).toBeGreaterThanOrEqual(3);
				expect(mdcFiles).toContain("effect-error-management.mdc");
				expect(mdcFiles).toContain("effect-core-concepts.mdc");
				expect(mdcFiles).toContain("effect-concurrency.mdc");
			});

			it("generates same .mdc format as cursor", async () => {
				await run(["install", "add", "--tool", "windsurf"]);

				const filePath = path.join(projectDir, ".windsurf", "rules", "effect-concurrency.mdc");
				const content = await fs.readFile(filePath, "utf8");

				expect(content).toMatch(/^---\n/);
				expect(content).toContain('description: "Effect patterns:');
				expect(content).toContain("alwaysApply: false");
				expect(content).toContain("# Effect Patterns: Concurrency");
				expect(content).toContain("Run Effects in Parallel");
			});

			it("prints success message with file count", async () => {
				const exit = await run(["install", "add", "--tool", "windsurf"]);
				expect(Exit.isSuccess(exit)).toBe(true);
				const output = capture.logs.join("\n");
				expect(output).toContain(".windsurf/rules/");
				expect(output).toMatch(/\d+ rule\(s\) across \d+ file\(s\)/);
			});
		});

		describe("vscode", () => {
			it("writes single aggregated file to .github/copilot-instructions.md", async () => {
				const exit = await run(["install", "add", "--tool", "vscode"]);
				expect(Exit.isSuccess(exit)).toBe(true);

				const filePath = path.join(projectDir, ".github", "copilot-instructions.md");
				const stat = await fs.stat(filePath);
				expect(stat.isFile()).toBe(true);
			});

			it("generates category sections without YAML frontmatter", async () => {
				await run(["install", "add", "--tool", "vscode"]);

				const filePath = path.join(projectDir, ".github", "copilot-instructions.md");
				const content = await fs.readFile(filePath, "utf8");

				expect(content).not.toMatch(/^---\n/);
				expect(content).toContain("# Effect Patterns");
				expect(content).toContain("Generated by ep on");
				expect(content).toContain("## Error Management");
				expect(content).toContain("## Core Concepts");
				expect(content).toContain("## Concurrency");
				expect(content).toContain("Handle Errors with catchTag");
				expect(content).toContain("Effect.gen Fundamentals");
			});

			it("prints success message with file path", async () => {
				const exit = await run(["install", "add", "--tool", "vscode"]);
				expect(Exit.isSuccess(exit)).toBe(true);
				const output = capture.logs.join("\n");
				expect(output).toContain(".github/copilot-instructions.md");
				expect(output).toMatch(/\d+ rule\(s\) to/);
			});
		});

		describe("claude", () => {
			it("writes .md files to .claude/skills/", async () => {
				const exit = await run(["install", "add", "--tool", "claude"]);
				expect(Exit.isSuccess(exit)).toBe(true);

				const skillsDir = path.join(projectDir, ".claude", "skills");
				const files = await fs.readdir(skillsDir);
				const mdFiles = files.filter((f) => f.endsWith(".md"));

				expect(mdFiles.length).toBeGreaterThanOrEqual(3);
				expect(mdFiles).toContain("effect-error-management.md");
				expect(mdFiles).toContain("effect-core-concepts.md");
				expect(mdFiles).toContain("effect-concurrency.md");
			});

			it("generates .md files without YAML frontmatter", async () => {
				await run(["install", "add", "--tool", "claude"]);

				const filePath = path.join(projectDir, ".claude", "skills", "effect-error-management.md");
				const content = await fs.readFile(filePath, "utf8");

				expect(content).not.toMatch(/^---\n/);
				expect(content).toContain("## Effect Patterns: Error Management");
				expect(content).toContain("Use when:");
				expect(content).toContain("### Patterns");
				expect(content).toContain("Handle Errors with catchTag");
			});

			it("prints success message with file count", async () => {
				const exit = await run(["install", "add", "--tool", "claude"]);
				expect(Exit.isSuccess(exit)).toBe(true);
				const output = capture.logs.join("\n");
				expect(output).toContain(".claude/skills/");
				expect(output).toMatch(/\d+ rule\(s\) across \d+ skill file\(s\)/);
			});
		});

		describe("install state", () => {
			it("saves installed rules after install add", async () => {
				await run(["install", "add", "--tool", "cursor"]);

				capture.restore();
				capture = captureConsole();

				const exit = await run(["install", "list", "--installed", "--json"]);
				expect(Exit.isSuccess(exit)).toBe(true);

				const parsed = JSON.parse(capture.logs.join("\n"));
				expect(parsed.count).toBe(fixturePatterns.length);
				expect(parsed.rules[0].tool).toBe("cursor");
			});
		});
	});

	describe("install help", () => {
		it("shows install help", async () => {
			const exit = await run(["install", "--help"]);
			expect(Exit.isSuccess(exit)).toBe(true);
		});
	});
});
