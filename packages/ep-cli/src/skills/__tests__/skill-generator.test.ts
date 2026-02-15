/**
 * Tests for skill-generator utilities
 */

import { describe, expect, it } from "vitest";
import { extractSection, groupPatternsByCategory, generateCategorySkill } from "../skill-generator.js";
import type { PatternContent } from "../skill-generator.js";

describe("extractSection", () => {
  const markdown = [
    "# Main Title",
    "",
    "## Good Example",
    "",
    "```typescript",
    "const x = 1;",
    "```",
    "",
    "## Anti-Pattern",
    "",
    "Don't do this.",
    "",
    "## Rationale",
    "",
    "Because reasons.",
  ].join("\n");

  it("extracts a named section", () => {
    const result = extractSection(markdown, "Good Example");
    expect(result).toContain("const x = 1;");
  });

  it("extracts section up to next heading", () => {
    const result = extractSection(markdown, "Anti-Pattern");
    expect(result).toBe("Don't do this.");
  });

  it("extracts last section", () => {
    const result = extractSection(markdown, "Rationale");
    expect(result).toBe("Because reasons.");
  });

  it("returns empty string for missing section", () => {
    expect(extractSection(markdown, "NonExistent")).toBe("");
  });

  it("returns empty string for empty content", () => {
    expect(extractSection("", "Good Example")).toBe("");
  });

  it("accepts multiple section name alternatives", () => {
    const result = extractSection(markdown, "Guideline", "Rationale");
    expect(result).toBe("Because reasons.");
  });

  it("is case-insensitive for section names", () => {
    const result = extractSection(markdown, "good example");
    expect(result).toContain("const x = 1;");
  });

  it("does not match ### headings as section boundaries", () => {
    const nested = [
      "## Good Example",
      "",
      "### Sub-heading",
      "",
      "Content under sub-heading.",
      "",
      "## Anti-Pattern",
    ].join("\n");
    const result = extractSection(nested, "Good Example");
    expect(result).toContain("Sub-heading");
    expect(result).toContain("Content under sub-heading.");
  });
});

describe("groupPatternsByCategory", () => {
  const patterns: PatternContent[] = [
    {
      id: "p1",
      title: "Pattern 1",
      skillLevel: "beginner",
      applicationPatternId: "Error Handling",
      summary: "Summary 1",
      goodExample: "",
      antiPattern: "",
      rationale: "",
    },
    {
      id: "p2",
      title: "Pattern 2",
      skillLevel: "intermediate",
      applicationPatternId: "Error Handling",
      summary: "Summary 2",
      goodExample: "",
      antiPattern: "",
      rationale: "",
    },
    {
      id: "p3",
      title: "Pattern 3",
      skillLevel: "advanced",
      applicationPatternId: "Stream Processing",
      summary: "Summary 3",
      goodExample: "",
      antiPattern: "",
      rationale: "",
    },
  ];

  it("groups patterns by normalized category", () => {
    const groups = groupPatternsByCategory(patterns);
    expect(groups.size).toBe(2);
    expect(groups.get("error-handling")?.length).toBe(2);
    expect(groups.get("stream-processing")?.length).toBe(1);
  });

  it("skips patterns without applicationPatternId", () => {
    const groups = groupPatternsByCategory([
      { ...patterns[0]!, applicationPatternId: "" },
    ]);
    expect(groups.size).toBe(0);
  });
});

describe("generateCategorySkill", () => {
  const patterns: PatternContent[] = [
    {
      id: "p1",
      title: "Basic Error",
      skillLevel: "beginner",
      applicationPatternId: "error-handling",
      summary: "Summary",
      rule: { description: "Always handle errors" },
      goodExample: "Effect.catchTag(...)",
      antiPattern: "try/catch everything",
      rationale: "Type-safe error handling",
    },
    {
      id: "p2",
      title: "Advanced Error",
      skillLevel: "advanced",
      applicationPatternId: "error-handling",
      summary: "Summary",
      goodExample: "Effect.catchTags(...)",
      antiPattern: "ignoring errors",
      rationale: "Exhaustive error handling",
    },
  ];

  it("generates valid SKILL.md content", () => {
    const result = generateCategorySkill("error-handling", patterns);
    expect(result).toContain("# Effect-TS Patterns: Error Handling");
    expect(result).toContain("effect-patterns-error-handling");
  });

  it("includes YAML frontmatter", () => {
    const result = generateCategorySkill("error-handling", patterns);
    expect(result).toContain("---");
    expect(result).toContain("name: effect-patterns-error-handling");
  });

  it("sorts patterns by skill level", () => {
    const result = generateCategorySkill("error-handling", patterns);
    const beginnerIdx = result.indexOf("Beginner Patterns");
    const advancedIdx = result.indexOf("Advanced Patterns");
    expect(beginnerIdx).toBeLessThan(advancedIdx);
  });

  it("includes pattern details", () => {
    const result = generateCategorySkill("error-handling", patterns);
    expect(result).toContain("Basic Error");
    expect(result).toContain("Always handle errors");
    expect(result).toContain("Effect.catchTag(...)");
    expect(result).toContain("try/catch everything");
    expect(result).toContain("Type-safe error handling");
  });
});
