/**
 * Effect Pattern Repository
 *
 * Repository functions for EffectPattern CRUD and search operations.
 */
import { eq, and, or, ilike, inArray, asc, desc, sql } from "drizzle-orm";
import { effectPatterns, patternRelations, } from "../db/schema/index.js";
/**
 * Check if an effect pattern is locked (validated)
 */
function isLocked(pattern) {
    return pattern.validated === true;
}
/**
 * Repository error types
 */
export class EffectPatternNotFoundError extends Error {
    constructor(identifier) {
        super(`Effect pattern not found: ${identifier}`);
        this.identifier = identifier;
        this._tag = "EffectPatternNotFoundError";
    }
}
export class EffectPatternRepositoryError extends Error {
    constructor(operation, cause) {
        super(`Effect pattern repository error during ${operation}: ${String(cause)}`);
        this.operation = operation;
        this.cause = cause;
        this._tag = "EffectPatternRepositoryError";
    }
}
export class EffectPatternLockedError extends Error {
    constructor(identifier) {
        super(`Effect pattern is locked (validated) and cannot be modified: ${identifier}`);
        this.identifier = identifier;
        this._tag = "EffectPatternLockedError";
    }
}
/**
 * Create effect pattern repository functions
 */
export function createEffectPatternRepository(db) {
    return {
        /**
         * Find all effect patterns
         */
        async findAll(limit) {
            let query = db.select().from(effectPatterns).orderBy(asc(effectPatterns.title));
            if (limit) {
                query = query.limit(limit);
            }
            return query;
        },
        /**
         * Find effect pattern by ID
         */
        async findById(id) {
            const results = await db
                .select()
                .from(effectPatterns)
                .where(eq(effectPatterns.id, id))
                .limit(1);
            return results[0] ?? null;
        },
        /**
         * Find effect pattern by slug
         */
        async findBySlug(slug) {
            const results = await db
                .select()
                .from(effectPatterns)
                .where(eq(effectPatterns.slug, slug))
                .limit(1);
            return results[0] ?? null;
        },
        /**
         * Search patterns with filters
         */
        async search(params) {
            const conditions = [];
            // Text search across title, summary, and tags
            if (params.query) {
                const searchTerm = `%${params.query}%`;
                // For JSONB tags column, we need to cast to text and use sql template
                // Drizzle's ilike doesn't work directly with JSONB, so we use sql with direct interpolation
                // Drizzle automatically parameterizes values interpolated into sql templates
                // Using PostgreSQL's ::text cast syntax which is more idiomatic
                const tagsCondition = sql `${effectPatterns.tags}::text ILIKE ${searchTerm}`;
                conditions.push(or(ilike(effectPatterns.title, searchTerm), ilike(effectPatterns.summary, searchTerm), tagsCondition));
            }
            // Category filter
            if (params.category) {
                conditions.push(ilike(effectPatterns.category, params.category));
            }
            // Skill level filter
            if (params.skillLevel) {
                conditions.push(eq(effectPatterns.skillLevel, params.skillLevel));
            }
            // Application pattern filter
            if (params.applicationPatternId) {
                conditions.push(eq(effectPatterns.applicationPatternId, params.applicationPatternId));
            }
            // Build query
            let query = db.select().from(effectPatterns);
            if (conditions.length > 0) {
                query = query.where(and(...conditions));
            }
            // Order by
            const orderColumn = params.orderBy === "createdAt"
                ? effectPatterns.createdAt
                : params.orderBy === "lessonOrder"
                    ? effectPatterns.lessonOrder
                    : effectPatterns.title;
            const orderFn = params.orderDirection === "desc" ? desc : asc;
            query = query.orderBy(orderFn(orderColumn));
            // Pagination
            if (params.limit) {
                query = query.limit(params.limit);
            }
            if (params.offset) {
                query = query.offset(params.offset);
            }
            return query;
        },
        /**
         * Find patterns by application pattern ID
         */
        async findByApplicationPattern(applicationPatternId) {
            return db
                .select()
                .from(effectPatterns)
                .where(eq(effectPatterns.applicationPatternId, applicationPatternId))
                .orderBy(asc(effectPatterns.lessonOrder), asc(effectPatterns.title));
        },
        /**
         * Find patterns by skill level
         */
        async findBySkillLevel(skillLevel) {
            return db
                .select()
                .from(effectPatterns)
                .where(eq(effectPatterns.skillLevel, skillLevel))
                .orderBy(asc(effectPatterns.title));
        },
        /**
         * Create a new effect pattern
         */
        async create(data) {
            const results = await db.insert(effectPatterns).values(data).returning();
            return results[0];
        },
        /**
         * Update an effect pattern
         * Throws EffectPatternLockedError if the pattern is validated/locked
         */
        async update(id, data) {
            // Check if pattern exists and is locked
            const existing = await this.findById(id);
            if (!existing) {
                return null;
            }
            if (isLocked(existing)) {
                throw new EffectPatternLockedError(id);
            }
            const results = await db
                .update(effectPatterns)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(effectPatterns.id, id))
                .returning();
            return results[0] ?? null;
        },
        /**
         * Delete an effect pattern
         * Throws EffectPatternLockedError if the pattern is validated/locked
         */
        async delete(id) {
            // Check if pattern exists and is locked
            const existing = await this.findById(id);
            if (!existing) {
                return false;
            }
            if (isLocked(existing)) {
                throw new EffectPatternLockedError(id);
            }
            const results = await db
                .delete(effectPatterns)
                .where(eq(effectPatterns.id, id))
                .returning({ id: effectPatterns.id });
            return results.length > 0;
        },
        /**
         * Upsert an effect pattern by slug
         * Throws EffectPatternLockedError if the pattern is validated/locked
         */
        async upsert(data) {
            // Check if pattern exists and is locked
            if (data.slug) {
                const existing = await this.findBySlug(data.slug);
                if (existing && isLocked(existing)) {
                    throw new EffectPatternLockedError(data.slug);
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
                .returning();
            return results[0];
        },
        /**
         * Get related patterns for a pattern
         */
        async getRelatedPatterns(patternId) {
            const relations = await db
                .select({ relatedPatternId: patternRelations.relatedPatternId })
                .from(patternRelations)
                .where(eq(patternRelations.patternId, patternId));
            if (relations.length === 0) {
                return [];
            }
            const relatedIds = relations.map((r) => r.relatedPatternId);
            return db
                .select()
                .from(effectPatterns)
                .where(inArray(effectPatterns.id, relatedIds));
        },
        /**
         * Set related patterns for a pattern
         * Throws EffectPatternLockedError if the pattern is validated/locked
         */
        async setRelatedPatterns(patternId, relatedPatternIds) {
            // Check if pattern is locked
            const existing = await this.findById(patternId);
            if (!existing) {
                throw new EffectPatternNotFoundError(patternId);
            }
            if (isLocked(existing)) {
                throw new EffectPatternLockedError(patternId);
            }
            // Delete existing relations
            await db
                .delete(patternRelations)
                .where(eq(patternRelations.patternId, patternId));
            // Insert new relations
            if (relatedPatternIds.length > 0) {
                await db.insert(patternRelations).values(relatedPatternIds.map((relatedPatternId) => ({
                    patternId,
                    relatedPatternId,
                })));
            }
        },
        /**
         * Count patterns by skill level
         */
        async countBySkillLevel() {
            const results = await db
                .select({
                skillLevel: effectPatterns.skillLevel,
                count: sql `count(*)::int`,
            })
                .from(effectPatterns)
                .groupBy(effectPatterns.skillLevel);
            return results.reduce((acc, row) => ({
                ...acc,
                [row.skillLevel]: row.count,
            }), { beginner: 0, intermediate: 0, advanced: 0 });
        },
        /**
         * Lock (validate) an effect pattern
         * Sets validated to true and validatedAt to current timestamp
         */
        async lock(id) {
            const results = await db
                .update(effectPatterns)
                .set({
                validated: true,
                validatedAt: new Date(),
                updatedAt: new Date(),
            })
                .where(eq(effectPatterns.id, id))
                .returning();
            return results[0] ?? null;
        },
        /**
         * Unlock (unvalidate) an effect pattern
         * Sets validated to false and clears validatedAt
         */
        async unlock(id) {
            const results = await db
                .update(effectPatterns)
                .set({
                validated: false,
                validatedAt: null,
                updatedAt: new Date(),
            })
                .where(eq(effectPatterns.id, id))
                .returning();
            return results[0] ?? null;
        },
        /**
         * Check if a pattern is locked
         */
        async isLocked(id) {
            const pattern = await this.findById(id);
            return pattern ? isLocked(pattern) : false;
        },
    };
}
//# sourceMappingURL=effect-pattern.js.map