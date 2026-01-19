#!/usr/bin/env bun
/**
 * Import data to production using API endpoints
 */

import { readFileSync } from "node:fs";

const PROD_URL = "https://effect-patterns-mcp.vercel.app";

async function importToProduction() {
    try {
        console.log("Reading export data...");
        const exportData = JSON.parse(readFileSync("mcp-data-export.json", "utf8"));

        console.log(
            `Found ${exportData.effect_patterns.length} effect patterns to import`,
        );

        // Clear production database first
        console.log("Clearing production database...");
        const clearResponse = await fetch(`${PROD_URL}/api/migrate-final`, {
            method: "POST",
        });

        if (!clearResponse.ok) {
            throw new Error(
                `Failed to clear database: ${await clearResponse.text()}`,
            );
        }

        console.log("✅ Database cleared");

        // Import patterns in bulk
        console.log("Importing patterns...");
        const importResponse = await fetch(`${PROD_URL}/api/bulk-import`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                patterns: exportData.effect_patterns,
            }),
        });

        if (!importResponse.ok) {
            throw new Error(
                `Failed to import patterns: ${await importResponse.text()}`,
            );
        }

        const importResult = await importResponse.json();
        console.log(`✅ ${importResult.message}`);

        // Verify import
        const verifyResponse = await fetch(`${PROD_URL}/api/patterns?limit=5`, {
            headers: {
                "x-api-key":
                    "ce9a3a239f8c028cbf543aa1b77637b8a98ade05814770e4950ff2bb32e9ee84",
            },
        });

        if (verifyResponse.ok) {
            const data = await verifyResponse.json();
            console.log(
                `✅ Verification: Found ${data.count} patterns in production database`,
            );
        }
    } catch (error) {
        console.error("Import failed:", error);
        process.exit(1);
    }
}

importToProduction();
