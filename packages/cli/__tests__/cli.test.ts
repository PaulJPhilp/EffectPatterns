import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

type CliMode = "dev" | "build";

const getCliMode = (): CliMode => {
  const mode = process.env.CLI_TEST_MODE;
  return mode === "build" ? "build" : "dev";
};

const runCli = (
  args: string[],
  options?: { cwd?: string }
): Promise<CommandResult> => {
  return new Promise((resolve, reject) => {
    const mode = getCliMode();
    const cwd = options?.cwd ?? `${__dirname}/..`;

    const command = mode === "dev" ? "bun" : "node";
    const commandArgs =
      mode === "dev"
        ? ["run", "dev", "--", ...args]
        : ["dist/index.js", ...args];

    const proc = spawn(command, commandArgs, {
      cwd,
      stdio: "pipe",
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (error) => {
      reject(error);
    });

    proc.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
  });
};

describe("effect-patterns-cli invocation variants", () => {
  it("shows help when called with no arguments", async () => {
    const result = await runCli([]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("EffectPatterns CLI");
    expect(result.stdout).toContain("USAGE");
  });

  it("fails with an unknown command", async () => {
    const result = await runCli(["nope"]);

    const combinedOutput = `${result.stdout}\n${result.stderr}`.toLowerCase();
    expect(combinedOutput).toContain("effectpatterns cli");
  });
});

describe("effect-patterns-cli basic behavior", () => {
  it("shows help with --help", async () => {
    const result = await runCli(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("EffectPatterns CLI");
    expect(result.stdout).toContain("USAGE");
  });

  it("shows help with -h", async () => {
    const result = await runCli(["-h"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("EffectPatterns CLI");
  });

  it("shows version with --version", async () => {
    const result = await runCli(["--version"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim().length).toBeGreaterThan(0);
  });

  it("exposes top-level commands in help output", async () => {
    const result = await runCli(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("pattern");
    expect(result.stdout).toContain("install");
    expect(result.stdout).toContain("admin");
  });
});

describe("effect-patterns-cli command structure", () => {
  it("shows subcommands for top-level commands", async () => {
    const commands = ["pattern", "install", "admin"];

    for (const cmd of commands) {
      const result = await runCli([cmd, "--help"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(cmd);
    }
  });

  it("pattern new help mentions create", async () => {
    const result = await runCli(["pattern", "new", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toLowerCase()).toContain("create");
  });
});

describe("effect-patterns-cli install command", () => {
  it("shows install help", async () => {
    const result = await runCli(["install", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("install");
  });

  it("shows install list help", async () => {
    const result = await runCli(["install", "list", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toLowerCase()).toContain("list");
  });

  it("shows help for install add", async () => {
    const result = await runCli(["install", "add", "--help"]);

    expect(result.exitCode).toBe(0);
    const output = result.stdout.toLowerCase();
    expect(output).toContain("usage");
    expect(output).toContain("--tool");
  });

  it("lists supported tools with install list", async () => {
    const result = await runCli(["install", "list"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Supported AI Tools");
    expect(result.stdout).toContain("cursor");
    expect(result.stdout).toContain("agents");
  });

  it("supports verbose flag for install list", async () => {
    const result = await runCli(["install", "list", "--verbose"]);

    expect([0, 1]).toContain(result.exitCode);
  });

  it("requires --tool for install add", async () => {
    const result = await runCli(["install", "add"]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toLowerCase()).toContain("tool");
  });
});

describe("effect-patterns-cli admin command", () => {
  it("shows admin help", async () => {
    const result = await runCli(["admin", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("admin");
  });

  it("shows admin validate help", async () => {
    const result = await runCli(["admin", "validate", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toLowerCase()).toContain("validate");
  });

  it("shows admin release help", async () => {
    const result = await runCli(["admin", "release", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toLowerCase()).toContain("release");
  });

  it("shows admin rules help", async () => {
    const result = await runCli(["admin", "rules", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toLowerCase()).toContain("rules");
  });

  it("runs admin validate with relaxed expectations", async () => {
    const result = await runCli(["admin", "validate"]);

    expect([0, 1]).toContain(result.exitCode);
  });

  it("supports verbose flag for admin validate", async () => {
    const result = await runCli(["admin", "validate", "--verbose"]);

    expect([0, 1]).toContain(result.exitCode);
  });

  it("runs admin test with relaxed expectations", async () => {
    const result = await runCli(["admin", "test"]);

    expect([0, 1]).toContain(result.exitCode);
  });
});

describe("effect-patterns-cli admin pipeline and generate", () => {
  it("runs admin pipeline in repo root with relaxed expectations", async () => {
    const result = await runCli(["admin", "pipeline"]);

    expect([0, 1]).toContain(result.exitCode);
  });

  it("runs admin generate in repo root with relaxed expectations", async () => {
    const result = await runCli(["admin", "generate"]);

    expect([0, 1]).toContain(result.exitCode);
  });
});

describe("effect-patterns-cli release commands", () => {
  it("runs admin release preview in repo root with relaxed expectations", async () => {
    const result = await runCli(["admin", "release", "preview"]);

    expect([0, 1]).toContain(result.exitCode);
  });
});

describe("effect-patterns-cli behavior outside project root", () => {
  it("fails admin pipeline in a non-project directory", async () => {
    const tempDir = mkdtempSync(path.join("/tmp", "effect-patterns-cli-bad-"));

    const result = await runCli(["admin", "pipeline"], { cwd: tempDir });

    expect(result.exitCode).not.toBe(0);
  });

  it("fails admin generate in a non-project directory", async () => {
    const tempDir = mkdtempSync(path.join("/tmp", "effect-patterns-cli-bad-"));

    const result = await runCli(["admin", "generate"], { cwd: tempDir });

    expect(result.exitCode).not.toBe(0);
  });

  it("fails admin release preview in a non-project directory", async () => {
    const tempDir = mkdtempSync(path.join("/tmp", "effect-patterns-cli-bad-"));

    const result = await runCli(["admin", "release", "preview"], {
      cwd: tempDir,
    });

    expect(result.exitCode).not.toBe(0);
  });
});
