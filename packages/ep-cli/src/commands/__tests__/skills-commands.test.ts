/**
 * Tests for skills command handlers
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Effect, Exit } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureConsole } from "../../test/helpers.js";
import { runCli } from "../../index.js";

const run = (args: string[], cwd?: string) => {
	const originalCwd = process.cwd();
	if (cwd) process.chdir(cwd);
	return Effect.runPromiseExit(runCli(["bun", "ep", ...args])).finally(() => {
		if (cwd) process.chdir(originalCwd);
	});
};

const makeSkillsFixture = async () => {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ep-cli-skills-cmd-"));
	const skillDir = path.join(
		tmpDir,
		".claude-plugin/plugins/effect-patterns/skills/testing-skill"
	);
	await fs.mkdir(skillDir, { recursive: true });
	await fs.writeFile(
		path.join(skillDir, "SKILL.md"),
		[
			"# Testing Skill",
			"",
			"beginner intermediate",
			"",
			"### Pattern One",
			"",
			"Good Example",
			"Anti-Pattern",
			"Rationale",
			"",
		].join("\n"),
		"utf8"
	);
	return tmpDir;
};

describe("skills commands", () => {
	let capture: ReturnType<typeof captureConsole>;
	const tempDirs: string[] = [];

	beforeEach(() => {
		capture = captureConsole();
	});

	afterEach(async () => {
		capture.restore();
		for (const dir of tempDirs.splice(0)) {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	describe("skills list", () => {
		it("shows help text", async () => {
			const exit = await run(["skills", "list", "--help"]);
			expect(Exit.isSuccess(exit)).toBe(true);
		});

		it("lists skills with --json in fixture workspace", async () => {
			const tmpDir = await makeSkillsFixture();
			tempDirs.push(tmpDir);

			const exit = await run(["skills", "list", "--json"], tmpDir);
			expect(Exit.isSuccess(exit)).toBe(true);

			const parsed = JSON.parse(capture.logs.join("\n"));
			expect(parsed.count).toBe(1);
			expect(parsed.skills[0].category).toBe("testing-skill");
		});
	});

	describe("skills preview", () => {
		it("shows help text", async () => {
			const exit = await run(["skills", "preview", "--help"]);
			expect(Exit.isSuccess(exit)).toBe(true);
		});

		it("previews a skill in fixture workspace", async () => {
			const tmpDir = await makeSkillsFixture();
			tempDirs.push(tmpDir);

			const exit = await run(["skills", "preview", "testing-skill", "--json"], tmpDir);
			expect(Exit.isSuccess(exit)).toBe(true);

			const parsed = JSON.parse(capture.logs.join("\n"));
			expect(parsed.skill.metadata.category).toBe("testing-skill");
			expect(parsed.skill.content).toContain("Testing Skill");
		});
	});

	describe("skills validate", () => {
		it("shows help text", async () => {
			const exit = await run(["skills", "validate", "--help"]);
			expect(Exit.isSuccess(exit)).toBe(true);
		});

		it("validates skills in fixture workspace (JSON)", async () => {
			const tmpDir = await makeSkillsFixture();
			tempDirs.push(tmpDir);

			const exit = await run(["skills", "validate", "--json"], tmpDir);
			expect(Exit.isSuccess(exit)).toBe(true);

			const parsed = JSON.parse(capture.logs.join("\n"));
			expect(parsed.valid).toBe(true);
			expect(parsed.errorCount).toBe(0);
		});
	});

	describe("skills stats", () => {
		it("shows help text", async () => {
			const exit = await run(["skills", "stats", "--help"]);
			expect(Exit.isSuccess(exit)).toBe(true);
		});

		it("shows stats in fixture workspace (JSON)", async () => {
			const tmpDir = await makeSkillsFixture();
			tempDirs.push(tmpDir);

			const exit = await run(["skills", "stats", "--json"], tmpDir);
			expect(Exit.isSuccess(exit)).toBe(true);

			const parsed = JSON.parse(capture.logs.join("\n"));
			expect(parsed.stats.totalSkills).toBe(1);
			expect(parsed.stats.totalPatterns).toBe(1);
		});
	});
});
