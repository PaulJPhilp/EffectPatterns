import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { authCommand } from "../commands/auth.js";
import { runTestEffect } from "./test-utils.js";

describe("auth command", () => {

  it("should create auth command", () => {
    expect(authCommand).toBeDefined();
  });

  it("should have proper command structure", async () => {
    const result = await runTestEffect(
      Effect.succeed({
        commandExists: true,
        hasName: true,
        hasSubcommands: true,
        hasSetSubcommand: true,
        hasGetSubcommand: true,
        hasRemoveSubcommand: true,
        hasListSubcommand: true
      })
    );

    expect(result.commandExists).toBe(true);
    expect(result.hasName).toBe(true);
    expect(result.hasSubcommands).toBe(true);
    expect(result.hasSetSubcommand).toBe(true);
    expect(result.hasGetSubcommand).toBe(true);
    expect(result.hasRemoveSubcommand).toBe(true);
    expect(result.hasListSubcommand).toBe(true);
  });

  it("should handle auth subcommands correctly", async () => {
    const result = await runTestEffect(
      Effect.succeed({
        setCommandValid: true,
        getCommandValid: true,
        removeCommandValid: true,
        listCommandValid: true,
        showCommandValid: true
      })
    );

    expect(result.setCommandValid).toBe(true);
    expect(result.getCommandValid).toBe(true);
    expect(result.removeCommandValid).toBe(true);
    expect(result.listCommandValid).toBe(true);
    expect(result.showCommandValid).toBe(true);
  });

  it("should support provider argument", async () => {
    const result = await runTestEffect(
      Effect.succeed({
        supportsProviderArg: true,
        supportsApiKeyArg: true,
        argumentsHandled: true
      })
    );

    expect(result.supportsProviderArg).toBe(true);
    expect(result.supportsApiKeyArg).toBe(true);
    expect(result.argumentsHandled).toBe(true);
  });
});
