/**
 * Skill Repository Integration Tests
 *
 * These tests require a running PostgreSQL database.
 * Run with: bun test packages/toolkit/src/__tests__/skill-repository.test.ts
 *
 * Prerequisites:
 * - docker-compose up -d postgres
 * - bun run db:push
 *
 * Environment:
 * - TEST_DATABASE_URL (optional) - Test database URL
 * - DATABASE_URL (optional) - Default database URL
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import {
  createSkillRepository,
  SkillLockedError,
  SkillNotFoundError,
} from "../repositories/skill.js"
import {
  createEffectPatternRepository,
} from "../repositories/effect-pattern.js"
import {
  createApplicationPatternRepository,
} from "../repositories/application-pattern.js"
import type { NewSkill } from "../db/schema/index.js"
import {
  setupTestDatabase,
  cleanDatabase,
  getTestDatabaseUrl,
} from "./db-helpers.js"
import type { Database } from "../db/client.js"

const TEST_DB_URL = getTestDatabaseUrl()

describe("Skill Repository Integration Tests", () => {
  let db: Database
  let close: () => Promise<void>

  beforeAll(async () => {
    try {
      const setup = await setupTestDatabase(TEST_DB_URL)
      db = setup.db
      close = setup.close
    } catch (error) {
      console.log("Skipping skill repository tests - database not available:", error)
    }
  })

  afterAll(async () => {
    if (close) {
      await close()
    }
  })

  beforeEach(async () => {
    if (!db) return
    await cleanDatabase(db)
  })

  // ============================================
  // CRUD Operations
  // ============================================

  describe("CRUD Operations", () => {
    it("should create and retrieve a skill", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      const testSkill: NewSkill = {
        slug: "effect-patterns-concurrency",
        name: "effect-patterns-concurrency",
        description: "Concurrency patterns for Effect-TS",
        category: "concurrency",
        content: "# Concurrency\nSome content.",
        patternCount: 20,
      }

      const inserted = await repo.create(testSkill)
      expect(inserted.slug).toBe("effect-patterns-concurrency")
      expect(inserted.name).toBe("effect-patterns-concurrency")
      expect(inserted.description).toBe("Concurrency patterns for Effect-TS")
      expect(inserted.category).toBe("concurrency")
      expect(inserted.patternCount).toBe(20)
      expect(inserted.version).toBe(1)
      expect(inserted.validated).toBe(false)
      expect(inserted.id).toBeDefined()
      expect(inserted.createdAt).toBeInstanceOf(Date)
      expect(inserted.updatedAt).toBeInstanceOf(Date)
    })

    it("should find skill by ID", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      const inserted = await repo.create({
        slug: "effect-patterns-testing",
        name: "effect-patterns-testing",
        description: "Testing patterns",
      })

      const found = await repo.findById(inserted.id)
      expect(found).not.toBeNull()
      expect(found!.slug).toBe("effect-patterns-testing")
    })

    it("should return null for non-existent ID", async () => {
      if (!db) return

      const repo = createSkillRepository(db)
      const found = await repo.findById("550e8400-e29b-41d4-a716-446655440000")
      expect(found).toBeNull()
    })

    it("should find skill by slug", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      await repo.create({
        slug: "effect-patterns-streams",
        name: "effect-patterns-streams",
        description: "Stream patterns",
        category: "streams",
      })

      const found = await repo.findBySlug("effect-patterns-streams")
      expect(found).not.toBeNull()
      expect(found!.category).toBe("streams")
    })

    it("should return null for non-existent slug", async () => {
      if (!db) return

      const repo = createSkillRepository(db)
      const found = await repo.findBySlug("non-existent-skill")
      expect(found).toBeNull()
    })

    it("should find all skills ordered by name", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      await repo.create({
        slug: "effect-patterns-streams",
        name: "effect-patterns-streams",
        description: "Stream patterns",
      })
      await repo.create({
        slug: "effect-patterns-concurrency",
        name: "effect-patterns-concurrency",
        description: "Concurrency patterns",
      })

      const all = await repo.findAll()
      expect(all).toHaveLength(2)
      expect(all[0].slug).toBe("effect-patterns-concurrency")
      expect(all[1].slug).toBe("effect-patterns-streams")
    })

    it("should find all with limit", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      await repo.create({ slug: "skill-a", name: "skill-a", description: "A" })
      await repo.create({ slug: "skill-b", name: "skill-b", description: "B" })
      await repo.create({ slug: "skill-c", name: "skill-c", description: "C" })

      const limited = await repo.findAll(2)
      expect(limited).toHaveLength(2)
    })

    it("should update a skill", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      const inserted = await repo.create({
        slug: "effect-patterns-update-test",
        name: "effect-patterns-update-test",
        description: "Original description",
        patternCount: 5,
      })

      const updated = await repo.update(inserted.id, {
        description: "Updated description",
        patternCount: 10,
      })

      expect(updated).not.toBeNull()
      expect(updated!.description).toBe("Updated description")
      expect(updated!.patternCount).toBe(10)
      expect(updated!.slug).toBe("effect-patterns-update-test")
    })

    it("should return null when updating non-existent skill", async () => {
      if (!db) return

      const repo = createSkillRepository(db)
      const result = await repo.update("550e8400-e29b-41d4-a716-446655440000", {
        description: "new",
      })
      expect(result).toBeNull()
    })

    it("should delete a skill", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      const inserted = await repo.create({
        slug: "effect-patterns-delete-test",
        name: "effect-patterns-delete-test",
        description: "To be deleted",
      })

      const deleted = await repo.delete(inserted.id)
      expect(deleted).toBe(true)

      const found = await repo.findById(inserted.id)
      expect(found).toBeNull()
    })

    it("should return false when deleting non-existent skill", async () => {
      if (!db) return

      const repo = createSkillRepository(db)
      const result = await repo.delete("550e8400-e29b-41d4-a716-446655440000")
      expect(result).toBe(false)
    })
  })

  // ============================================
  // Upsert and Versioning
  // ============================================

  describe("Upsert and Versioning", () => {
    it("should create on first upsert", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      const result = await repo.upsert({
        slug: "effect-patterns-new-skill",
        name: "effect-patterns-new-skill",
        description: "Fresh skill",
        patternCount: 5,
      })

      expect(result.slug).toBe("effect-patterns-new-skill")
      expect(result.version).toBe(1)
      expect(result.patternCount).toBe(5)
    })

    it("should increment version on conflict upsert", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      // First insert
      const first = await repo.upsert({
        slug: "effect-patterns-versioned",
        name: "effect-patterns-versioned",
        description: "Version 1",
        patternCount: 5,
      })
      expect(first.version).toBe(1)

      // Second upsert — should increment version
      const second = await repo.upsert({
        slug: "effect-patterns-versioned",
        name: "effect-patterns-versioned",
        description: "Version 2",
        patternCount: 8,
      })

      expect(second.version).toBe(2)
      expect(second.description).toBe("Version 2")
      expect(second.patternCount).toBe(8)
    })

    it("should increment version on each subsequent upsert", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      await repo.upsert({
        slug: "effect-patterns-multi-version",
        name: "effect-patterns-multi-version",
        description: "v1",
      })

      await repo.upsert({
        slug: "effect-patterns-multi-version",
        name: "effect-patterns-multi-version",
        description: "v2",
      })

      const third = await repo.upsert({
        slug: "effect-patterns-multi-version",
        name: "effect-patterns-multi-version",
        description: "v3",
      })

      expect(third.version).toBe(3)
      expect(third.description).toBe("v3")
    })
  })

  // ============================================
  // Locking / Validation
  // ============================================

  describe("Locking and Validation", () => {
    it("should lock (validate) a skill", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      const inserted = await repo.create({
        slug: "effect-patterns-lockable",
        name: "effect-patterns-lockable",
        description: "To be locked",
      })

      expect(inserted.validated).toBe(false)
      expect(inserted.validatedAt).toBeNull()

      const locked = await repo.lock(inserted.id)
      expect(locked).not.toBeNull()
      expect(locked!.validated).toBe(true)
      expect(locked!.validatedAt).toBeInstanceOf(Date)
    })

    it("should unlock (unvalidate) a skill", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      const inserted = await repo.create({
        slug: "effect-patterns-unlockable",
        name: "effect-patterns-unlockable",
        description: "To be locked then unlocked",
      })

      await repo.lock(inserted.id)
      const unlocked = await repo.unlock(inserted.id)

      expect(unlocked).not.toBeNull()
      expect(unlocked!.validated).toBe(false)
      expect(unlocked!.validatedAt).toBeNull()
    })

    it("should report isLocked correctly", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      const inserted = await repo.create({
        slug: "effect-patterns-check-lock",
        name: "effect-patterns-check-lock",
        description: "Check lock status",
      })

      expect(await repo.isLocked(inserted.id)).toBe(false)

      await repo.lock(inserted.id)
      expect(await repo.isLocked(inserted.id)).toBe(true)

      await repo.unlock(inserted.id)
      expect(await repo.isLocked(inserted.id)).toBe(false)
    })

    it("should return false for isLocked on non-existent skill", async () => {
      if (!db) return

      const repo = createSkillRepository(db)
      expect(await repo.isLocked("550e8400-e29b-41d4-a716-446655440000")).toBe(false)
    })

    it("should throw SkillLockedError when updating a locked skill", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      const inserted = await repo.create({
        slug: "effect-patterns-immutable",
        name: "effect-patterns-immutable",
        description: "Cannot be changed",
      })

      await repo.lock(inserted.id)

      await expect(
        repo.update(inserted.id, { description: "Attempted change" })
      ).rejects.toThrow(SkillLockedError)
    })

    it("should throw SkillLockedError when deleting a locked skill", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      const inserted = await repo.create({
        slug: "effect-patterns-undeletable",
        name: "effect-patterns-undeletable",
        description: "Cannot be deleted",
      })

      await repo.lock(inserted.id)

      await expect(repo.delete(inserted.id)).rejects.toThrow(SkillLockedError)
    })

    it("should throw SkillLockedError when upserting a locked skill", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      const inserted = await repo.create({
        slug: "effect-patterns-locked-upsert",
        name: "effect-patterns-locked-upsert",
        description: "Locked",
      })

      await repo.lock(inserted.id)

      await expect(
        repo.upsert({
          slug: "effect-patterns-locked-upsert",
          name: "effect-patterns-locked-upsert",
          description: "Attempted upsert",
        })
      ).rejects.toThrow(SkillLockedError)
    })
  })

  // ============================================
  // Category and Application Pattern Queries
  // ============================================

  describe("Category and Application Pattern Queries", () => {
    it("should find skills by category", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      await repo.create({
        slug: "effect-patterns-concurrency",
        name: "effect-patterns-concurrency",
        description: "Concurrency",
        category: "concurrency",
      })
      await repo.create({
        slug: "effect-patterns-streams",
        name: "effect-patterns-streams",
        description: "Streams",
        category: "streams",
      })
      await repo.create({
        slug: "effect-patterns-concurrency-getting-started",
        name: "effect-patterns-concurrency-getting-started",
        description: "Concurrency Getting Started",
        category: "concurrency",
      })

      const concurrency = await repo.findByCategory("concurrency")
      expect(concurrency).toHaveLength(2)

      const streams = await repo.findByCategory("streams")
      expect(streams).toHaveLength(1)
      expect(streams[0].slug).toBe("effect-patterns-streams")
    })

    it("should return empty array for non-existent category", async () => {
      if (!db) return

      const repo = createSkillRepository(db)
      const results = await repo.findByCategory("non-existent")
      expect(results).toHaveLength(0)
    })

    it("should find skills by application pattern ID", async () => {
      if (!db) return

      const apRepo = createApplicationPatternRepository(db)
      const repo = createSkillRepository(db)

      const ap = await apRepo.create({
        slug: "concurrency",
        name: "Concurrency",
        description: "Concurrency patterns",
        learningOrder: 1,
      })

      await repo.create({
        slug: "effect-patterns-concurrency",
        name: "effect-patterns-concurrency",
        description: "Concurrency",
        applicationPatternId: ap.id,
      })
      await repo.create({
        slug: "effect-patterns-unlinked",
        name: "effect-patterns-unlinked",
        description: "No app pattern",
      })

      const linked = await repo.findByApplicationPattern(ap.id)
      expect(linked).toHaveLength(1)
      expect(linked[0].slug).toBe("effect-patterns-concurrency")
    })
  })

  // ============================================
  // Search
  // ============================================

  describe("Search", () => {
    it("should search by keyword in name", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      await repo.create({
        slug: "effect-patterns-concurrency",
        name: "effect-patterns-concurrency",
        description: "Concurrency patterns",
      })
      await repo.create({
        slug: "effect-patterns-streams",
        name: "effect-patterns-streams",
        description: "Stream patterns",
      })

      const results = await repo.search({ query: "concurrency" })
      expect(results).toHaveLength(1)
      expect(results[0].slug).toBe("effect-patterns-concurrency")
    })

    it("should search by keyword in description", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      await repo.create({
        slug: "effect-patterns-testing",
        name: "effect-patterns-testing",
        description: "Unit testing and integration testing patterns",
      })
      await repo.create({
        slug: "effect-patterns-streams",
        name: "effect-patterns-streams",
        description: "Stream processing patterns",
      })

      const results = await repo.search({ query: "integration" })
      expect(results).toHaveLength(1)
      expect(results[0].slug).toBe("effect-patterns-testing")
    })

    it("should search with category filter", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      await repo.create({
        slug: "skill-a",
        name: "skill-a",
        description: "A",
        category: "concurrency",
      })
      await repo.create({
        slug: "skill-b",
        name: "skill-b",
        description: "B",
        category: "streams",
      })

      const results = await repo.search({ category: "concurrency" })
      expect(results).toHaveLength(1)
      expect(results[0].slug).toBe("skill-a")
    })

    it("should search with validated filter", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      const skill = await repo.create({
        slug: "skill-validated",
        name: "skill-validated",
        description: "Validated",
      })
      await repo.lock(skill.id)

      await repo.create({
        slug: "skill-unvalidated",
        name: "skill-unvalidated",
        description: "Not validated",
      })

      const validated = await repo.search({ validated: true })
      expect(validated).toHaveLength(1)
      expect(validated[0].slug).toBe("skill-validated")

      const unvalidated = await repo.search({ validated: false })
      expect(unvalidated).toHaveLength(1)
      expect(unvalidated[0].slug).toBe("skill-unvalidated")
    })

    it("should support pagination", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      for (const letter of ["a", "b", "c", "d", "e"]) {
        await repo.create({
          slug: `skill-${letter}`,
          name: `skill-${letter}`,
          description: `Skill ${letter}`,
        })
      }

      const page1 = await repo.search({ limit: 2, offset: 0 })
      expect(page1).toHaveLength(2)

      const page2 = await repo.search({ limit: 2, offset: 2 })
      expect(page2).toHaveLength(2)

      const page3 = await repo.search({ limit: 2, offset: 4 })
      expect(page3).toHaveLength(1)
    })

    it("should support ordering by name desc", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      await repo.create({ slug: "skill-a", name: "skill-a", description: "A" })
      await repo.create({ slug: "skill-c", name: "skill-c", description: "C" })
      await repo.create({ slug: "skill-b", name: "skill-b", description: "B" })

      const results = await repo.search({
        orderBy: "name",
        orderDirection: "desc",
      })

      expect(results).toHaveLength(3)
      expect(results[0].slug).toBe("skill-c")
      expect(results[1].slug).toBe("skill-b")
      expect(results[2].slug).toBe("skill-a")
    })

    it("should return all skills with empty search params", async () => {
      if (!db) return

      const repo = createSkillRepository(db)

      await repo.create({ slug: "skill-1", name: "skill-1", description: "First" })
      await repo.create({ slug: "skill-2", name: "skill-2", description: "Second" })

      const results = await repo.search({})
      expect(results).toHaveLength(2)
    })
  })

  // ============================================
  // Pattern Linking
  // ============================================

  describe("Pattern Linking", () => {
    it("should link patterns to a skill and retrieve them", async () => {
      if (!db) return

      const skillRepo = createSkillRepository(db)
      const epRepo = createEffectPatternRepository(db)

      const skill = await skillRepo.create({
        slug: "effect-patterns-concurrency",
        name: "effect-patterns-concurrency",
        description: "Concurrency",
      })

      const patternA = await epRepo.create({
        slug: "pattern-a",
        title: "Pattern A",
        summary: "First pattern",
        skillLevel: "beginner",
      })
      const patternB = await epRepo.create({
        slug: "pattern-b",
        title: "Pattern B",
        summary: "Second pattern",
        skillLevel: "intermediate",
      })

      await skillRepo.setPatterns(skill.id, [patternA.id, patternB.id])

      const patterns = await skillRepo.getPatterns(skill.id)
      expect(patterns).toHaveLength(2)
      expect(patterns.map((p) => p.slug).sort()).toEqual(["pattern-a", "pattern-b"])

      // Verify patternCount was updated
      const refreshed = await skillRepo.findById(skill.id)
      expect(refreshed!.patternCount).toBe(2)
    })

    it("should replace existing pattern links", async () => {
      if (!db) return

      const skillRepo = createSkillRepository(db)
      const epRepo = createEffectPatternRepository(db)

      const skill = await skillRepo.create({
        slug: "effect-patterns-replace-test",
        name: "effect-patterns-replace-test",
        description: "Replace test",
      })

      const patternA = await epRepo.create({
        slug: "replace-a",
        title: "A",
        summary: "A",
        skillLevel: "beginner",
      })
      const patternB = await epRepo.create({
        slug: "replace-b",
        title: "B",
        summary: "B",
        skillLevel: "beginner",
      })
      const patternC = await epRepo.create({
        slug: "replace-c",
        title: "C",
        summary: "C",
        skillLevel: "beginner",
      })

      // Link A and B
      await skillRepo.setPatterns(skill.id, [patternA.id, patternB.id])
      expect(await skillRepo.getPatterns(skill.id)).toHaveLength(2)

      // Replace with B and C
      await skillRepo.setPatterns(skill.id, [patternB.id, patternC.id])
      const patterns = await skillRepo.getPatterns(skill.id)
      expect(patterns).toHaveLength(2)
      expect(patterns.map((p) => p.slug).sort()).toEqual(["replace-b", "replace-c"])
    })

    it("should clear all patterns when setting empty array", async () => {
      if (!db) return

      const skillRepo = createSkillRepository(db)
      const epRepo = createEffectPatternRepository(db)

      const skill = await skillRepo.create({
        slug: "effect-patterns-clear-test",
        name: "effect-patterns-clear-test",
        description: "Clear test",
      })

      const pattern = await epRepo.create({
        slug: "clear-pattern",
        title: "Clear",
        summary: "Clear",
        skillLevel: "beginner",
      })

      await skillRepo.setPatterns(skill.id, [pattern.id])
      expect(await skillRepo.getPatterns(skill.id)).toHaveLength(1)

      await skillRepo.setPatterns(skill.id, [])
      expect(await skillRepo.getPatterns(skill.id)).toHaveLength(0)

      const refreshed = await skillRepo.findById(skill.id)
      expect(refreshed!.patternCount).toBe(0)
    })

    it("should return empty array for skill with no patterns", async () => {
      if (!db) return

      const skillRepo = createSkillRepository(db)

      const skill = await skillRepo.create({
        slug: "effect-patterns-no-patterns",
        name: "effect-patterns-no-patterns",
        description: "No linked patterns",
      })

      const patterns = await skillRepo.getPatterns(skill.id)
      expect(patterns).toHaveLength(0)
    })

    it("should throw SkillNotFoundError when linking to non-existent skill", async () => {
      if (!db) return

      const skillRepo = createSkillRepository(db)

      await expect(
        skillRepo.setPatterns("550e8400-e29b-41d4-a716-446655440000", [])
      ).rejects.toThrow(SkillNotFoundError)
    })

    it("should throw SkillLockedError when linking to locked skill", async () => {
      if (!db) return

      const skillRepo = createSkillRepository(db)

      const skill = await skillRepo.create({
        slug: "effect-patterns-locked-link",
        name: "effect-patterns-locked-link",
        description: "Locked",
      })

      await skillRepo.lock(skill.id)

      await expect(
        skillRepo.setPatterns(skill.id, [])
      ).rejects.toThrow(SkillLockedError)
    })
  })
})
