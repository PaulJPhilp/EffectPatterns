import { describe, it, expect } from "vitest";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { createCli, runCli, runGroup } from "../core/index.js";

function tmpFile(name: string) {
  return path.join(os.tmpdir(), `effect-patterns-${name}-${Date.now()}.json`);
}

async function runCliWithArgs(args: string[]) {
  const root = createCli({ commands: [runGroup] });
  await runCli(root, ["node", "cli", ...args]);
}

describe("Run command JSON outputs", () => {
  it("run list --json writes { runs: string[] } to file", async () => {
    // Ensure at least one run exists via CLI
    await runCliWithArgs(["run", "create", "--prefix", "test-json"]);

    const out = tmpFile("runs");
    if (fs.existsSync(out)) fs.rmSync(out);

    await runCliWithArgs(["run", "list", "--json", "--output", out]);

    const content = fs.readFileSync(out, "utf-8");
    const parsed = JSON.parse(content) as unknown;
    expect(parsed).toBeTypeOf("object");
    expect(parsed).toHaveProperty("runs");
    const runs = (parsed as any).runs as unknown;
    expect(Array.isArray(runs)).toBe(true);
  });

  it("run current --json writes { current: Run | null } to file", async () => {
    // Create a run via CLI which also becomes current
    await runCliWithArgs(["run", "create", "--prefix", "current-json"]);

    const out = tmpFile("current");
    if (fs.existsSync(out)) fs.rmSync(out);

    await runCliWithArgs(["run", "current", "--json", "--output", out]);

    const content = fs.readFileSync(out, "utf-8");
    const parsed = JSON.parse(content) as unknown;
    expect(parsed).toBeTypeOf("object");
    expect(parsed).toHaveProperty("current");
    const current = (parsed as any).current as unknown;
    // Should be object when a run is active
    expect(current === null || typeof current === "object").toBe(true);
  });
});
