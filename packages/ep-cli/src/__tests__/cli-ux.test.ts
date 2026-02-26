import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(testDir, "../..");
const cliEntry = path.join(packageRoot, "src/index.ts");
const docsUrl =
  "https://github.com/PaulJPhilp/Effect-Patterns/tree/main/packages/ep-cli#readme";

const runCli = (args: string[]) =>
  spawnSync("bun", [cliEntry, ...args], {
    cwd: packageRoot,
    env: {
      ...process.env,
      NO_COLOR: "1",
    },
    encoding: "utf8",
  });

describe("ep-cli error UX and nudges", () => {
  it("suggests likely root command typos", () => {
    const result = runCli(["serch", "retry"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Did you mean: ep search");
    expect(result.stderr).toContain(docsUrl);
  });

  it("suggests likely nested subcommand typos", () => {
    const result = runCli(["install", "ls"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Did you mean: ep install list");
    expect(result.stderr).toContain(docsUrl);
  });

  it("returns actionable API connectivity error with docs link", () => {
    const result = spawnSync("bun", [cliEntry, "search", "retry"], {
      cwd: packageRoot,
      env: {
        ...process.env,
        NO_COLOR: "1",
        EFFECT_PATTERNS_API_URL: "http://localhost:1",
      },
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(docsUrl);
  });

  it("prints next-step nudge for install list", () => {
    const result = runCli(["install", "list"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Next: ep install add --tool cursor");
  });

  it("replaces generic skills failure with actionable guidance", () => {
    const result = runCli(["skills", "list"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Skills directory was not found for this workspace.");
    expect(result.stderr).toContain(docsUrl);
  });
});
