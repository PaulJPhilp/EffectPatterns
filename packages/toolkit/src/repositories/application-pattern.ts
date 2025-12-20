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
     */
    async update(
      id: string,
      data: Partial<NewApplicationPattern>
    ): Promise<ApplicationPattern | null> {
      const results = await db
        .update(applicationPatterns)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(applicationPatterns.id, id))
        .returning()

      return results[0] ?? null
    },

    /**
     * Delete an application pattern
     */
    async delete(id: string): Promise<boolean> {
      const results = await db
        .delete(applicationPatterns)
        .where(eq(applicationPatterns.id, id))
        .returning({ id: applicationPatterns.id })

      return results.length > 0
    },

    /**
     * Upsert an application pattern by slug
     */
    async upsert(data: NewApplicationPattern): Promise<ApplicationPattern> {
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
  }
}

export type ApplicationPatternRepository = ReturnType<
  typeof createApplicationPatternRepository
>
