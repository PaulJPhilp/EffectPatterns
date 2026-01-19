/**
 * Bulk import data endpoint
 */

import { createDatabase } from "@effect-patterns/toolkit";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { patterns } = body;

        if (!Array.isArray(patterns)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "patterns must be an array",
                },
                { status: 400 },
            );
        }

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            return NextResponse.json(
                {
                    success: false,
                    error: "DATABASE_URL not set",
                },
                { status: 500 },
            );
        }

        const { db, close } = createDatabase(dbUrl);

        try {
            console.log(`Importing ${patterns.length} patterns...`);

            let imported = 0;
            for (const pattern of patterns) {
                await db.execute(sql`
          INSERT INTO effect_patterns (
            id, slug, title, summary, skill_level, category, difficulty,
            tags, examples, use_cases, rule, content, author, lesson_order,
            application_pattern_id, validated, validated_at, created_at, updated_at
          ) VALUES (
            ${pattern.id}, ${pattern.slug}, ${pattern.title}, ${pattern.summary},
            ${pattern.skill_level}, ${pattern.category}, ${pattern.difficulty},
            ${JSON.stringify(pattern.tags || [])}::jsonb,
            ${JSON.stringify(pattern.examples || [])}::jsonb,
            ${JSON.stringify(pattern.use_cases || [])}::jsonb,
            ${pattern.rule ? JSON.stringify(pattern.rule) : null}::jsonb,
            ${pattern.content}, ${pattern.author}, ${pattern.lesson_order},
            ${pattern.application_pattern_id}, ${pattern.validated}, ${pattern.validated_at},
            ${pattern.created_at}, ${pattern.updated_at}
          )
          ON CONFLICT (id) DO NOTHING
        `);
                imported++;
            }

            console.log(`✅ Successfully imported ${imported} patterns`);

            return NextResponse.json({
                success: true,
                message: `Imported ${imported} patterns`,
                imported,
            });
        } finally {
            await close();
        }
    } catch (error) {
        console.error("Import error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Import failed",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
