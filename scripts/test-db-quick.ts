#!/usr/bin/env bun
/**
 * Quick Database Test
 *
 * Fast test to verify database is working.
 * Run this first to check if database is accessible.
 *
 * Usage:
 *   bun run scripts/test-db-quick.ts
 */

import { createDatabase } from "../packages/toolkit/src/db/client.js"
import {
  createApplicationPatternRepository,
  createEffectPatternRepository,
  createJobRepository,
} from "../packages/toolkit/src/repositories/index.js"

async function quickTest() {
  console.log("🔍 Quick Database Test\n")

  const { db, close } = createDatabase()

  try {
    // Test 1: Connection
    console.log("1. Testing database connection...")
    await db.execute("SELECT 1")
    console.log("   ✅ Connected\n")

    // Test 2: Tables exist
    console.log("2. Checking tables...")
    const tables = [
      "application_patterns",
      "effect_patterns",
      "jobs",
      "pattern_jobs",
      "pattern_relations",
    ]

    for (const table of tables) {
      const result = await db.execute(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      )
      const exists = (result as any)[0]?.exists
      if (exists) {
        console.log(`   ✅ Table '${table}' exists`)
      } else {
        console.log(`   ❌ Table '${table}' missing`)
        throw new Error(`Table ${table} does not exist`)
      }
    }
    console.log()

    // Test 3: Data exists
    console.log("3. Checking data...")
    const apRepo = createApplicationPatternRepository(db)
    const epRepo = createEffectPatternRepository(db)
    const jobRepo = createJobRepository(db)

    const aps = await apRepo.findAll()
    const eps = await epRepo.findAll()
    const jobs = await jobRepo.findAll()

    console.log(`   Application Patterns: ${aps.length}`)
    console.log(`   Effect Patterns: ${eps.length}`)
    console.log(`   Jobs: ${jobs.length}`)
    console.log()

    if (aps.length === 0 && eps.length === 0) {
      console.log("⚠️  No data found. Run migration:")
      console.log("   bun run db:migrate\n")
    }

    // Test 4: Search works
    console.log("4. Testing search...")
    const searchResults = await epRepo.search({ query: "effect", limit: 5 })
    console.log(`   ✅ Search returned ${searchResults.length} results\n`)

    // Test 5: Repositories work
    console.log("5. Testing repositories...")
    if (aps.length > 0) {
      const ap = await apRepo.findBySlug(aps[0].slug)
      if (ap) {
        console.log(`   ✅ Application Pattern repository works`)
      }
    }
    if (eps.length > 0) {
      const ep = await epRepo.findBySlug(eps[0].slug)
      if (ep) {
        console.log(`   ✅ Effect Pattern repository works`)
      }
    }
    console.log()

    console.log("✨ All quick tests passed!")
    console.log("\nNext steps:")
    console.log("   • Run full test suite: bun run test:db")
    console.log("   • Test CLI: bun run ep search retry")
    console.log("   • Test MCP server: cd services/mcp-server && bun run dev")
  } catch (error) {
    console.error("\n❌ Test failed:", error)
    console.error("\nTroubleshooting:")
    console.error("   1. Is PostgreSQL running? (docker-compose up -d postgres)")
    console.error("   2. Is schema pushed? (bun run db:push)")
    console.error("   3. Is data migrated? (bun run db:migrate)")
    process.exit(1)
  } finally {
    await close()
  }
}

quickTest()

