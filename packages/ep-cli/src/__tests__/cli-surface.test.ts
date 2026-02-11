import { Effect, Exit } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../index.js";

const run = (argv: ReadonlyArray<string>) => Effect.runPromiseExit(runCli(argv));

describe("ep-cli command surface", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs root help successfully", async () => {
    const exit = await run(["bun", "ep", "--help"]);
    expect(Exit.isSuccess(exit)).toBe(true);
  });

  it("exposes only public end-user commands", async () => {
    const expectedCommands = ["search", "list", "show", "install", "skills"];

    for (const command of expectedCommands) {
      const exit = await run(["bun", "ep", command, "--help"]);
      expect(Exit.isSuccess(exit)).toBe(true);
    }
  });

  it("rejects maintainer-only commands", async () => {
    const removedCommands = ["admin", "pattern", "release"];

    for (const command of removedCommands) {
      const exit = await run(["bun", "ep", command]);
      expect(Exit.isFailure(exit)).toBe(true);
    }
  });
});
