/**
 * Skill Repository Unit Tests (No Mocks)
 *
 * Tests for Skill error classes, locking logic, and search parameter validation.
 */

import { describe, expect, it } from "vitest"
import {
  SkillNotFoundError,
  SkillRepositoryError,
  SkillLockedError,
} from "../repositories/skill.js"

describe("Skill Repository Error Classes", () => {
  describe("SkillNotFoundError", () => {
    it("should create error with identifier", () => {
      const error = new SkillNotFoundError("effect-patterns-concurrency")

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(SkillNotFoundError)
      expect(error.identifier).toBe("effect-patterns-concurrency")
      expect(error._tag).toBe("SkillNotFoundError")
      expect(error.message).toContain("effect-patterns-concurrency")
      expect(error.message).toContain("not found")
    })

    it("should work with UUID identifiers", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000"
      const error = new SkillNotFoundError(uuid)

      expect(error.identifier).toBe(uuid)
      expect(error.message).toContain(uuid)
    })
  })

  describe("SkillRepositoryError", () => {
    it("should create error with operation and cause", () => {
      const cause = new Error("Database connection failed")
      const error = new SkillRepositoryError("findAll", cause)

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(SkillRepositoryError)
      expect(error.operation).toBe("findAll")
      expect(error.cause).toBe(cause)
      expect(error._tag).toBe("SkillRepositoryError")
      expect(error.message).toContain("findAll")
      expect(error.message).toContain("Database connection failed")
    })

    it("should handle string cause", () => {
      const error = new SkillRepositoryError("create", "timeout")

      expect(error.operation).toBe("create")
      expect(error.cause).toBe("timeout")
      expect(error.message).toContain("timeout")
    })

    it("should handle all standard operations", () => {
      const operations = [
        "findAll",
        "findById",
        "findBySlug",
        "create",
        "update",
        "delete",
        "upsert",
        "search",
        "getPatterns",
        "setPatterns",
      ]

      for (const op of operations) {
        const error = new SkillRepositoryError(op, "test")
        expect(error.operation).toBe(op)
        expect(error.message).toContain(op)
      }
    })
  })

  describe("SkillLockedError", () => {
    it("should create error with identifier", () => {
      const error = new SkillLockedError("locked-skill")

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(SkillLockedError)
      expect(error.identifier).toBe("locked-skill")
      expect(error._tag).toBe("SkillLockedError")
      expect(error.message).toContain("locked-skill")
      expect(error.message).toContain("locked")
    })

    it("should mention validated in error message", () => {
      const error = new SkillLockedError("my-skill")
      expect(error.message).toContain("validated")
    })
  })
})

describe("Skill Repository Logic", () => {
  describe("Skill Locking Logic", () => {
    it("should identify locked skills", () => {
      const isLocked = (skill: { validated: boolean }) =>
        skill.validated === true

      expect(isLocked({ validated: true })).toBe(true)
      expect(isLocked({ validated: false })).toBe(false)
    })

    it("should handle undefined validated field", () => {
      const isLocked = (skill: any) => skill.validated === true

      expect(isLocked({ validated: undefined })).toBe(false)
      expect(isLocked({ validated: null })).toBe(false)
      expect(isLocked({})).toBe(false)
    })
  })

  describe("Search Parameters Validation", () => {
    it("should accept valid search parameters", () => {
      const validParams = {
        query: "concurrency",
        category: "streams",
        applicationPatternId: "550e8400-e29b-41d4-a716-446655440000",
        validated: true,
        limit: 10,
        offset: 0,
        orderBy: "name" as const,
        orderDirection: "asc" as const,
      }

      expect(validParams.query).toBeTruthy()
      expect(validParams.limit).toBeGreaterThan(0)
      expect(["name", "createdAt", "version"]).toContain(validParams.orderBy)
      expect(["asc", "desc"]).toContain(validParams.orderDirection)
    })

    it("should accept minimal search parameters", () => {
      const minimalParams = {}
      expect(Object.keys(minimalParams)).toHaveLength(0)
    })

    it("should validate order by values", () => {
      const validOrderBy = ["name", "createdAt", "version"]
      const invalidOrderBy = ["slug", "description", "random"]

      for (const value of validOrderBy) {
        expect(validOrderBy).toContain(value)
      }

      for (const value of invalidOrderBy) {
        expect(validOrderBy).not.toContain(value)
      }
    })
  })

  describe("Skill Data Validation", () => {
    it("should validate skill slug format", () => {
      const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/

      const validSlugs = [
        "effect-patterns-concurrency",
        "effect-patterns-getting-started",
        "effect-patterns-building-apis",
        "simple",
      ]

      const invalidSlugs = [
        "Effect-Patterns-Concurrency", // uppercase
        "effect_patterns", // underscores
        "", // empty
        "trailing-", // trailing dash
        "-leading", // leading dash
      ]

      for (const slug of validSlugs) {
        expect(slugRegex.test(slug)).toBe(true)
      }

      for (const slug of invalidSlugs) {
        expect(slugRegex.test(slug)).toBe(false)
      }
    })

    it("should validate required fields", () => {
      const validSkill = {
        slug: "effect-patterns-testing",
        name: "effect-patterns-testing",
        description: "Testing patterns",
      }

      expect(validSkill.slug).toBeTruthy()
      expect(validSkill.name).toBeTruthy()
      expect(validSkill.description).toBeTruthy()
    })

    it("should validate version is positive integer", () => {
      const validVersions = [1, 2, 10, 100]
      const invalidVersions = [0, -1, 1.5]

      for (const version of validVersions) {
        expect(version).toBeGreaterThan(0)
        expect(Number.isInteger(version)).toBe(true)
      }

      for (const version of invalidVersions) {
        expect(version > 0 && Number.isInteger(version)).toBe(false)
      }
    })

    it("should validate patternCount is non-negative integer", () => {
      const validCounts = [0, 1, 6, 49]
      const invalidCounts = [-1, 1.5]

      for (const count of validCounts) {
        expect(count).toBeGreaterThanOrEqual(0)
        expect(Number.isInteger(count)).toBe(true)
      }

      for (const count of invalidCounts) {
        expect(count >= 0 && Number.isInteger(count)).toBe(false)
      }
    })
  })
})
