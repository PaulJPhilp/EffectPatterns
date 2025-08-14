import { describe, it, expect } from "vitest";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { createCli, runCli } from "../core/index.js";
import { planCommand } from "../commands/plan.js";

function tmpFile(name: string) {
  return path.join(os.tmpdir(), `effect-patterns-${name}-${Date.now()}.json`);
}

async function runCliWithArgs(args: string[]) {
  const root = createCli({ commands: [planCommand] });
  await runCli(root, ["node", "cli", ...args]);
}

describe("Plan command JSON outputs", () => {
  it("plan list writes { plan: { primary, fallbacks } } with --json", async () => {
    const out = tmpFile("plan-list");
    if (fs.existsSync(out)) fs.rmSync(out);

    await runCliWithArgs(["plan", "--json", "list", "--output", out]);

    const content = fs.readFileSync(out, "utf-8");
    const parsed = JSON.parse(content) as any;
    expect(parsed).toHaveProperty("plan");
    expect(parsed.plan).toHaveProperty("primary");
    expect(parsed.plan).toHaveProperty("fallbacks");
  });

  it("plan create writes { updated: { ... } } with --json (retries, retryMs)", async () => {
    const out = tmpFile("plan-create");
    if (fs.existsSync(out)) fs.rmSync(out);

    await runCliWithArgs([
      "plan",
      "--json",
      "create",
      "--output",
      out,
      "--retries",
      "2",
      "--retry-ms",
      "1200",
    ]);

    const content = fs.readFileSync(out, "utf-8");
    const parsed = JSON.parse(content) as any;
    expect(parsed).toHaveProperty("updated");
    expect(parsed.updated.retries).toBe(2);
    expect(parsed.updated.retryMs).toBe(1200);
  });

  it("plan clear writes { cleared: true } with --json", async () => {
    const out = tmpFile("plan-clear");
    if (fs.existsSync(out)) fs.rmSync(out);

    await runCliWithArgs(["plan", "--json", "clear", "--output", out]);

    const content = fs.readFileSync(out, "utf-8");
    const parsed = JSON.parse(content) as any;
    expect(parsed).toEqual({ cleared: true });
  });

  it("plan reset writes { reset: true } with --json", async () => {
    const out = tmpFile("plan-reset");
    if (fs.existsSync(out)) fs.rmSync(out);

    await runCliWithArgs(["plan", "--json", "reset", "--output", out]);

    const content = fs.readFileSync(out, "utf-8");
    const parsed = JSON.parse(content) as any;
    expect(parsed).toEqual({ reset: true });
  });
});
