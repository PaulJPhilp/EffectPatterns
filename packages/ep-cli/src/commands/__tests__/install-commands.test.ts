/**
 * Tests for install command handlers
 */

import { Effect, Exit } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../../index.js";

const run = (args: string[]) =>
  Effect.runPromiseExit(runCli(["bun", "ep", ...args]));

describe("install commands", () => {
  let logOutput: string[];
  let errorOutput: string[];

  beforeEach(() => {
    logOutput = [];
    errorOutput = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      logOutput.push(args.map(String).join(" "));
    });
    vi.spyOn(console, "error").mockImplementation((...args) => {
      errorOutput.push(args.map(String).join(" "));
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "table").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("install list", () => {
    it("lists supported tools", async () => {
      const exit = await run(["install", "list"]);
      expect(Exit.isSuccess(exit)).toBe(true);
      const output = logOutput.join("\n");
      expect(output).toContain("agents");
      expect(output).toContain("cursor");
      expect(output).toContain("vscode");
      expect(output).toContain("windsurf");
    });

    it("outputs JSON for --json", async () => {
      const exit = await run(["install", "list", "--json"]);
      expect(Exit.isSuccess(exit)).toBe(true);
      const jsonLines = logOutput.join("\n");
      const parsed = JSON.parse(jsonLines);
      expect(Array.isArray(parsed.tools)).toBe(true);
      expect(parsed.tools).toContain("cursor");
      expect(parsed.tools).toContain("agents");
    });

    it("outputs JSON for --installed --json with no rules", async () => {
      const exit = await run(["install", "list", "--installed", "--json"]);
      expect(Exit.isSuccess(exit)).toBe(true);
      const jsonLines = logOutput.join("\n");
      const parsed = JSON.parse(jsonLines);
      expect(parsed.count).toBe(0);
      expect(Array.isArray(parsed.rules)).toBe(true);
    });
  });

  describe("install add", () => {
    it("rejects unsupported tool", async () => {
      const exit = await run(["install", "add", "--tool", "not-a-tool"]);
      expect(Exit.isFailure(exit)).toBe(true);
      const output = errorOutput.join("\n");
      expect(output).toContain("not supported");
    });

    it("shows help text", async () => {
      const exit = await run(["install", "add", "--help"]);
      expect(Exit.isSuccess(exit)).toBe(true);
    });
  });

  describe("install help", () => {
    it("shows install help", async () => {
      const exit = await run(["install", "--help"]);
      expect(Exit.isSuccess(exit)).toBe(true);
    });
  });
});
