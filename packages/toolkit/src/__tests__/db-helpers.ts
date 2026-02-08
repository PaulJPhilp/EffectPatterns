/**
 * Database Test Helpers
 *
 * Utilities for testing database functionality.
 */

import { createDatabase } from "../db/client.js"
import {
  applicationPatterns,
  effectPatterns,
  jobs,
  patternJobs,
  patternRelations,
  skillPatterns,
  skills,
} from "../db/schema/index.js"
import type { Database } from "../db/client.js"

/**
 * Get test database URL from environment or use default
 */
export function getTestDatabaseUrl(): string {
  return (
    process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/effect_patterns_test"
  )
}

/**
 * Create a test database connection
 */
export function createTestDatabase(url?: string) {
  return createDatabase(url ?? getTestDatabaseUrl())
}

/**
 * Clean all tables in the database
 */
export async function cleanDatabase(db: Database): Promise<void> {
  await db.delete(skillPatterns)
  await db.delete(skills)
  await db.delete(patternRelations)
  await db.delete(patternJobs)
  await db.delete(effectPatterns)
  await db.delete(jobs)
  await db.delete(applicationPatterns)
}

/**
 * Seed test data
 */
export async function seedTestData(db: Database): Promise<{
  applicationPatternId: string
  patternId: string
  jobId: string
}> {
  // Create test application pattern
  const [ap] = await db
    .insert(applicationPatterns)
    .values({
      slug: "test-concurrency",
      name: "Test Concurrency",
      description: "Test concurrency patterns",
      learningOrder: 1,
      effectModule: "Effect",
      subPatterns: ["getting-started"],
    })
    .returning()

  // Create test effect pattern
  const [ep] = await db
    .insert(effectPatterns)
    .values({
      slug: "test-hello-world",
      title: "Test Hello World",
      summary: "A test pattern",
      skillLevel: "beginner",
      category: "test",
      applicationPatternId: ap.id,
    })
    .returning()

  // Create test job
  const [job] = await db
    .insert(jobs)
    .values({
      slug: "test-job-run-parallel",
      description: "Run effects in parallel",
      category: "getting-started",
      status: "covered",
      applicationPatternId: ap.id,
    })
    .returning()

  // Link pattern to job
  await db.insert(patternJobs).values({
    patternId: ep.id,
    jobId: job.id,
  })

  return {
    applicationPatternId: ap.id,
    patternId: ep.id,
    jobId: job.id,
  }
}

/**
 * Setup test database with clean state
 */
export async function setupTestDatabase(url?: string): Promise<{
  db: Database
  close: () => Promise<void>
  ids: {
    applicationPatternId: string
    patternId: string
    jobId: string
  }
}> {
  const connection = createTestDatabase(url)
  await cleanDatabase(connection.db)
  const ids = await seedTestData(connection.db)

  return {
    db: connection.db,
    close: connection.close,
    ids,
  }
}

