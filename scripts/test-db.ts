#!/usr/bin/env bun
/**
 * Database Test Runner
 *
 * Comprehensive test suite for database functionality.
 * Tests migration, repositories, and data integrity.
 *
 * Usage:
 *   bun run scripts/test-db.ts
 *
 * Prerequisites:
 *   - PostgreSQL running (docker-compose up -d postgres)
 *   - Schema pushed (bun run db:push)
 */

import { createDatabase } from '../packages/toolkit/src/db/client.js';
import {
  createApplicationPatternRepository,
  createEffectPatternRepository,
  createJobRepository,
} from '../packages/toolkit/src/repositories/index.js';
import {
  applicationPatterns,
  effectPatterns,
  jobs,
} from '../packages/toolkit/src/db/schema/index.js';
import { sql } from 'drizzle-orm';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  const result: TestResult = {
    name,
    passed: false,
    duration: 0,
  };
  results.push(result);

  try {
    await fn();
    result.passed = true;
    result.duration = Date.now() - start;
    console.log(`✅ ${name} (${result.duration}ms)`);
  } catch (error) {
    result.passed = false;
    result.error = error instanceof Error ? error.message : String(error);
    result.duration = Date.now() - start;
    console.error(`❌ ${name}: ${result.error}`);
  }
}

async function runAllTests() {
  console.log('🧪 Running Database Tests\n');
  console.log('='.repeat(60));

  const { db, close } = createDatabase();

  try {
    // Test 1: Database Connection
    await runTest('Database Connection', async () => {
      const result = (await db.execute('SELECT 1 as test')) as Array<{
        test: number;
      }>;
      if (!result || result[0]?.test !== 1) {
        throw new Error('Database connection failed');
      }
    });

    // Test 2: Schema Tables Exist
    await runTest('Schema Tables Exist', async () => {
      const tables = [
        'application_patterns',
        'effect_patterns',
        'jobs',
        'pattern_jobs',
        'pattern_relations',
      ];

      for (const table of tables) {
        const result = (await db.execute(
          sql`SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          )`,
        )) as Array<{ exists: boolean }>;
        if (!result || !result[0]?.exists) {
          throw new Error(`Table ${table} does not exist`);
        }
      }
    });

    // Test 3: Application Patterns Repository
    await runTest('Application Patterns Repository - findAll', async () => {
      const repo = createApplicationPatternRepository(db);
      const all = await repo.findAll();
      if (!Array.isArray(all)) {
        throw new Error('findAll should return an array');
      }
      console.log(`   Found ${all.length} application patterns`);
    });

    // Test 4: Effect Patterns Repository
    await runTest('Effect Patterns Repository - findAll', async () => {
      const repo = createEffectPatternRepository(db);
      const all = await repo.findAll();
      if (!Array.isArray(all)) {
        throw new Error('findAll should return an array');
      }
      console.log(`   Found ${all.length} effect patterns`);
    });

    // Test 5: Search Functionality
    await runTest('Pattern Search', async () => {
      const repo = createEffectPatternRepository(db);
      const searchResults = await repo.search({ query: 'effect', limit: 10 });
      if (!Array.isArray(searchResults)) {
        throw new Error('search should return an array');
      }
      console.log(
        `   Found ${searchResults.length} patterns matching "effect"`,
      );
    });

    // Test 6: Jobs Repository
    await runTest('Jobs Repository - findAll', async () => {
      const repo = createJobRepository(db);
      const all = await repo.findAll();
      if (!Array.isArray(all)) {
        throw new Error('findAll should return an array');
      }
      console.log(`   Found ${all.length} jobs`);
    });

    // Test 7: Count Patterns by Skill Level
    await runTest('Count Patterns by Skill Level', async () => {
      const repo = createEffectPatternRepository(db);
      const counts = await repo.countBySkillLevel();
      if (
        typeof counts.beginner !== 'number' ||
        typeof counts.intermediate !== 'number' ||
        typeof counts.advanced !== 'number'
      ) {
        throw new Error(
          'countBySkillLevel should return counts for all levels',
        );
      }
      console.log(
        `   Beginner: ${counts.beginner}, Intermediate: ${counts.intermediate}, Advanced: ${counts.advanced}`,
      );
    });

    // Test 8: Coverage Statistics
    await runTest('Job Coverage Statistics', async () => {
      const repo = createJobRepository(db);
      const stats = await repo.getCoverageStats();
      if (
        typeof stats.total !== 'number' ||
        typeof stats.covered !== 'number' ||
        typeof stats.partial !== 'number' ||
        typeof stats.gap !== 'number'
      ) {
        throw new Error('getCoverageStats should return all statistics');
      }
      console.log(
        `   Total: ${stats.total}, Covered: ${stats.covered}, Partial: ${stats.partial}, Gaps: ${stats.gap}`,
      );
    });

    // Test 9: Find by Slug
    await runTest('Find Pattern by Slug', async () => {
      const repo = createEffectPatternRepository(db);
      const all = await repo.findAll(1);
      if (all.length > 0) {
        const pattern = await repo.findBySlug(all[0].slug);
        if (!pattern || pattern.slug !== all[0].slug) {
          throw new Error('findBySlug should return the correct pattern');
        }
        console.log(`   Found pattern: ${pattern.title}`);
      } else {
        console.log('   No patterns to test with');
      }
    });

    // Test 10: Find by Application Pattern
    await runTest('Find Patterns by Application Pattern', async () => {
      const apRepo = createApplicationPatternRepository(db);
      const epRepo = createEffectPatternRepository(db);

      const aps = await apRepo.findAll();
      if (aps.length > 0) {
        const patterns = await epRepo.findByApplicationPattern(aps[0].id);
        if (!Array.isArray(patterns)) {
          throw new Error('findByApplicationPattern should return an array');
        }
        console.log(`   Found ${patterns.length} patterns for ${aps[0].name}`);
      } else {
        console.log('   No application patterns to test with');
      }
    });

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Total Tests: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      for (const result of results) {
        if (!result.passed) {
          console.log(`   • ${result.name}`);
          console.log(`     Error: ${result.error}`);
        }
      }
      process.exit(1);
    } else {
      console.log('\n✨ All tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n💥 Test runner crashed:', error);
    process.exit(1);
  } finally {
    await close();
  }
}

runAllTests();
