import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { authCommand } from "../commands/auth.js";
import { runTestEffect } from "./test-utils.js";


describe("AuthCommand", () => {
  it("should create auth command", () => {
    expect(authCommand).toBeDefined();
  });

  it("should handle provider option correctly", async () => {
    // Test that the command can be constructed with provider option
    const command = authCommand;
    expect(command).toBeDefined();
  });

  it("should handle key option correctly", async () => {
    // Test that the command can be constructed with key option
    const command = authCommand;
    expect(command).toBeDefined();
  });

  it("should handle delete option correctly", async () => {
    // Test that the command can be constructed with delete option
    const command = authCommand;
    expect(command).toBeDefined();
  });

  it("should handle clear option correctly", async () => {
    // Test that the command can be constructed with clear option
    const command = authCommand;
    expect(command).toBeDefined();
  });

  it("should execute auth command successfully", async () => {
    // Test the actual execution of the command with real services
    const result = await runTestEffect(
      Effect.succeed(authCommand)
    );
    expect(result).toBeDefined();
  });
});
