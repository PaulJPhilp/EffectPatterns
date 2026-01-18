/**
 * Install Service Tests
 */

import { describe, expect, it } from "vitest";
import { MOCK_RULES } from "../service.js";

describe("Install Service", () => {
  describe("Mock Rules", () => {
    it("should have initial mock rules", () => {
      expect(MOCK_RULES).toBeDefined();
      expect(MOCK_RULES.length).toBeGreaterThan(0);
    });

    it("should contain error-management rule", () => {
      const rule = MOCK_RULES.find((r) => r.id === "error-management");
      expect(rule).toBeDefined();
      expect(rule?.id).toBe("error-management");
      expect(rule?.title).toBe("Error Recovery Pattern");
      expect(rule?.skillLevel).toBe("beginner");
    });

    it("should contain concurrency rule", () => {
      const rule = MOCK_RULES.find((r) => r.id === "concurrency");
      expect(rule).toBeDefined();
      expect(rule?.id).toBe("concurrency");
      expect(rule?.title).toBe("Concurrency Control");
      expect(rule?.skillLevel).toBe("intermediate");
    });

    it("should contain resource-management rule", () => {
      const rule = MOCK_RULES.find((r) => r.id === "resource-management");
      expect(rule).toBeDefined();
      expect(rule?.id).toBe("resource-management");
      expect(rule?.title).toBe("Resource Management");
      expect(rule?.skillLevel).toBe("advanced");
    });

    it("should have all required rule fields", () => {
      MOCK_RULES.forEach((rule) => {
        expect(rule).toHaveProperty("id");
        expect(rule).toHaveProperty("title");
        expect(rule).toHaveProperty("description");
        expect(rule).toHaveProperty("skillLevel");
        expect(rule).toHaveProperty("useCase");
        expect(rule).toHaveProperty("content");
      });
    });

    it("should have valid use case arrays", () => {
      MOCK_RULES.forEach((rule) => {
        const useCase = rule.useCase || [];
        expect(Array.isArray(useCase)).toBe(true);
        expect(useCase.length).toBeGreaterThan(0);
        useCase.forEach((uc) => {
          expect(typeof uc).toBe("string");
        });
      });
    });
  });

  describe("Service API Structure", () => {
    it("should export Install context tag", async () => {
      const { Install } = await import("../service.js");
      expect(Install).toBeDefined();
    });

    it("should export InstallLive layer", async () => {
      const { InstallLive } = await import("../service.js");
      expect(InstallLive).toBeDefined();
    });

    it("should have service methods defined", async () => {
      const api = await import("../api.js");
      expect(api.RuleSchema).toBeDefined();
      expect(api.InstalledRuleSchema).toBeDefined();
    });
  });

  describe("Rule Filtering Logic", () => {
    it("should match query in title", () => {
      const query = "concurrency";
      const matches = MOCK_RULES.filter((r) =>
        r.title.toLowerCase().includes(query.toLowerCase())
      );
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((r) => r.id === "concurrency")).toBe(true);
    });

    it("should match query in description", () => {
      const query = "error";
      const matches = MOCK_RULES.filter((r) =>
        r.description.toLowerCase().includes(query.toLowerCase())
      );
      expect(matches.length).toBeGreaterThan(0);
    });

    it("should filter by skill level", () => {
      const skillLevel = "beginner";
      const matches = MOCK_RULES.filter((r) => r.skillLevel === skillLevel);
      expect(matches.every((r) => r.skillLevel === skillLevel)).toBe(true);
    });

    it("should filter by use case", () => {
      const useCase = "concurrency";
      const matches = MOCK_RULES.filter((r) => r.useCase?.includes(useCase));
      expect(matches.every((r) => r.useCase?.includes(useCase))).toBe(true);
    });

    it("should combine query and skill level filters", () => {
      const query = "error";
      const skillLevel = "beginner";
      let rules = MOCK_RULES;
      if (query) {
        const q = query.toLowerCase();
        rules = rules.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q)
        );
      }
      if (skillLevel) {
        rules = rules.filter((r) => r.skillLevel === skillLevel);
      }
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((r) => r.skillLevel === skillLevel)).toBe(true);
    });

    it("should return empty for non-matching query", () => {
      const query = "nonexistentquery";
      const matches = MOCK_RULES.filter(
        (r) =>
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.description.toLowerCase().includes(query.toLowerCase())
      );
      expect(matches).toEqual([]);
    });

    it("should perform case-insensitive search", () => {
      const query = "ERROR";
      const matches = MOCK_RULES.filter((r) =>
        r.title.toLowerCase().includes(query.toLowerCase())
      );
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe("Rule Lookup", () => {
    it("should find rule by id", () => {
      const rule = MOCK_RULES.find((r) => r.id === "error-management");
      expect(rule).toBeDefined();
      expect(rule?.id).toBe("error-management");
    });

    it("should return undefined for non-existent id", () => {
      const rule = MOCK_RULES.find((r) => r.id === "nonexistent");
      expect(rule).toBeUndefined();
    });

    it("should find all rules with matching use case", () => {
      const useCase = "error-management";
      const matches = MOCK_RULES.filter((r) => r.useCase?.includes(useCase));
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((r) => r.id === "error-management")).toBe(true);
    });
  });
});
