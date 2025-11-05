import { describe, expect, it } from "vitest";
import {
  generateCompactRules,
  generateFullRules,
  generateJsonRules,
} from "../publish/rules.js";

describe("Rules generation functions", () => {
  it("should generate full rules content", async () => {
    const mockRules = [
      {
        id: "test-1",
        title: "Test Rule",
        description: "A test rule description",
        skillLevel: "Beginner",
        useCases: ["Testing"],
        example: "console.log('test');",
        content: "Full content here",
      },
    ];

    const result = await generateFullRules(mockRules);
    expect(result).toContain("# Effect-TS Patterns - Complete Rules");
    expect(result).toContain("Test Rule");
    expect(result).toContain("A test rule description");
  });

  it("should generate compact rules content", async () => {
    const mockRules = [
      {
        id: "test-1",
        title: "Test Rule",
        description: "A test rule description",
        skillLevel: "Beginner",
        useCases: ["Testing"],
        example: "console.log('test');",
        content: "Full content here",
      },
    ];

    const result = await generateCompactRules(mockRules);
    expect(result).toContain("# Effect-TS Patterns - Compact Rules");
    expect(result).toContain("Test Rule");
    expect(result).toContain("A test rule description");
  });

  it("should generate JSON rules content", async () => {
    const mockRules = [
      {
        id: "test-1",
        title: "Test Rule",
        description: "A test rule description",
        skillLevel: "Beginner",
        useCases: ["Testing"],
        example: "console.log('test');",
        content: "Full content here",
      },
    ];

    const result = await generateJsonRules(mockRules);
    expect(result).toContain("test-1");
    expect(result).toContain("Test Rule");
    expect(result).toContain("A test rule description");
  });
});
