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
  it("adds docs guidance for command mismatches", () => {
    const result = runCli(["serch", "retry"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Need command help? Run 'ep --help'.");
    expect(result.stderr).toContain(docsUrl);
  });

  it("returns actionable API connectivity error with docs link", () => {
    const result = runCli(["search", "retry"]);
    expect(result.status).toBe(1);
    const isNetworkError = result.stderr.includes("Unable to reach the Effect Patterns API.");
    const isUnauthorizedError = result.stderr.includes("Pattern API request was unauthorized (401).");
    expect(isNetworkError || isUnauthorizedError).toBe(true);
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
