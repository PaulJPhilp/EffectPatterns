#!/usr/bin/env node

import Supermemory from "supermemory";
import dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.join(__dirname, ".env.local") });

async function inspectPatterns() {
  const apiKey = process.env.SUPERMEMORY_API_KEY;

  if (!apiKey) {
    console.error("❌ SUPERMEMORY_API_KEY not found");
    process.exit(1);
  }

  console.log("🔍 Inspecting Effect Patterns in Supermemory\n");

  const client = new Supermemory({ apiKey });

  try {
    let allPatterns: any[] = [];
    let page = 1;
    const maxPages = 100; // Safety limit

    console.log("📋 Fetching all pages...\n");

    while (page <= maxPages) {
      const response = await client.memories.list({
        page,
        limit: 50,
      });

      if (!response || !response.memories || response.memories.length === 0) {
        break;
      }

      console.log(`   Page ${page}: ${response.memories.length} memories`);

      // Filter for patterns
      for (const memory of response.memories) {
        try {
          let parsed = null;
          const memField = (memory as any).memory;
          if (typeof memField === "string") {
            parsed = JSON.parse(memField);
          } else if (memField && typeof memField === "object") {
            parsed = memField;
          }

          const type = parsed?.type || (memory.metadata as any)?.type;

          if (type === "effect_pattern") {
            const metadata = (memory.metadata as any) || {};
            allPatterns.push({
              memoryId: memory.id,
              patternId: parsed?.patternId,
              title: parsed?.title,
              skillLevel: parsed?.skillLevel,
              tags: parsed?.tags,
              userId: parsed?.userId || metadata?.userId,
              projectId: metadata?.projectId,
              hasContent: !!parsed?.content,
              timestamp: parsed?.timestamp,
            });
          }
        } catch (error) {
          // Skip parse errors
        }
      }

      // Check if there are more pages
      const pagination = (response.pagination as any) || {};
      if (!pagination || page >= (pagination.totalPages || 1)) {
        break;
      }

      page++;
    }

    console.log(`\n✅ Found ${allPatterns.length} total Effect Patterns\n`);

    // Show detailed breakdown
    console.log("📊 Pattern Details:\n");

    // Group by project
    const byProject = new Map<string, any[]>();
    for (const p of allPatterns) {
      const projectId = p.projectId || "no-project";
      if (!byProject.has(projectId)) {
        byProject.set(projectId, []);
      }
      byProject.get(projectId)!.push(p);
    }

    console.log("🗂️  By Project:");
    for (const [projectId, patterns] of byProject.entries()) {
      console.log(`   • ${projectId}: ${patterns.length} patterns`);
    }

    // Group by userId
    const byUser = new Map<string, any[]>();
    for (const p of allPatterns) {
      const userId = p.userId || "no-user";
      if (!byUser.has(userId)) {
        byUser.set(userId, []);
      }
      byUser.get(userId)!.push(p);
    }

    console.log("\n👤 By User ID:");
    for (const [userId, patterns] of byUser.entries()) {
      console.log(`   • ${userId}: ${patterns.length} patterns`);
    }

    // Group by skill level
    const bySkill = new Map<string, any[]>();
    for (const p of allPatterns) {
      const skill = p.skillLevel || "unknown";
      if (!bySkill.has(skill)) {
        bySkill.set(skill, []);
      }
      bySkill.get(skill)!.push(p);
    }

    console.log("\n📈 By Skill Level:");
    for (const [skill, patterns] of bySkill.entries()) {
      console.log(`   • ${skill}: ${patterns.length} patterns`);
    }

    // Show sample patterns
    console.log("\n🎯 Sample Patterns (first 10):\n");
    allPatterns.slice(0, 10).forEach((p, i) => {
      console.log(`[${i + 1}] ${p.patternId || p.memoryId}`);
      console.log(`    Title: ${p.title || "N/A"}`);
      console.log(`    Skill: ${p.skillLevel || "N/A"}`);
      console.log(`    User: ${p.userId || "N/A"}`);
      console.log(`    Project: ${p.projectId || "N/A"}`);
      console.log(`    Has Content: ${p.hasContent ? "Yes" : "No"}`);
      console.log("");
    });

    // Check if patterns have proper structure
    const withPatternId = allPatterns.filter((p) => p.patternId).length;
    const withTitle = allPatterns.filter((p) => p.title).length;
    const withUserId = allPatterns.filter((p) => p.userId).length;
    const withProjectId = allPatterns.filter((p) => p.projectId).length;
    const withContent = allPatterns.filter((p) => p.hasContent).length;

    console.log("✅ Structure Validation:");
    console.log(`   • With patternId: ${withPatternId}/${allPatterns.length}`);
    console.log(`   • With title: ${withTitle}/${allPatterns.length}`);
    console.log(`   • With userId: ${withUserId}/${allPatterns.length}`);
    console.log(`   • With projectId: ${withProjectId}/${allPatterns.length}`);
    console.log(`   • With content: ${withContent}/${allPatterns.length}`);

    // Test searching for a specific pattern
    console.log("\n🔎 Testing search for patterns...\n");

    const testQueries = ["retry", "error", "effect", "layer"];

    for (const query of testQueries) {
      try {
        const results = await client.search.memories({
          q: query,
          limit: 10,
        });

        const count = results.results?.length || 0;
        const patternCount = results.results?.filter((r: any) => {
          try {
            const memField = r.memory;
            const parsed = typeof memField === "string" ? JSON.parse(memField) : memField;
            return parsed?.type === "effect_pattern";
          } catch {
            return false;
          }
        }).length || 0;

        console.log(`   "${query}": ${count} results (${patternCount} patterns)`);
      } catch (error) {
        console.log(`   "${query}": Error`);
      }
    }

    console.log("\n📝 Summary:\n");

    if (allPatterns.length > 0) {
      console.log("✅ Effect Patterns ARE stored in Supermemory");
      console.log(`   Total: ${allPatterns.length} patterns`);
      console.log(`   Projects: ${Array.from(byProject.keys()).join(", ")}`);
      console.log(`   Users: ${Array.from(byUser.keys()).join(", ")}`);

      if (withPatternId === allPatterns.length && withTitle === allPatterns.length) {
        console.log("\n✅ All patterns have required fields");
      } else {
        console.log("\n⚠️  Some patterns are missing required fields");
      }

      const effectPatternsProject = byProject.get("effect-patterns");
      if (effectPatternsProject && effectPatternsProject.length > 0) {
        console.log(`\n✅ "effect-patterns" project exists with ${effectPatternsProject.length} patterns`);
      } else {
        console.log('\n⚠️  "effect-patterns" project ID not found in patterns');
      }
    } else {
      console.log("❌ No Effect Patterns found in Supermemory");
      console.log("   Run: npm run seed-patterns to populate");
    }

  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
    }
    process.exit(1);
  }
}

inspectPatterns().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
