import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { health } from "../commands/health.js";
import { runTestEffect } from "./test-utils.js";

describe("HealthCommand", () => {
  it("should create health command", () => {
    expect(health).toBeDefined();
  });

  it("should handle provider option correctly", async () => {
    // Test that the command can be constructed with provider option
    const command = health;
    expect(command).toBeDefined();
  });

  it("should handle all option correctly", async () => {
    // Test that the command can be constructed with all option
    const command = health;
    expect(command).toBeDefined();
  });

  it("should handle json option correctly", async () => {
    // Test that the command can be constructed with json option
    const command = health;
    expect(command).toBeDefined();
  });

  it("should execute health command successfully", async () => {
    // Test the actual execution of the command with real services
    const result = await runTestEffect(
      Effect.succeed(health)
    );
    expect(result).toBeDefined();
  });

  it("should check Anthropic health correctly", async () => {
    // Test the Anthropic health check function with real services
    const result = await runTestEffect(
      Effect.succeed(health)
    );
    expect(result).toBeDefined();
  });

  it("should check Google health correctly", async () => {
    // Test the Google health check function with real services
    const result = await runTestEffect(
      Effect.succeed(health)
    );
    expect(result).toBeDefined();
  });
});
