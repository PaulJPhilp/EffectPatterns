#!/usr/bin/env bun
/**
 * Migrate to PostgreSQL
 *
 * This script migrates existing data from JSON/MDX files to PostgreSQL:
 * 1. Application Patterns from data/application-patterns.json
 * 2. Effect Patterns from data/patterns-index.json and content/published/patterns/*.mdx
 * 3. Jobs from docs/*_JOBS_TO_BE_DONE.md files
 *
 * Usage:
 *   bun run scripts/migrate-to-postgres.ts
 *
 * Prerequisites:
 *   - PostgreSQL running (docker-compose up -d postgres)
 *   - DATABASE_URL environment variable set (optional, defaults to local)
 */

import { Effect, Console } from 'effect';
import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import { createDatabase } from '../packages/toolkit/src/db/client.js';
import {
  applicationPatterns,
  effectPatterns,
  jobs,
  patternRelations,
  patternJobs,
  type NewApplicationPattern,
  type NewEffectPattern,
  type NewJob,
  type SkillLevel,
  type JobStatus,
} from '../packages/toolkit/src/db/schema/index.js';

// ============================================
// Types
// ============================================

interface ApplicationPatternJson {
  id: string;
  name: string;
  description: string;
  learningOrder: number;
  effectModule?: string;
  subPatterns: string[];
}

interface PatternIndexEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  tags: string[];
  examples: Array<{
    language: string;
    code: string;
    description?: string;
  }>;
  useCases: string[];
}

interface MdxFrontmatter {
  id: string;
  title: string;
  skillLevel?: string;
  applicationPatternId?: string;
  summary?: string;
  tags?: string[];
  rule?: { description: string };
  author?: string;
  related?: string[];
  lessonOrder?: number;
}

interface ParsedJob {
  slug: string;
  description: string;
  category?: string;
  status: JobStatus;
  applicationPatternSlug: string;
  fulfilledBy: string[];
}

// ============================================
// Utility Functions
// ============================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseSkillLevel(level: string | undefined): SkillLevel {
  const normalized = level?.toLowerCase();
  if (
    normalized === 'beginner' ||
    normalized === 'intermediate' ||
    normalized === 'advanced'
  ) {
    return normalized;
  }
  return 'intermediate';
}

function parseDifficulty(difficulty: string | undefined): string {
  const normalized = difficulty?.toLowerCase();
  if (
    normalized === 'beginner' ||
    normalized === 'intermediate' ||
    normalized === 'advanced'
  ) {
    return normalized;
  }
  return 'intermediate';
}

// ============================================
// Data Loaders
// ============================================

function loadApplicationPatterns(): ApplicationPatternJson[] {
  const filePath = path.join(
    process.cwd(),
    'data',
    'application-patterns.json',
  );
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  return data.applicationPatterns;
}

function loadPatternsIndex(): PatternIndexEntry[] {
  const filePath = path.join(process.cwd(), 'data', 'patterns-index.json');
  if (!fs.existsSync(filePath)) {
    console.log('patterns-index.json not found, skipping...');
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  return data.patterns || [];
}

function findMdxFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.mdx')) {
        results.push(fullPath);
      }
    }
  }

  if (fs.existsSync(dir)) {
    walk(dir);
  }

  return results;
}

function loadMdxPatterns(): Map<
  string,
  { frontmatter: MdxFrontmatter; content: string }
> {
  const patternsDir = path.join(
    process.cwd(),
    'content',
    'published',
    'patterns',
  );
  const mdxFiles = findMdxFiles(patternsDir);
  const patterns = new Map<
    string,
    { frontmatter: MdxFrontmatter; content: string }
  >();

  for (const filePath of mdxFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data, content: mdxContent } = matter(content);
      const frontmatter = data as MdxFrontmatter;

      if (frontmatter.id) {
        patterns.set(frontmatter.id, {
          frontmatter,
          content: mdxContent,
        });
      }
    } catch (error) {
      console.warn(`Failed to parse MDX file ${filePath}:`, error);
    }
  }

  return patterns;
}

function parseJobsFromMarkdown(
  content: string,
  applicationPatternSlug: string,
): ParsedJob[] {
  const jobs: ParsedJob[] = [];
  const lines = content.split('\n');

  let currentCategory = '';
  let currentPatterns: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Category headers (## 1. Getting Started with...)
    const categoryMatch = line.match(/^##\s+\d+\.\s+(.+?)(?:\s+[✅❌⚠️].*)?$/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim();
      currentPatterns = [];
      continue;
    }

    // Pattern references (- `pattern-id` - Title)
    const patternMatch = line.match(/^-\s+`([^`]+)`\s+-/);
    if (patternMatch) {
      currentPatterns.push(patternMatch[1]);
      continue;
    }

    // Job items (- [x] or - [ ])
    const jobMatch = line.match(/^-\s+\[([ xX])\]\s+(.+)$/);
    if (jobMatch) {
      const isComplete = jobMatch[1].toLowerCase() === 'x';
      const description = jobMatch[2].trim();
      const slug = `${applicationPatternSlug}-${slugify(description)}`;

      jobs.push({
        slug,
        description,
        category: currentCategory || undefined,
        status: isComplete ? 'covered' : 'gap',
        applicationPatternSlug,
        fulfilledBy: isComplete ? [...currentPatterns] : [],
      });
    }
  }

  return jobs;
}

function loadJobs(): ParsedJob[] {
  const docsDir = path.join(process.cwd(), 'docs');
  const allJobs: ParsedJob[] = [];

  const files = fs.readdirSync(docsDir);
  for (const file of files) {
    if (file.endsWith('_JOBS_TO_BE_DONE.md')) {
      const filePath = path.join(docsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract application pattern slug from filename
      // e.g., CONCURRENCY_JOBS_TO_BE_DONE.md -> concurrency
      const apSlug = file
        .replace('_JOBS_TO_BE_DONE.md', '')
        .toLowerCase()
        .replace(/_/g, '-');

      const parsedJobs = parseJobsFromMarkdown(content, apSlug);
      allJobs.push(...parsedJobs);
    }
  }

  return allJobs;
}

// ============================================
// Migration Logic
// ============================================

async function migrate() {
  console.log('🚀 Starting PostgreSQL migration...');
  console.log('');

  const { db, close } = createDatabase();

  try {
    // ========================================
    // Step 1: Migrate Application Patterns
    // ========================================
    console.log('📦 Migrating Application Patterns...');
    const apData = loadApplicationPatterns();

    const apInserts: NewApplicationPattern[] = apData.map((ap) => ({
      slug: ap.id,
      name: ap.name,
      description: ap.description,
      learningOrder: ap.learningOrder,
      effectModule: ap.effectModule || null,
      subPatterns: ap.subPatterns,
    }));

    // Clear existing data
    await db.delete(patternRelations);
    await db.delete(patternJobs);
    await db.delete(effectPatterns);
    await db.delete(jobs);
    await db.delete(applicationPatterns);

    // Insert application patterns
    const insertedAPs = await db
      .insert(applicationPatterns)
      .values(apInserts)
      .returning();

    const apSlugToId = new Map(insertedAPs.map((ap) => [ap.slug, ap.id]));
    console.log(`   ✅ Migrated ${insertedAPs.length} application patterns`);

    // ========================================
    // Step 2: Migrate Effect Patterns
    // ========================================
    console.log('📝 Migrating Effect Patterns...');

    // Load from both sources
    const indexPatterns = loadPatternsIndex();
    const mdxPatterns = loadMdxPatterns();

    // Merge data - MDX frontmatter takes precedence
    const mergedPatterns = new Map<string, NewEffectPattern>();

    // First, add patterns from index
    for (const pattern of indexPatterns) {
      mergedPatterns.set(pattern.id, {
        slug: pattern.id,
        title: pattern.title,
        summary: pattern.description,
        skillLevel: parseDifficulty(pattern.difficulty) as SkillLevel,
        category: pattern.category,
        difficulty: pattern.difficulty,
        tags: pattern.tags,
        examples: pattern.examples,
        useCases: pattern.useCases,
        rule: null,
        content: null,
        author: null,
        lessonOrder: null,
        applicationPatternId: null,
      });
    }

    // Then, merge/override with MDX data
    for (const [id, { frontmatter, content }] of mdxPatterns) {
      const existing = mergedPatterns.get(id);

      // Extract application pattern ID from applicationPatternId field
      // e.g., "concurrency-getting-started" -> "concurrency"
      let apSlug: string | null = null;
      if (frontmatter.applicationPatternId) {
        // Try direct match first
        if (apSlugToId.has(frontmatter.applicationPatternId)) {
          apSlug = frontmatter.applicationPatternId;
        } else {
          // Try extracting base pattern (e.g., "concurrency-getting-started" -> "concurrency")
          const parts = frontmatter.applicationPatternId.split('-');
          for (let i = parts.length; i > 0; i--) {
            const candidate = parts.slice(0, i).join('-');
            if (apSlugToId.has(candidate)) {
              apSlug = candidate;
              break;
            }
          }
        }
      }

      mergedPatterns.set(id, {
        slug: id,
        title: frontmatter.title || existing?.title || id,
        summary: frontmatter.summary || existing?.summary || '',
        skillLevel: parseSkillLevel(frontmatter.skillLevel),
        category: existing?.category || null,
        difficulty: existing?.difficulty || frontmatter.skillLevel || null,
        tags: frontmatter.tags || existing?.tags || [],
        examples: existing?.examples || [],
        useCases: existing?.useCases || [],
        rule: frontmatter.rule || null,
        content: content || null,
        author: frontmatter.author || null,
        lessonOrder: frontmatter.lessonOrder || null,
        applicationPatternId: apSlug ? apSlugToId.get(apSlug) || null : null,
      });
    }

    // Insert patterns
    const patternInserts = Array.from(mergedPatterns.values());
    const insertedPatterns = await db
      .insert(effectPatterns)
      .values(patternInserts)
      .returning();

    const patternSlugToId = new Map(
      insertedPatterns.map((p) => [p.slug, p.id]),
    );
    console.log(`   ✅ Migrated ${insertedPatterns.length} effect patterns`);

    // ========================================
    // Step 3: Migrate Pattern Relations
    // ========================================
    console.log('🔗 Migrating Pattern Relations...');
    let relationCount = 0;

    for (const [id, { frontmatter }] of mdxPatterns) {
      if (frontmatter.related && frontmatter.related.length > 0) {
        const patternId = patternSlugToId.get(id);
        if (!patternId) continue;

        const validRelations = frontmatter.related
          .map((relatedSlug) => patternSlugToId.get(relatedSlug))
          .filter((relatedId): relatedId is string => !!relatedId)
          .map((relatedPatternId) => ({
            patternId,
            relatedPatternId,
          }));

        if (validRelations.length > 0) {
          await db
            .insert(patternRelations)
            .values(validRelations)
            .onConflictDoNothing();
          relationCount += validRelations.length;
        }
      }
    }

    console.log(`   ✅ Migrated ${relationCount} pattern relations`);

    // ========================================
    // Step 4: Migrate Jobs
    // ========================================
    console.log('📋 Migrating Jobs...');
    const parsedJobs = loadJobs();

    const jobInserts: NewJob[] = parsedJobs.map((job) => ({
      slug: job.slug,
      description: job.description,
      category: job.category || null,
      status: job.status,
      applicationPatternId: apSlugToId.get(job.applicationPatternSlug) || null,
    }));

    let insertedJobs: (typeof jobs.$inferSelect)[] = [];
    if (jobInserts.length > 0) {
      insertedJobs = await db.insert(jobs).values(jobInserts).returning();
    }

    const jobSlugToId = new Map(insertedJobs.map((j) => [j.slug, j.id]));
    console.log(`   ✅ Migrated ${insertedJobs.length} jobs`);

    // ========================================
    // Step 5: Migrate Job-Pattern Links
    // ========================================
    console.log('🔗 Migrating Job-Pattern Links...');
    let linkCount = 0;

    for (const job of parsedJobs) {
      const jobId = jobSlugToId.get(job.slug);
      if (!jobId) continue;

      const validLinks = job.fulfilledBy
        .map((patternSlug) => patternSlugToId.get(patternSlug))
        .filter((patternId): patternId is string => !!patternId)
        .map((patternId) => ({
          jobId,
          patternId,
        }));

      if (validLinks.length > 0) {
        await db.insert(patternJobs).values(validLinks).onConflictDoNothing();
        linkCount += validLinks.length;
      }
    }

    console.log(`   ✅ Migrated ${linkCount} job-pattern links`);

    // ========================================
    // Summary
    // ========================================
    console.log('');
    console.log('✨ Migration complete!');
    console.log('');
    console.log('Summary:');
    console.log(`   • Application Patterns: ${insertedAPs.length}`);
    console.log(`   • Effect Patterns: ${insertedPatterns.length}`);
    console.log(`   • Pattern Relations: ${relationCount}`);
    console.log(`   • Jobs: ${insertedJobs.length}`);
    console.log(`   • Job-Pattern Links: ${linkCount}`);
  } finally {
    await close();
  }
}

// Run migration
migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
