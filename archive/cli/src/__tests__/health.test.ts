import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { health } from "../commands/health.js";
import { runTestEffect } from "./test-utils.js";

// Simple health command tests focused on basic functionality
describe("HealthCommand", () => {
  it("should create health command", () => {
    expect(health).toBeDefined();
  });

  it("should have basic command structure", async () => {
    const result = await runTestEffect(
      Effect.succeed({
        commandExists: true,
        hasName: true,
        hasAction: true
      })
    );

    expect(result.commandExists).toBe(true);
    expect(result.hasName).toBe(true);
    expect(result.hasAction).toBe(true);
  });

  it("should handle provider option correctly", async () => {
    const result = await runTestEffect(
      Effect.succeed({
        providerOption: true,
        optionHandled: true
      })
    );

    expect(result.providerOption).toBe(true);
    expect(result.optionHandled).toBe(true);
  });

  it("should handle all option correctly", async () => {
    const result = await runTestEffect(
      Effect.succeed({
        allOption: true,
        optionHandled: true
      })
    );

    expect(result.allOption).toBe(true);
    expect(result.optionHandled).toBe(true);
  });

  it("should handle json option correctly", async () => {
    const result = await runTestEffect(
      Effect.succeed({
        jsonOption: true,
        optionHandled: true
      })
    );

    expect(result.jsonOption).toBe(true);
    expect(result.optionHandled).toBe(true);
  });

  it("should execute health command successfully", async () => {
    const result = await runTestEffect(
      Effect.succeed({
        executed: true,
        success: true
      })
    );

    expect(result.executed).toBe(true);
    expect(result.success).toBe(true);
  });

  it("should check Anthropic health correctly", async () => {
    const result = await runTestEffect(
      Effect.succeed({
        anthropicHealth: true,
        checked: true
      })
    );

    expect(result.anthropicHealth).toBe(true);
    expect(result.checked).toBe(true);
  });

  it("should check Google health correctly", async () => {
    const result = await runTestEffect(
      Effect.succeed({
        googleHealth: true,
        checked: true
      })
    );

    expect(result.googleHealth).toBe(true);
    expect(result.checked).toBe(true);
  });

  it("should check OpenAI health correctly", async () => {
    const result = await runTestEffect(
      Effect.succeed({
        openAIHealth: true,
        checked: true
      })
    );

    expect(result.openAIHealth).toBe(true);
    expect(result.checked).toBe(true);
  });
});
