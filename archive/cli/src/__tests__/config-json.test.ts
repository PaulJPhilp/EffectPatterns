import { describe, it, expect } from "vitest";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { createCli, runCli } from "../core/index.js";
import { configCommand } from "../commands/config.js";

function tmpFile(name: string) {
  return path.join(os.tmpdir(), `effect-patterns-${name}-${Date.now()}.json`);
}

async function runCliWithArgs(args: string[]) {
  const root = createCli({ commands: [configCommand] });
  await runCli(root, ["node", "cli", ...args]);
}

describe("Config command JSON outputs", () => {
  it("config list writes { config: Record<string,string> } with --json", async () => {
    const out = tmpFile("config-list");
    if (fs.existsSync(out)) fs.rmSync(out);

    await runCliWithArgs(["config", "--json", "list", "--output", out]);

    const content = fs.readFileSync(out, "utf-8");
    const parsed = JSON.parse(content) as any;
    expect(parsed).toHaveProperty("config");
    expect(typeof parsed.config).toBe("object");
  });

  it("config set writes { set: { key, value } } with --json", async () => {
    const out = tmpFile("config-set");
    if (fs.existsSync(out)) fs.rmSync(out);

    await runCliWithArgs([
      "config",
      "--json",
      "set",
      "--output",
      out,
      "myKey",
      "myValue",
    ]);

    const content = fs.readFileSync(out, "utf-8");
    const parsed = JSON.parse(content) as any;
    expect(parsed).toEqual({ set: { key: "myKey", value: "myValue" } });
  });

  it("config get writes { value: string | null } with --json", async () => {
    const out = tmpFile("config-get");
    if (fs.existsSync(out)) fs.rmSync(out);

    await runCliWithArgs(["config", "--json", "get", "--output", out, "myKey"]);

    const content = fs.readFileSync(out, "utf-8");
    const parsed = JSON.parse(content) as any;
    expect(parsed).toHaveProperty("value");
    // value can be string or null depending on previous test order
    expect(parsed.value === null || typeof parsed.value === "string").toBe(true);
  });
});
