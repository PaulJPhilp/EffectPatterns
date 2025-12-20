/**
 * Effect Pattern Repository
 *
 * Repository functions for EffectPattern CRUD and search operations.
 */

import { eq, and, or, ilike, inArray, asc, desc, sql } from "drizzle-orm"
import {
  effectPatterns,
  patternRelations,
  type EffectPattern,
  type NewEffectPattern,
  type SkillLevel,
} from "../db/schema/index.js"
import type { Database } from "../db/client.js"

/**
 * Check if an effect pattern is locked (validated)
 */
function isLocked(pattern: EffectPattern): boolean {
  return pattern.validated === true
}

/**
 * Repository error types
 */
export class EffectPatternNotFoundError extends Error {
  readonly _tag = "EffectPatternNotFoundError"
  constructor(readonly identifier: string) {
    super(`Effect pattern not found: ${identifier}`)
  }
}

export class EffectPatternRepositoryError extends Error {
  readonly _tag = "EffectPatternRepositoryError"
  constructor(
    readonly operation: string,
    readonly cause: unknown
  ) {
    super(`Effect pattern repository error during ${operation}: ${String(cause)}`)
  }
}

export class EffectPatternLockedError extends Error {
  readonly _tag = "EffectPatternLockedError"
  constructor(readonly identifier: string) {
    super(`Effect pattern is locked (validated) and cannot be modified: ${identifier}`)
  }
}

/**
 * Search parameters for patterns
 */
export interface SearchPatternsParams {
  query?: string
  category?: string
  skillLevel?: SkillLevel
  tags?: string[]
  applicationPatternId?: string
  limit?: number
  offset?: number
  orderBy?: "title" | "createdAt" | "lessonOrder"
  orderDirection?: "asc" | "desc"
}

/**
 * Create effect pattern repository functions
 */
export function createEffectPatternRepository(db: Database) {
  return {
    /**
     * Find all effect patterns
     */
    async findAll(limit?: number): Promise<EffectPattern[]> {
      let query = db.select().from(effectPatterns).orderBy(asc(effectPatterns.title))
      if (limit) {
        query = query.limit(limit) as typeof query
      }
      return query
    },

    /**
     * Find effect pattern by ID
     */
    async findById(id: string): Promise<EffectPattern | null> {
      const results = await db
        .select()
        .from(effectPatterns)
        .where(eq(effectPatterns.id, id))
        .limit(1)

      return results[0] ?? null
    },

    /**
     * Find effect pattern by slug
     */
    async findBySlug(slug: string): Promise<EffectPattern | null> {
      const results = await db
        .select()
        .from(effectPatterns)
        .where(eq(effectPatterns.slug, slug))
        .limit(1)

      return results[0] ?? null
    },

    /**
     * Search patterns with filters
     */
    async search(params: SearchPatternsParams): Promise<EffectPattern[]> {
      const conditions = []

      // Text search across title, summary, and tags
      if (params.query) {
        const searchTerm = `%${params.query}%`
        conditions.push(
          or(
            ilike(effectPatterns.title, searchTerm),
            ilike(effectPatterns.summary, searchTerm),
            sql`${effectPatterns.tags}::text ILIKE ${searchTerm}`
          )
        )
      }

      // Category filter
      if (params.category) {
        conditions.push(ilike(effectPatterns.category, params.category))
      }

      // Skill level filter
      if (params.skillLevel) {
        conditions.push(eq(effectPatterns.skillLevel, params.skillLevel))
      }

      // Application pattern filter
      if (params.applicationPatternId) {
        conditions.push(
          eq(effectPatterns.applicationPatternId, params.applicationPatternId)
        )
      }

      // Build query
      let query = db.select().from(effectPatterns)

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query
      }

      // Order by
      const orderColumn =
        params.orderBy === "createdAt"
          ? effectPatterns.createdAt
          : params.orderBy === "lessonOrder"
            ? effectPatterns.lessonOrder
            : effectPatterns.title

      const orderFn = params.orderDirection === "desc" ? desc : asc
      query = query.orderBy(orderFn(orderColumn)) as typeof query

      // Pagination
      if (params.limit) {
        query = query.limit(params.limit) as typeof query
      }
      if (params.offset) {
        query = query.offset(params.offset) as typeof query
      }

      return query
    },

    /**
     * Find patterns by application pattern ID
     */
    async findByApplicationPattern(
      applicationPatternId: string
    ): Promise<EffectPattern[]> {
      return db
        .select()
        .from(effectPatterns)
        .where(eq(effectPatterns.applicationPatternId, applicationPatternId))
        .orderBy(asc(effectPatterns.lessonOrder), asc(effectPatterns.title))
    },

    /**
     * Find patterns by skill level
     */
    async findBySkillLevel(skillLevel: SkillLevel): Promise<EffectPattern[]> {
      return db
        .select()
        .from(effectPatterns)
        .where(eq(effectPatterns.skillLevel, skillLevel))
        .orderBy(asc(effectPatterns.title))
    },

    /**
     * Create a new effect pattern
     */
    async create(data: NewEffectPattern): Promise<EffectPattern> {
      const results = await db.insert(effectPatterns).values(data).returning()
      return results[0]
    },

    /**
     * Update an effect pattern
     * Throws EffectPatternLockedError if the pattern is validated/locked
     */
    async update(
      id: string,
      data: Partial<NewEffectPattern>
    ): Promise<EffectPattern | null> {
      // Check if pattern exists and is locked
      const existing = await this.findById(id)
      if (!existing) {
        return null
      }
      if (isLocked(existing)) {
        throw new EffectPatternLockedError(id)
      }

      const results = await db
        .update(effectPatterns)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(effectPatterns.id, id))
        .returning()

      return results[0] ?? null
    },

    /**
     * Delete an effect pattern
     * Throws EffectPatternLockedError if the pattern is validated/locked
     */
    async delete(id: string): Promise<boolean> {
      // Check if pattern exists and is locked
      const existing = await this.findById(id)
      if (!existing) {
        return false
      }
      if (isLocked(existing)) {
        throw new EffectPatternLockedError(id)
      }

      const results = await db
        .delete(effectPatterns)
        .where(eq(effectPatterns.id, id))
        .returning({ id: effectPatterns.id })

      return results.length > 0
    },

    /**
     * Upsert an effect pattern by slug
     * Throws EffectPatternLockedError if the pattern is validated/locked
     */
    async upsert(data: NewEffectPattern): Promise<EffectPattern> {
      // Check if pattern exists and is locked
      if (data.slug) {
        const existing = await this.findBySlug(data.slug)
        if (existing && isLocked(existing)) {
          throw new EffectPatternLockedError(data.slug)
        }
      }

      const results = await db
        .insert(effectPatterns)
        .values(data)
        .onConflictDoUpdate({
          target: effectPatterns.slug,
          set: {
            title: data.title,
            summary: data.summary,
            skillLevel: data.skillLevel,
            category: data.category,
            difficulty: data.difficulty,
            tags: data.tags,
            examples: data.examples,
            useCases: data.useCases,
            rule: data.rule,
            content: data.content,
            author: data.author,
            lessonOrder: data.lessonOrder,
            applicationPatternId: data.applicationPatternId,
            updatedAt: new Date(),
          },
        })
        .returning()
      return results[0]
    },

    /**
     * Get related patterns for a pattern
     */
    async getRelatedPatterns(patternId: string): Promise<EffectPattern[]> {
      const relations = await db
        .select({ relatedPatternId: patternRelations.relatedPatternId })
        .from(patternRelations)
        .where(eq(patternRelations.patternId, patternId))

      if (relations.length === 0) {
        return []
      }

      const relatedIds = relations.map((r) => r.relatedPatternId)
      return db
        .select()
        .from(effectPatterns)
        .where(inArray(effectPatterns.id, relatedIds))
    },

    /**
     * Set related patterns for a pattern
     * Throws EffectPatternLockedError if the pattern is validated/locked
     */
    async setRelatedPatterns(
      patternId: string,
      relatedPatternIds: string[]
    ): Promise<void> {
      // Check if pattern is locked
      const existing = await this.findById(patternId)
      if (!existing) {
        throw new EffectPatternNotFoundError(patternId)
      }
      if (isLocked(existing)) {
        throw new EffectPatternLockedError(patternId)
      }

      // Delete existing relations
      await db
        .delete(patternRelations)
        .where(eq(patternRelations.patternId, patternId))

      // Insert new relations
      if (relatedPatternIds.length > 0) {
        await db.insert(patternRelations).values(
          relatedPatternIds.map((relatedPatternId) => ({
            patternId,
            relatedPatternId,
          }))
        )
      }
    },

    /**
     * Count patterns by skill level
     */
    async countBySkillLevel(): Promise<Record<SkillLevel, number>> {
      const results = await db
        .select({
          skillLevel: effectPatterns.skillLevel,
          count: sql<number>`count(*)::int`,
        })
        .from(effectPatterns)
        .groupBy(effectPatterns.skillLevel)

      return results.reduce(
        (acc, row) => ({
          ...acc,
          [row.skillLevel]: row.count,
        }),
        { beginner: 0, intermediate: 0, advanced: 0 } as Record<SkillLevel, number>
      )
    },

    /**
     * Lock (validate) an effect pattern
     * Sets validated to true and validatedAt to current timestamp
     */
    async lock(id: string): Promise<EffectPattern | null> {
      const results = await db
        .update(effectPatterns)
        .set({
          validated: true,
          validatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(effectPatterns.id, id))
        .returning()

      return results[0] ?? null
    },

    /**
     * Unlock (unvalidate) an effect pattern
     * Sets validated to false and clears validatedAt
     */
    async unlock(id: string): Promise<EffectPattern | null> {
      const results = await db
        .update(effectPatterns)
        .set({
          validated: false,
          validatedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(effectPatterns.id, id))
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

export type EffectPatternRepository = ReturnType<typeof createEffectPatternRepository>
