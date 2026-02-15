import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(testDir, "../..");
const cliEntry = path.join(packageRoot, "src/index.ts");

const runCli = (
  args: string[],
  options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    input?: string;
  }
) =>
  spawnSync("bun", [cliEntry, ...args], {
    cwd: options?.cwd ?? packageRoot,
    env: { ...process.env, ...options?.env },
    input: options?.input,
    encoding: "utf8",
  });

const makeSkillsFixture = async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ep-cli-contract-"));
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

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("ep-cli stream and machine-mode contracts", () => {
  it("emits parseable JSON to stdout for install list --json", () => {
    const result = runCli(["install", "list", "--json"]);
    expect(result.status).toBe(0);
    expect(result.stderr.trim()).toBe("");

    const parsed = JSON.parse(result.stdout);
    expect(Array.isArray(parsed.tools)).toBe(true);
    expect(parsed.tools).toContain("cursor");
  });

  it("keeps unsupported-tool diagnostics on stderr", () => {
    const result = runCli(["install", "add", "--tool", "not-a-tool"]);
    expect(result.status).toBe(1);
    expect(result.stdout.trim()).toBe("");
    expect(result.stderr).toContain("not supported");
  });

  it("keeps json stdout clean even when debug logging is enabled", async () => {
    const tmpDir = await makeSkillsFixture();
    tempDirs.push(tmpDir);

    const result = runCli(
      ["--log-level", "debug", "skills", "stats", "--json"],
      {
        cwd: tmpDir,
        env: {
          LOG_LEVEL: "error",
        },
      }
    );

    expect(result.status).toBe(0);
    expect(result.stderr.trim()).toBe("");

    const parsed = JSON.parse(result.stdout);
    expect(parsed.stats.totalSkills).toBe(1);
  });

  it("allows --log-level to override environment log level", async () => {
    const tmpDir = await makeSkillsFixture();
    tempDirs.push(tmpDir);

    const result = runCli(
      ["--log-level", "debug", "skills", "stats"],
      {
        cwd: tmpDir,
        env: {
          LOG_LEVEL: "error",
        },
      }
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("Fetching skills statistics...");
  });

  it("does not emit ANSI color codes in non-tty output", () => {
    const result = runCli(["install", "list"], {
      env: {
        NO_COLOR: "",
        TERM: "xterm-256color",
        CI: "",
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).not.toMatch(/\x1b\[[0-9;]*m/);
  });

  it("accepts API key from stdin with --api-key-stdin", () => {
    const result = runCli(["--api-key-stdin", "install", "list", "--json"], {
      input: "stdin-api-key\n",
    });

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(Array.isArray(parsed.tools)).toBe(true);
  });

  it("fails with actionable error when --api-key-stdin receives empty input", () => {
    const result = runCli(["--api-key-stdin", "install", "list", "--json"], {
      input: "\n",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("No API key was provided on stdin");
  });
});
