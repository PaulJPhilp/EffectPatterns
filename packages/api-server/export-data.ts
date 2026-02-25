#!/usr/bin/env bun
/**
 * Export all data from local database for migration to production
 */

import { createDatabase } from "@effect-patterns/toolkit";
import { sql } from "drizzle-orm";
import { writeFileSync } from "node:fs";

async function exportData() {
    const dbUrl =
        process.env.DATABASE_URL ||
        "postgresql://postgres:postgres@127.0.0.1:5432/effect_patterns";
    const { db, close } = createDatabase(dbUrl);

    try {
        console.log("Exporting data from local database...");

        // Export application_patterns
        const appPatterns = await db.execute(
            sql`SELECT * FROM application_patterns ORDER BY created_at`,
        );
        console.log(`Found ${appPatterns.length} application patterns`);

        // Export effect_patterns
        const effectPatterns = await db.execute(
            sql`SELECT * FROM effect_patterns ORDER BY created_at`,
        );
        console.log(`Found ${effectPatterns.length} effect patterns`);

        // Export pattern_relations
        const patternRelations = await db.execute(
            sql`SELECT * FROM pattern_relations`,
        );
        console.log(`Found ${patternRelations.length} pattern relations`);

        // Save to file
        const exportData = {
            application_patterns: appPatterns,
            effect_patterns: effectPatterns,
            pattern_relations: patternRelations,
            exported_at: new Date().toISOString(),
        };

        writeFileSync("mcp-data-export.json", JSON.stringify(exportData, null, 2));
        console.log("✅ Data exported to mcp-data-export.json");
    } catch (error) {
        console.error("Export failed:", error);
        throw error;
    } finally {
        await close();
    }
}

exportData().catch(console.error);
