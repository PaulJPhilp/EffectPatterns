/**
 * Repository Integration Tests
 *
 * These tests require a running PostgreSQL database.
 * Run with: bun test packages/toolkit/src/__tests__/repositories.test.ts
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
  createApplicationPatternRepository,
  createEffectPatternRepository,
} from "../repositories/index.js"
import type {
  NewApplicationPattern,
  NewEffectPattern,
} from "../db/schema/index.js"
import {
  setupTestDatabase,
  cleanDatabase,
  getTestDatabaseUrl,
} from "./db-helpers.js"
import type { Database } from "../db/client.js"

// Skip tests if no database available
const TEST_DB_URL = getTestDatabaseUrl()

describe("Repository Integration Tests", () => {
  let db: Database
  let close: () => Promise<void>

  beforeAll(async () => {
    try {
      const connection = setupTestDatabase(TEST_DB_URL)
      const setup = await connection
      db = setup.db
      close = setup.close
    } catch (error) {
      console.log("Skipping tests - database not available:", error)
    }
  })

  afterAll(async () => {
    if (close) {
      await close()
    }
  })

  beforeEach(async () => {
    if (!db) return

    // Clean up test data before each test
    await cleanDatabase(db)
  })

  describe("ApplicationPatterns Repository", () => {
    it("should create and retrieve an application pattern", async () => {
      if (!db) return

      const repo = createApplicationPatternRepository(db)

      const testPattern: NewApplicationPattern = {
        slug: "test-concurrency",
        name: "Concurrency",
        description: "Test concurrency patterns",
        learningOrder: 1,
        effectModule: "Effect",
        subPatterns: ["getting-started"],
      }

      // Create
      const inserted = await repo.create(testPattern)
      expect(inserted.slug).toBe("test-concurrency")
      expect(inserted.name).toBe("Concurrency")
      expect(inserted.id).toBeDefined()

      // Retrieve by slug
      const retrieved = await repo.findBySlug("test-concurrency")
      expect(retrieved).toBeDefined()
      expect(retrieved?.description).toBe("Test concurrency patterns")
      expect(retrieved?.subPatterns).toEqual(["getting-started"])
    })

    it("should update an application pattern", async () => {
      if (!db) return

      const repo = createApplicationPatternRepository(db)

      const inserted = await repo.create({
        slug: "test-update",
        name: "Original Name",
        description: "Original",
        learningOrder: 1,
      })

      const updated = await repo.update(inserted.id, { name: "Updated Name" })
      expect(updated?.name).toBe("Updated Name")
      expect(updated?.slug).toBe("test-update")
    })

    it("should find all patterns ordered by learning order", async () => {
      if (!db) return

      const repo = createApplicationPatternRepository(db)

      await repo.create({
        slug: "pattern-2",
        name: "Second",
        description: "Second pattern",
        learningOrder: 2,
      })
      await repo.create({
        slug: "pattern-1",
        name: "First",
        description: "First pattern",
        learningOrder: 1,
      })

      const all = await repo.findAll()
      expect(all).toHaveLength(2)
      expect(all[0].slug).toBe("pattern-1")
      expect(all[1].slug).toBe("pattern-2")
    })
  })

  describe("EffectPatterns Repository", () => {
    it("should create and retrieve an effect pattern", async () => {
      if (!db) return

      const repo = createEffectPatternRepository(db)

      const testPattern: NewEffectPattern = {
        slug: "test-hello-world",
        title: "Hello World",
        summary: "A simple hello world pattern",
        skillLevel: "beginner",
        category: "core-concepts",
        tags: ["hello", "getting-started"],
        examples: [{ language: "typescript", code: "console.log('hello')" }],
      }

      const inserted = await repo.create(testPattern)
      expect(inserted.slug).toBe("test-hello-world")
      expect(inserted.skillLevel).toBe("beginner")
      expect(inserted.tags).toEqual(["hello", "getting-started"])
    })

    it("should search patterns by query", async () => {
      if (!db) return

      const repo = createEffectPatternRepository(db)

      await repo.create({
        slug: "error-retry",
        title: "Error Retry Pattern",
        summary: "Retry on error",
        skillLevel: "intermediate",
        tags: ["error", "retry"],
      })
      await repo.create({
        slug: "stream-hello",
        title: "Stream Hello World",
        summary: "Stream basics",
        skillLevel: "beginner",
        tags: ["stream"],
      })

      // Search by skill level
      const results = await repo.search({ skillLevel: "intermediate" })
      expect(results).toHaveLength(1)
      expect(results[0].slug).toBe("error-retry")
    })

    it("should search patterns by text query", async () => {
      if (!db) return

      const repo = createEffectPatternRepository(db)

      await repo.create({
        slug: "retry-pattern",
        title: "Retry with Backoff",
        summary: "Exponential backoff retry strategy",
        skillLevel: "intermediate",
      })
      await repo.create({
        slug: "cache-pattern",
        title: "Cache Pattern",
        summary: "Caching strategy",
        skillLevel: "intermediate",
      })

      const results = await repo.search({ query: "retry" })
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results.some((p) => p.slug === "retry-pattern")).toBe(true)
    })

    it("should count patterns by skill level", async () => {
      if (!db) return

      const repo = createEffectPatternRepository(db)

      await repo.create({
        slug: "beginner-1",
        title: "Beginner 1",
        summary: "First",
        skillLevel: "beginner",
      })
      await repo.create({
        slug: "beginner-2",
        title: "Beginner 2",
        summary: "Second",
        skillLevel: "beginner",
      })
      await repo.create({
        slug: "advanced-1",
        title: "Advanced 1",
        summary: "Third",
        skillLevel: "advanced",
      })

      const counts = await repo.countBySkillLevel()
      expect(counts.beginner).toBe(2)
      expect(counts.advanced).toBe(1)
      expect(counts.intermediate).toBe(0)
    })
  })

  describe("Pattern Relations", () => {
    it("should create and retrieve related patterns", async () => {
      if (!db) return

      const repo = createEffectPatternRepository(db)

      // Create two patterns
      const patternA = await repo.create({
        slug: "pattern-a",
        title: "Pattern A",
        summary: "First pattern",
        skillLevel: "beginner",
      })
      const patternB = await repo.create({
        slug: "pattern-b",
        title: "Pattern B",
        summary: "Second pattern",
        skillLevel: "intermediate",
      })

      // Create relation
      await repo.setRelatedPatterns(patternA.id, [patternB.id])

      // Query relations
      const related = await repo.getRelatedPatterns(patternA.id)
      expect(related).toHaveLength(1)
      expect(related[0].slug).toBe("pattern-b")
    })
  })
})
