/**
 * Semantic Search - Test Examples
 *
 * These are example test queries you can use to verify semantic search works.
 * Run these in your browser console or create actual test conversations.
 */

/**
 * Example 1: Basic Search
 *
 * After creating conversations, test basic search queries
 */
async function example1_basicSearch() {
  console.log("📝 Example 1: Basic Search");

  const query = "error handling";
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
  const data = await response.json();

  console.log(`Query: "${query}"`);
  console.log(`Found ${data.count} results:`, data.results);
}

/**
 * Example 2: Semantic Matching (The Magic!)
 *
 * Query with different words but same meaning
 */
async function example2_semanticMatching() {
  console.log("📝 Example 2: Semantic Matching");

  // If you created a conversation about "error handling",
  // search for "exception handling" - semantically similar but different words
  const similarQueries = [
    "error handling",      // Original
    "exception handling",  // Synonym
    "how to catch errors", // Rephrased
    "error management",    // Related
  ];

  for (const query of similarQueries) {
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(query)}&limit=3`
    );
    const data = await response.json();
    console.log(`Query: "${query}" → ${data.count} results`);
  }
}

/**
 * Example 3: Filtering by Outcome
 *
 * Find only solved conversations
 */
async function example3_filterByOutcome() {
  console.log("📝 Example 3: Filter by Outcome");

  const outcomes = ["solved", "unsolved", "partial", "revisited"];

  for (const outcome of outcomes) {
    const response = await fetch(
      `/api/search?q=effect&outcome=${outcome}&limit=5`
    );
    const data = await response.json();
    console.log(`${outcome}: ${data.count} conversations`);
  }
}

/**
 * Example 4: Search by Tag
 *
 * Find all conversations tagged with specific topic
 */
async function example4_searchByTag() {
  console.log("📝 Example 4: Search by Tag");

  const tags = [
    "effect-ts",
    "error-handling",
    "concurrency",
    "validation",
    "typescript",
  ];

  for (const tag of tags) {
    const response = await fetch(
      `/api/search?tag=${encodeURIComponent(tag)}&limit=10`
    );
    const data = await response.json();
    console.log(`${tag}: ${data.count} conversations`);
  }
}

/**
 * Example 5: Similarity Threshold
 *
 * Strict vs. loose matching
 */
async function example5_similarityThreshold() {
  console.log("📝 Example 5: Similarity Threshold");

  const query = "async patterns";

  // Strict (high threshold)
  const strict = await fetch(
    `/api/search?q=${encodeURIComponent(query)}&minSimilarity=0.8`
  );
  const strictData = await strict.json();

  // Loose (low threshold)
  const loose = await fetch(
    `/api/search?q=${encodeURIComponent(query)}&minSimilarity=0.1`
  );
  const looseData = await loose.json();

  console.log(`Query: "${query}"`);
  console.log(`Strict (0.8): ${strictData.count} results`);
  console.log(`Loose (0.1): ${looseData.count} results`);
}

/**
 * Example 6: Inspect Score Breakdown
 *
 * See how each signal contributes to final score
 */
async function example6_scoreBreakdown() {
  console.log("📝 Example 6: Score Breakdown");

  const response = await fetch(`/api/search?q=effect&limit=1`);
  const data = await response.json();

  if (data.results.length > 0) {
    const result = data.results[0];
    console.log("Result:", result.metadata.chatId);
    console.log("Score breakdown:");
    console.log(
      `  • Semantic (60%): ${result.score.vector} = ${(parseFloat(result.score.vector) * 0.6).toFixed(3)}`
    );
    console.log(
      `  • Keyword (30%):  ${result.score.keyword} = ${(parseFloat(result.score.keyword) * 0.3).toFixed(3)}`
    );
    console.log(
      `  • Recency (7%):   ${result.score.recency} = ${(parseFloat(result.score.recency) * 0.07).toFixed(3)}`
    );
    console.log(
      `  • Satisfaction (3%): ${result.score.satisfaction} = ${(parseFloat(result.score.satisfaction) * 0.03).toFixed(3)}`
    );
    console.log(`  • Final Score: ${result.score.final}`);
  }
}

/**
 * Example 7: Performance Measurement
 *
 * Time different queries
 */
async function example7_performanceMeasurement() {
  console.log("📝 Example 7: Performance Measurement");

  // First query (includes embedding generation)
  console.time("First query (embedding generation)");
  await fetch(`/api/search?q=error`);
  console.timeEnd("First query (embedding generation)");
  // Expected: 500-2000ms

  // Same query (cached embedding)
  console.time("Same query (cached)");
  await fetch(`/api/search?q=error`);
  console.timeEnd("Same query (cached)");
  // Expected: 50-200ms

  // Similar query (new embedding)
  console.time("Similar query (new embedding)");
  await fetch(`/api/search?q=exception`);
  console.timeEnd("Similar query (new embedding)");
  // Expected: 500-2000ms
}

/**
 * Example 8: Error Handling
 *
 * Test various error conditions
 */
async function example8_errorHandling() {
  console.log("📝 Example 8: Error Handling");

  // Missing query
  console.log("Test 1: Missing query parameter");
  const test1 = await fetch(`/api/search`);
  console.log(`Status: ${test1.status}`, await test1.json());

  // Empty query
  console.log("Test 2: Empty query");
  const test2 = await fetch(`/api/search?q=`);
  console.log(`Status: ${test2.status}`, await test2.json());

  // Invalid limit
  console.log("Test 3: Invalid limit (will be clamped)");
  const test3 = await fetch(`/api/search?q=test&limit=999`);
  const data3 = await test3.json();
  console.log(`Requested 999, limited to: ${data3.limit}`);

  // Invalid outcome
  console.log("Test 4: Invalid outcome (ignored)");
  const test4 = await fetch(
    `/api/search?q=test&outcome=invalid&limit=5`
  );
  console.log(`Status: ${test4.status}`, await test4.json());
}

/**
 * Example 9: Batch Search
 *
 * Search multiple related queries
 */
async function example9_batchSearch() {
  console.log("📝 Example 9: Batch Search");

  const queries = [
    "error handling",
    "async patterns",
    "type safety",
    "testing",
    "performance optimization",
  ];

  const results = await Promise.all(
    queries.map(q =>
      fetch(`/api/search?q=${encodeURIComponent(q)}&limit=3`)
        .then(r => r.json())
    )
  );

  results.forEach((data, idx) => {
    console.log(`${queries[idx]}: ${data.count} results`);
  });
}

/**
 * Example 10: Export Results
 *
 * Get results in a format you can analyze
 */
async function example10_exportResults() {
  console.log("📝 Example 10: Export Results");

  const response = await fetch(`/api/search?q=effect&limit=10`);
  const data = await response.json();

  // Format as CSV
  const csv = [
    ["Chat ID", "Tags", "Outcome", "Score", "Similarity"],
    ...data.results.map((r: any) => [
      r.metadata.chatId,
      r.metadata.tags?.join(";") || "",
      r.metadata.outcome || "unknown",
      r.score.final,
      r.score.vector,
    ]),
  ]
    .map((row: any) => row.map((cell: any) => `"${cell}"`).join(","))
    .join("\n");

  console.log("CSV Export:");
  console.log(csv);

  // Or download as file
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "search-results.csv";
  // a.click(); // Uncomment to download
}

/**
 * Run All Examples
 */
export async function runAllExamples() {
  console.log("🚀 Running Semantic Search Examples\n");

  try {
    await example1_basicSearch();
    console.log();

    await example2_semanticMatching();
    console.log();

    await example3_filterByOutcome();
    console.log();

    await example4_searchByTag();
    console.log();

    await example5_similarityThreshold();
    console.log();

    await example6_scoreBreakdown();
    console.log();

    await example7_performanceMeasurement();
    console.log();

    await example8_errorHandling();
    console.log();

    await example9_batchSearch();
    console.log();

    await example10_exportResults();
    console.log();

    console.log("✅ All examples completed!");
  } catch (error) {
    console.error("❌ Error running examples:", error);
  }
}

/**
 * Quick Test Runner
 *
 * Run individual examples:
 * - example1_basicSearch()
 * - example2_semanticMatching()
 * - example6_scoreBreakdown()
 * - etc.
 *
 * Or run all:
 * - runAllExamples()
 */

// Usage in browser console:
// Copy and paste any of these into your browser console to test

const searchExamples = {
  example1_basicSearch,
  example2_semanticMatching,
  example3_filterByOutcome,
  example4_searchByTag,
  example5_similarityThreshold,
  example6_scoreBreakdown,
  example7_performanceMeasurement,
  example8_errorHandling,
  example9_batchSearch,
  example10_exportResults,
  runAllExamples,
};

export default searchExamples;
