/**
 * Application Pattern Repository
 *
 * Repository functions for ApplicationPattern CRUD operations.
 */

import { eq, asc } from "drizzle-orm"
import {
  applicationPatterns,
  type ApplicationPattern,
  type NewApplicationPattern,
} from "../db/schema/index.js"
import type { Database } from "../db/client.js"

/**
 * Check if an application pattern is locked (validated)
 */
function isLocked(pattern: ApplicationPattern): boolean {
  return pattern.validated === true
}

/**
 * Repository error types
 */
export class ApplicationPatternNotFoundError extends Error {
  readonly _tag = "ApplicationPatternNotFoundError"
  constructor(readonly identifier: string) {
    super(`Application pattern not found: ${identifier}`)
  }
}

export class ApplicationPatternRepositoryError extends Error {
  readonly _tag = "ApplicationPatternRepositoryError"
  constructor(
    readonly operation: string,
    readonly cause: unknown
  ) {
    super(
      `Application pattern repository error during ${operation}: ${String(cause)}`
    )
  }
}

export class ApplicationPatternLockedError extends Error {
  readonly _tag = "ApplicationPatternLockedError"
  constructor(readonly identifier: string) {
    super(`Application pattern is locked (validated) and cannot be modified: ${identifier}`)
  }
}

/**
 * Create application pattern repository functions
 */
export function createApplicationPatternRepository(db: Database) {
  return {
    /**
     * Find all application patterns ordered by learning order
     */
    async findAll(): Promise<ApplicationPattern[]> {
      return db
        .select()
        .from(applicationPatterns)
        .orderBy(asc(applicationPatterns.learningOrder))
    },

    /**
     * Find application pattern by ID
     */
    async findById(id: string): Promise<ApplicationPattern | null> {
      const results = await db
        .select()
        .from(applicationPatterns)
        .where(eq(applicationPatterns.id, id))
        .limit(1)

      return results[0] ?? null
    },

    /**
     * Find application pattern by slug
     */
    async findBySlug(slug: string): Promise<ApplicationPattern | null> {
      const results = await db
        .select()
        .from(applicationPatterns)
        .where(eq(applicationPatterns.slug, slug))
        .limit(1)

      return results[0] ?? null
    },

    /**
     * Create a new application pattern
     */
    async create(data: NewApplicationPattern): Promise<ApplicationPattern> {
      const results = await db
        .insert(applicationPatterns)
        .values(data)
        .returning()
      return results[0]
    },

    /**
     * Update an application pattern
     * Throws ApplicationPatternLockedError if the pattern is validated/locked
     */
    async update(
      id: string,
      data: Partial<NewApplicationPattern>
    ): Promise<ApplicationPattern | null> {
      // Check if pattern exists and is locked
      const existing = await this.findById(id)
      if (!existing) {
        return null
      }
      if (isLocked(existing)) {
        throw new ApplicationPatternLockedError(id)
      }

      const results = await db
        .update(applicationPatterns)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(applicationPatterns.id, id))
        .returning()

      return results[0] ?? null
    },

    /**
     * Delete an application pattern
     * Throws ApplicationPatternLockedError if the pattern is validated/locked
     */
    async delete(id: string): Promise<boolean> {
      // Check if pattern exists and is locked
      const existing = await this.findById(id)
      if (!existing) {
        return false
      }
      if (isLocked(existing)) {
        throw new ApplicationPatternLockedError(id)
      }

      const results = await db
        .delete(applicationPatterns)
        .where(eq(applicationPatterns.id, id))
        .returning({ id: applicationPatterns.id })

      return results.length > 0
    },

    /**
     * Upsert an application pattern by slug
     * Throws ApplicationPatternLockedError if the pattern is validated/locked
     */
    async upsert(data: NewApplicationPattern): Promise<ApplicationPattern> {
      // Check if pattern exists and is locked
      if (data.slug) {
        const existing = await this.findBySlug(data.slug)
        if (existing && isLocked(existing)) {
          throw new ApplicationPatternLockedError(data.slug)
        }
      }

      const results = await db
        .insert(applicationPatterns)
        .values(data)
        .onConflictDoUpdate({
          target: applicationPatterns.slug,
          set: {
            name: data.name,
            description: data.description,
            learningOrder: data.learningOrder,
            effectModule: data.effectModule,
            subPatterns: data.subPatterns,
            updatedAt: new Date(),
          },
        })
        .returning()
      return results[0]
    },

    /**
     * Lock (validate) an application pattern
     * Sets validated to true and validatedAt to current timestamp
     */
    async lock(id: string): Promise<ApplicationPattern | null> {
      const results = await db
        .update(applicationPatterns)
        .set({
          validated: true,
          validatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(applicationPatterns.id, id))
        .returning()

      return results[0] ?? null
    },

    /**
     * Unlock (unvalidate) an application pattern
     * Sets validated to false and clears validatedAt
     */
    async unlock(id: string): Promise<ApplicationPattern | null> {
      const results = await db
        .update(applicationPatterns)
        .set({
          validated: false,
          validatedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(applicationPatterns.id, id))
        .returning()

      return results[0] ?? null
    },

    /**
     * Check if a pattern is locked
     */
    async isLocked(id: string): Promise<boolean> {
      const pattern = await this.findById(id)
      return pattern ? isLocked(pattern) : false
    },
  }
}

export type ApplicationPatternRepository = ReturnType<
  typeof createApplicationPatternRepository
>
