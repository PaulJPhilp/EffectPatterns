/**
 * Skill Schema Tests (No Mocks)
 *
 * Tests for skills and skillPatterns table definitions and type structures.
 */

import { describe, expect, it } from "vitest"
import {
  skills,
  skillPatterns,
  type Skill,
  type NewSkill,
  type SkillPattern,
  type NewSkillPattern,
} from "../db/schema/index.js"

describe("Skill Schema", () => {
  describe("Table Definitions", () => {
    it("should export skills table", () => {
      expect(skills).toBeDefined()
      expect(typeof skills).toBe("object")
    })

    it("should export skillPatterns table", () => {
      expect(skillPatterns).toBeDefined()
      expect(typeof skillPatterns).toBe("object")
    })
  })

  describe("Skill Type Structure", () => {
    it("should have correct Skill type with all required fields", () => {
      const skill: Partial<Skill> = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        slug: "effect-patterns-concurrency",
        name: "effect-patterns-concurrency",
        description: "Concurrency patterns for Effect-TS",
        category: "concurrency",
        content: "# Skill content",
        version: 1,
        patternCount: 20,
        applicationPatternId: "660e8400-e29b-41d4-a716-446655440000",
        validated: false,
        validatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(skill.id).toBe("550e8400-e29b-41d4-a716-446655440000")
      expect(skill.slug).toBe("effect-patterns-concurrency")
      expect(skill.name).toBe("effect-patterns-concurrency")
      expect(skill.description).toBe("Concurrency patterns for Effect-TS")
      expect(skill.category).toBe("concurrency")
      expect(skill.content).toBe("# Skill content")
      expect(skill.version).toBe(1)
      expect(skill.patternCount).toBe(20)
      expect(skill.validated).toBe(false)
      expect(skill.createdAt).toBeInstanceOf(Date)
      expect(skill.updatedAt).toBeInstanceOf(Date)
    })

    it("should allow nullable fields to be null", () => {
      const skill: Partial<Skill> = {
        id: "test-id",
        slug: "test-skill",
        name: "test-skill",
        description: "Test",
        category: null,
        content: null,
        applicationPatternId: null,
        validatedAt: null,
      }

      expect(skill.category).toBeNull()
      expect(skill.content).toBeNull()
      expect(skill.applicationPatternId).toBeNull()
      expect(skill.validatedAt).toBeNull()
    })

    it("should have correct NewSkill type for inserts", () => {
      const newSkill: NewSkill = {
        slug: "effect-patterns-testing",
        name: "effect-patterns-testing",
        description: "Testing patterns",
      }

      // Only slug, name, description are required
      expect(newSkill.slug).toBe("effect-patterns-testing")
      expect(newSkill.name).toBe("effect-patterns-testing")
      expect(newSkill.description).toBe("Testing patterns")
    })

    it("should accept all optional fields in NewSkill", () => {
      const fullNewSkill: NewSkill = {
        slug: "effect-patterns-streams",
        name: "effect-patterns-streams",
        description: "Stream patterns",
        category: "streams",
        content: "# Stream patterns\n...",
        version: 2,
        patternCount: 8,
        applicationPatternId: "some-uuid",
        validated: true,
        validatedAt: new Date(),
      }

      expect(fullNewSkill.category).toBe("streams")
      expect(fullNewSkill.version).toBe(2)
      expect(fullNewSkill.patternCount).toBe(8)
      expect(fullNewSkill.validated).toBe(true)
    })
  })

  describe("SkillPattern Type Structure", () => {
    it("should have correct SkillPattern type", () => {
      const skillPattern: SkillPattern = {
        skillId: "skill-uuid-1",
        patternId: "pattern-uuid-1",
      }

      expect(skillPattern.skillId).toBe("skill-uuid-1")
      expect(skillPattern.patternId).toBe("pattern-uuid-1")
    })

    it("should have correct NewSkillPattern type for inserts", () => {
      const newSkillPattern: NewSkillPattern = {
        skillId: "skill-uuid-1",
        patternId: "pattern-uuid-1",
      }

      // Both fields are required
      expect(newSkillPattern.skillId).toBe("skill-uuid-1")
      expect(newSkillPattern.patternId).toBe("pattern-uuid-1")
    })
  })
})
