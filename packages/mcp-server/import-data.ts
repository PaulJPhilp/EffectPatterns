#!/usr/bin/env bun
/**
 * Import data to production database from export file
 */

import { createDatabase } from "@effect-patterns/toolkit";
import { sql } from "drizzle-orm";
import { readFileSync } from "node:fs";

function toJsonb(value: unknown, fallback: unknown) {
    return JSON.stringify(value ?? fallback);
}

async function importData() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        throw new Error("DATABASE_URL environment variable is required");
    }

    const { db, close } = createDatabase(dbUrl);

    try {
        console.log("Importing data to production database...");

        // Read export file
        const exportData = JSON.parse(readFileSync("mcp-data-export.json", "utf8"));
        console.log(`Loaded export from ${exportData.exported_at}`);

        // Clear existing data
        console.log("Clearing existing data...");
        await db.execute(sql`DELETE FROM pattern_relations`);
        await db.execute(sql`DELETE FROM pattern_jobs`);
        await db.execute(sql`DELETE FROM jobs`);
        await db.execute(sql`DELETE FROM effect_patterns`);
        await db.execute(sql`DELETE FROM application_patterns`);

        // Import application_patterns
        if (exportData.application_patterns.length > 0) {
            console.log(
                `Importing ${exportData.application_patterns.length} application patterns...`,
            );
            for (const pattern of exportData.application_patterns) {
                const subPatternsJson = toJsonb(pattern.sub_patterns, []);
                await db.execute(sql`
          INSERT INTO application_patterns (
            id, slug, name, description, learning_order, effect_module,
            sub_patterns, validated, validated_at, created_at, updated_at
          ) VALUES (
            ${pattern.id}, ${pattern.slug}, ${pattern.name}, ${pattern.description},
            ${pattern.learning_order}, ${pattern.effect_module}, ${subPatternsJson}::jsonb,
            ${pattern.validated}, ${pattern.validated_at}, ${pattern.created_at}, ${pattern.updated_at}
          )
        `);
            }
        }

        // Import effect_patterns
        if (exportData.effect_patterns.length > 0) {
            console.log(
                `Importing ${exportData.effect_patterns.length} effect patterns...`,
            );
            for (const pattern of exportData.effect_patterns) {
                const tagsJson = toJsonb(pattern.tags, []);
                const examplesJson = toJsonb(pattern.examples, []);
                const useCasesJson = toJsonb(pattern.use_cases, []);
                const ruleJson = pattern.rule ? JSON.stringify(pattern.rule) : null;
                await db.execute(sql`
          INSERT INTO effect_patterns (
            id, slug, title, summary, skill_level, category, difficulty,
            tags, examples, use_cases, rule, content, author, lesson_order,
            application_pattern_id, validated, validated_at, created_at, updated_at
          ) VALUES (
            ${pattern.id}, ${pattern.slug}, ${pattern.title}, ${pattern.summary},
            ${pattern.skill_level}, ${pattern.category}, ${pattern.difficulty},
            ${tagsJson}::jsonb, ${examplesJson}::jsonb, ${useCasesJson}::jsonb, ${ruleJson}::jsonb,
            ${pattern.content}, ${pattern.author}, ${pattern.lesson_order},
            ${pattern.application_pattern_id}, ${pattern.validated}, ${pattern.validated_at},
            ${pattern.created_at}, ${pattern.updated_at}
          )
        `);
            }
        }

        // Import jobs
        if (exportData.jobs.length > 0) {
            console.log(`Importing ${exportData.jobs.length} jobs...`);
            for (const job of exportData.jobs) {
                await db.execute(sql`
          INSERT INTO jobs (
            id, slug, description, category, status, application_pattern_id,
            validated, validated_at, created_at, updated_at
          ) VALUES (
            ${job.id}, ${job.slug}, ${job.description}, ${job.category},
            ${job.status}, ${job.application_pattern_id}, ${job.validated},
            ${job.validated_at}, ${job.created_at}, ${job.updated_at}
          )
        `);
            }
        }

        // Import pattern_jobs
        if (exportData.pattern_jobs.length > 0) {
            console.log(
                `Importing ${exportData.pattern_jobs.length} pattern-job relationships...`,
            );
            for (const relation of exportData.pattern_jobs) {
                await db.execute(sql`
          INSERT INTO pattern_jobs (pattern_id, job_id)
          VALUES (${relation.pattern_id}, ${relation.job_id})
        `);
            }
        }

        // Import pattern_relations
        if (exportData.pattern_relations.length > 0) {
            console.log(
                `Importing ${exportData.pattern_relations.length} pattern relations...`,
            );
            for (const relation of exportData.pattern_relations) {
                await db.execute(sql`
          INSERT INTO pattern_relations (pattern_id, related_pattern_id)
          VALUES (${relation.pattern_id}, ${relation.related_pattern_id})
        `);
            }
        }

        console.log("✅ Data import completed successfully!");
    } catch (error) {
        console.error("Import failed:", error);
        throw error;
    } finally {
        await close();
    }
}

importData().catch(console.error);
