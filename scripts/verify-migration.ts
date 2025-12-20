#!/usr/bin/env bun
/**
 * Verify Migration
 *
 * Quick verification script to check migration results.
 *
 * Usage:
 *   bun run scripts/verify-migration.ts
 */

import { createDatabase } from "../packages/toolkit/src/db/client.js"
import {
  applicationPatterns,
  effectPatterns,
  jobs,
  patternJobs,
  patternRelations,
} from "../packages/toolkit/src/db/schema/index.js"
import { count, eq } from "drizzle-orm"

async function verify() {
  console.log("🔍 Verifying database migration...")
  console.log("")

  const { db, close } = createDatabase()

  try {
    // Count records in each table
    const [apCount] = await db.select({ count: count() }).from(applicationPatterns)
    const [epCount] = await db.select({ count: count() }).from(effectPatterns)
    const [jobCount] = await db.select({ count: count() }).from(jobs)
    const [pjCount] = await db.select({ count: count() }).from(patternJobs)
    const [prCount] = await db.select({ count: count() }).from(patternRelations)

    console.log("📊 Record counts:")
    console.log(`   • Application Patterns: ${apCount.count}`)
    console.log(`   • Effect Patterns: ${epCount.count}`)
    console.log(`   • Jobs: ${jobCount.count}`)
    console.log(`   • Pattern-Job Links: ${pjCount.count}`)
    console.log(`   • Pattern Relations: ${prCount.count}`)
    console.log("")

    // Sample some data
    console.log("📋 Sample Application Patterns:")
    const sampleAPs = await db
      .select()
      .from(applicationPatterns)
      .limit(5)
      .orderBy(applicationPatterns.learningOrder)

    for (const ap of sampleAPs) {
      console.log(`   ${ap.learningOrder}. ${ap.name} (${ap.slug})`)
    }
    console.log("")

    console.log("📝 Sample Effect Patterns:")
    const sampleEPs = await db.select().from(effectPatterns).limit(5)

    for (const ep of sampleEPs) {
      console.log(`   • ${ep.title} [${ep.skillLevel}]`)
    }
    console.log("")

    // Count by skill level
    const beginnerCount = await db
      .select({ count: count() })
      .from(effectPatterns)
      .where(eq(effectPatterns.skillLevel, "beginner"))

    const intermediateCount = await db
      .select({ count: count() })
      .from(effectPatterns)
      .where(eq(effectPatterns.skillLevel, "intermediate"))

    const advancedCount = await db
      .select({ count: count() })
      .from(effectPatterns)
      .where(eq(effectPatterns.skillLevel, "advanced"))

    console.log("📈 Patterns by Skill Level:")
    console.log(`   • Beginner: ${beginnerCount[0].count}`)
    console.log(`   • Intermediate: ${intermediateCount[0].count}`)
    console.log(`   • Advanced: ${advancedCount[0].count}`)
    console.log("")

    // Job coverage
    const coveredJobs = await db
      .select({ count: count() })
      .from(jobs)
      .where(eq(jobs.status, "covered"))

    const gapJobs = await db
      .select({ count: count() })
      .from(jobs)
      .where(eq(jobs.status, "gap"))

    console.log("📊 Job Coverage:")
    console.log(`   • Covered: ${coveredJobs[0].count}`)
    console.log(`   • Gaps: ${gapJobs[0].count}`)
    console.log("")

    console.log("✅ Verification complete!")
  } finally {
    await close()
  }
}

verify().catch((error) => {
  console.error("Verification failed:", error)
  process.exit(1)
})

