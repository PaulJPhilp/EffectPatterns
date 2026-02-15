/**
 * Tests for pattern repository command handlers
 */

import { Effect, Exit } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../../index.js";

const run = (args: string[]) =>
  Effect.runPromiseExit(runCli(["bun", "ep", ...args]));

describe("pattern repo commands", () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("search", () => {
    it("shows help text", async () => {
      const exit = await run(["search", "--help"]);
      expect(Exit.isSuccess(exit)).toBe(true);
    });

    it("requires a query argument", async () => {
      const exit = await run(["search"]);
      expect(Exit.isFailure(exit)).toBe(true);
    });
  });

  describe("list", () => {
    it("shows help text", async () => {
      const exit = await run(["list", "--help"]);
      expect(Exit.isSuccess(exit)).toBe(true);
    });
  });

  describe("show", () => {
    it("shows help text", async () => {
      const exit = await run(["show", "--help"]);
      expect(Exit.isSuccess(exit)).toBe(true);
    });

    it("requires a pattern-id argument", async () => {
      const exit = await run(["show"]);
      expect(Exit.isFailure(exit)).toBe(true);
    });
  });
});
