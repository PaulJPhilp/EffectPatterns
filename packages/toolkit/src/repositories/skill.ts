/**
 * Skill Repository
 *
 * Repository functions for Skill CRUD, search, and pattern linking operations.
 */

import { eq, and, or, ilike, asc, desc, sql } from "drizzle-orm"
import {
  skills,
  skillPatterns,
  effectPatterns,
  type Skill,
  type NewSkill,
  type EffectPattern,
} from "../db/schema/index.js"
import type { Database } from "../db/client.js"

/**
 * Check if a skill is locked (validated)
 */
function isLocked(skill: Skill): boolean {
  return skill.validated === true
}

/**
 * Repository error types
 */
export class SkillNotFoundError extends Error {
  readonly _tag = "SkillNotFoundError"
  constructor(readonly identifier: string) {
    super(`Skill not found: ${identifier}`)
  }
}

export class SkillRepositoryError extends Error {
  readonly _tag = "SkillRepositoryError"
  constructor(
    readonly operation: string,
    readonly cause: unknown
  ) {
    super(`Skill repository error during ${operation}: ${String(cause)}`)
  }
}

export class SkillLockedError extends Error {
  readonly _tag = "SkillLockedError"
  constructor(readonly identifier: string) {
    super(`Skill is locked (validated) and cannot be modified: ${identifier}`)
  }
}

/**
 * Search parameters for skills
 */
export interface SearchSkillsParams {
  readonly query?: string
  readonly category?: string
  readonly applicationPatternId?: string
  readonly validated?: boolean
  readonly limit?: number
  readonly offset?: number
  readonly orderBy?: "name" | "createdAt" | "version"
  readonly orderDirection?: "asc" | "desc"
}

/**
 * Create skill repository functions
 */
export function createSkillRepository(db: Database) {
  return {
    /**
     * Find all skills
     */
    async findAll(limit?: number): Promise<Skill[]> {
      let query = db.select().from(skills).orderBy(asc(skills.name))
      if (limit) {
        query = query.limit(limit) as typeof query
      }
      return query
    },

    /**
     * Find skill by ID
     */
    async findById(id: string): Promise<Skill | null> {
      const results = await db
        .select()
        .from(skills)
        .where(eq(skills.id, id))
        .limit(1)

      return results[0] ?? null
    },

    /**
     * Find skill by slug
     */
    async findBySlug(slug: string): Promise<Skill | null> {
      const results = await db
        .select()
        .from(skills)
        .where(eq(skills.slug, slug))
        .limit(1)

      return results[0] ?? null
    },

    /**
     * Find skills by category
     */
    async findByCategory(category: string): Promise<Skill[]> {
      return db
        .select()
        .from(skills)
        .where(eq(skills.category, category))
        .orderBy(asc(skills.name))
    },

    /**
     * Find skills by application pattern ID
     */
    async findByApplicationPattern(applicationPatternId: string): Promise<Skill[]> {
      return db
        .select()
        .from(skills)
        .where(eq(skills.applicationPatternId, applicationPatternId))
        .orderBy(asc(skills.name))
    },

    /**
     * Search skills with filters
     */
    async search(params: SearchSkillsParams): Promise<Skill[]> {
      const conditions = []

      // Keyword search across name and description
      if (params.query) {
        const keywords = params.query
          .toLowerCase()
          .split(/\W+/)
          .filter((keyword) => keyword.length > 2)

        for (const keyword of keywords) {
          const searchTerm = `%${keyword}%`
          conditions.push(
            or(
              ilike(skills.name, searchTerm),
              ilike(skills.description, searchTerm)
            )
          )
        }
      }

      // Category filter
      if (params.category) {
        conditions.push(ilike(skills.category, `%${params.category}%`))
      }

      // Application pattern filter
      if (params.applicationPatternId) {
        conditions.push(eq(skills.applicationPatternId, params.applicationPatternId))
      }

      // Validated filter
      if (params.validated !== undefined) {
        conditions.push(eq(skills.validated, params.validated))
      }

      // Build query
      let query = db.select().from(skills)

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query
      }

      // Order by
      const orderColumn =
        params.orderBy === "createdAt"
          ? skills.createdAt
          : params.orderBy === "version"
            ? skills.version
            : skills.name

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
     * Create a new skill
     */
    async create(data: NewSkill): Promise<Skill> {
      const results = await db.insert(skills).values(data).returning()
      return results[0]
    },

    /**
     * Update a skill
     * Throws SkillLockedError if the skill is validated/locked
     */
    async update(id: string, data: Partial<NewSkill>): Promise<Skill | null> {
      const existing = await this.findById(id)
      if (!existing) {
        return null
      }
      if (isLocked(existing)) {
        throw new SkillLockedError(id)
      }

      const results = await db
        .update(skills)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(skills.id, id))
        .returning()

      return results[0] ?? null
    },

    /**
     * Delete a skill
     * Throws SkillLockedError if the skill is validated/locked
     */
    async delete(id: string): Promise<boolean> {
      const existing = await this.findById(id)
      if (!existing) {
        return false
      }
      if (isLocked(existing)) {
        throw new SkillLockedError(id)
      }

      const results = await db
        .delete(skills)
        .where(eq(skills.id, id))
        .returning({ id: skills.id })

      return results.length > 0
    },

    /**
     * Upsert a skill by slug
     * Throws SkillLockedError if the skill is validated/locked
     */
    async upsert(data: NewSkill): Promise<Skill> {
      if (data.slug) {
        const existing = await this.findBySlug(data.slug)
        if (existing && isLocked(existing)) {
          throw new SkillLockedError(data.slug)
        }
      }

      const results = await db
        .insert(skills)
        .values(data)
        .onConflictDoUpdate({
          target: skills.slug,
          set: {
            name: data.name,
            description: data.description,
            category: data.category,
            content: data.content,
            version: sql`${skills.version} + 1`,
            patternCount: data.patternCount,
            applicationPatternId: data.applicationPatternId,
            updatedAt: new Date(),
          },
        })
        .returning()
      return results[0]
    },

    /**
     * Lock (validate) a skill
     */
    async lock(id: string): Promise<Skill | null> {
      const results = await db
        .update(skills)
        .set({
          validated: true,
          validatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(skills.id, id))
        .returning()

      return results[0] ?? null
    },

    /**
     * Unlock (unvalidate) a skill
     */
    async unlock(id: string): Promise<Skill | null> {
      const results = await db
        .update(skills)
        .set({
          validated: false,
          validatedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(skills.id, id))
        .returning()

      return results[0] ?? null
    },

    /**
     * Check if a skill is locked
     */
    async isLocked(id: string): Promise<boolean> {
      const skill = await this.findById(id)
      return skill ? isLocked(skill) : false
    },

    /**
     * Get patterns associated with a skill
     */
    async getPatterns(skillId: string): Promise<EffectPattern[]> {
      const rows = await db
        .select({ pattern: effectPatterns })
        .from(skillPatterns)
        .innerJoin(effectPatterns, eq(skillPatterns.patternId, effectPatterns.id))
        .where(eq(skillPatterns.skillId, skillId))
        .orderBy(asc(effectPatterns.title))

      return rows.map((r) => r.pattern)
    },

    /**
     * Set patterns for a skill (replace all existing links)
     * Throws SkillLockedError if the skill is validated/locked
     */
    async setPatterns(skillId: string, patternIds: string[]): Promise<void> {
      const existing = await this.findById(skillId)
      if (!existing) {
        throw new SkillNotFoundError(skillId)
      }
      if (isLocked(existing)) {
        throw new SkillLockedError(skillId)
      }

      // Delete existing links
      await db
        .delete(skillPatterns)
        .where(eq(skillPatterns.skillId, skillId))

      // Insert new links
      if (patternIds.length > 0) {
        await db.insert(skillPatterns).values(
          patternIds.map((patternId) => ({
            skillId,
            patternId,
          }))
        )
      }

      // Update pattern count
      await db
        .update(skills)
        .set({ patternCount: patternIds.length, updatedAt: new Date() })
        .where(eq(skills.id, skillId))
    },
  }
}

export type SkillRepository = ReturnType<typeof createSkillRepository>
