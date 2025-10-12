import { describe, it, expect } from "vitest";
import { generateFullRules, generateCompactRules, generateJsonRules } from "../publish/rules.js";

describe("Rules generation functions", () => {
  it("should generate full rules content", () => {
    const mockRules = [
      {
        id: "test-1",
        title: "Test Rule",
        description: "A test rule description",
        skillLevel: "Beginner",
        useCases: ["Testing"],
        example: "console.log('test');",
        content: "Full content here"
      }
    ];
    
    const result = generateFullRules(mockRules);
    expect(result).toContain("# Effect Coding Rules for AI");
    expect(result).toContain("Test Rule");
    expect(result).toContain("A test rule description");
  });

  it("should generate compact rules content", () => {
    const mockRules = [
      {
        id: "test-1",
        title: "Test Rule",
        description: "A test rule description",
        skillLevel: "Beginner",
        useCases: ["Testing"],
        example: "console.log('test');",
        content: "Full content here"
      }
    ];
    
    const result = generateCompactRules(mockRules);
    expect(result).toContain("# Effect Coding Rules for AI (Compact)");
    expect(result).toContain("Test Rule");
    expect(result).toContain("A test rule description");
  });

  it("should generate JSON rules content", () => {
    const mockRules = [
      {
        id: "test-1",
        title: "Test Rule",
        description: "A test rule description",
        skillLevel: "Beginner",
        useCases: ["Testing"],
        example: "console.log('test');",
        content: "Full content here"
      }
    ];
    
    const result = generateJsonRules(mockRules);
    expect(result).toContain("test-1");
    expect(result).toContain("Test Rule");
    expect(result).toContain("A test rule description");
  });
});
