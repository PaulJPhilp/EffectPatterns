/**
 * Test Supermemory Pagination Support
 *
 * This file tests whether Supermemory's search.memories() API supports
 * native pagination parameters like offset, skip, page, or cursor.
 *
 * Run with: npx ts-node test-supermemory-pagination.ts
 */

const Supermemory = require("supermemory").default;

async function testSupermemoryPagination() {
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  if (!apiKey) {
    console.error("SUPERMEMORY_API_KEY not set");
    process.exit(1);
  }

  const client = new Supermemory({ apiKey });

  console.log("🧪 Testing Supermemory Pagination Support\n");

  try {
    // Test 1: Basic search
    console.log("1️⃣  Test: Basic search with limit");
    const basicSearch = await client.search.memories({
      q: "conversation_embedding",
      limit: 10,
    });
    console.log(`   ✅ Works! Got ${basicSearch.results?.length || 0} results\n`);

    // Test 2: Search with offset
    console.log("2️⃣  Test: Search with offset parameter");
    try {
      const offsetSearch = await (client.search.memories as any)({
        q: "conversation_embedding",
        limit: 10,
        offset: 10,
      });
      console.log(`   ✅ offset parameter works! Got ${offsetSearch.results?.length || 0} results\n`);
    } catch (e: any) {
      console.log(`   ❌ offset parameter not supported: ${e.message}\n`);
    }

    // Test 3: Search with skip
    console.log("3️⃣  Test: Search with skip parameter");
    try {
      const skipSearch = await (client.search.memories as any)({
        q: "conversation_embedding",
        limit: 10,
        skip: 10,
      });
      console.log(`   ✅ skip parameter works! Got ${skipSearch.results?.length || 0} results\n`);
    } catch (e: any) {
      console.log(`   ❌ skip parameter not supported: ${e.message}\n`);
    }

    // Test 4: Search with page
    console.log("4️⃣  Test: Search with page parameter");
    try {
      const pageSearch = await (client.search.memories as any)({
        q: "conversation_embedding",
        limit: 10,
        page: 1,
      });
      console.log(`   ✅ page parameter works! Got ${pageSearch.results?.length || 0} results\n`);
    } catch (e: any) {
      console.log(`   ❌ page parameter not supported: ${e.message}\n`);
    }

    // Test 5: Search with cursor
    console.log("5️⃣  Test: Search with cursor parameter");
    try {
      const cursorSearch = await (client.search.memories as any)({
        q: "conversation_embedding",
        limit: 10,
        cursor: "0",
      });
      console.log(`   ✅ cursor parameter works! Got ${cursorSearch.results?.length || 0} results\n`);
    } catch (e: any) {
      console.log(`   ❌ cursor parameter not supported: ${e.message}\n`);
    }

    // Test 6: Check return type structure
    console.log("6️⃣  Test: Inspect response structure");
    const response = await client.search.memories({
      q: "conversation_embedding",
      limit: 5,
    });
    console.log("   Response keys:", Object.keys(response));
    if (response.results && response.results[0]) {
      console.log("   First result keys:", Object.keys(response.results[0]));
    }
    console.log();

    console.log("✅ Supermemory Pagination Test Complete!");
    console.log("\nSummary:");
    console.log("- If offset/skip/page/cursor work, we should update supermemory-store.ts");
    console.log("- If only limit works, our current implementation is optimal");
    console.log("- Check the results above to determine next steps");

  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testSupermemoryPagination();
