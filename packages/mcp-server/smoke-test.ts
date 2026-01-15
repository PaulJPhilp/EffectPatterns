/**
 * Smoke Test Suite for Effect Patterns MCP Server
 *
 * TypeScript-based smoke tests using Node.js fetch API
 *
 * Usage:
 *   bun run smoke-test.ts <BASE_URL> <API_KEY>
 *
 * Example:
 *   bun run smoke-test.ts https://effect-patterns-mcp-server.vercel.app staging-key
 */

const BASE_URL = process.argv[2] || "http://localhost:3000";
const API_KEY = process.argv[3] || "test-api-key";

// Remove trailing slash
const baseUrl = BASE_URL.replace(/\/$/, "");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

// Test results
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

// Helper functions
function printHeader(text: string) {
  console.log(`\n${colors.blue}${"=".repeat(50)}${colors.reset}`);
  console.log(`${colors.blue}${text}${colors.reset}`);
  console.log(`${colors.blue}${"=".repeat(50)}${colors.reset}\n`);
}

function printTest(text: string) {
  console.log(`${colors.yellow}TEST: ${text}${colors.reset}`);
}

function printSuccess(text: string) {
  console.log(`${colors.green}✓ ${text}${colors.reset}`);
}

function printError(text: string) {
  console.log(`${colors.red}✗ ${text}${colors.reset}`);
}

function printInfo(text: string) {
  console.log(`${colors.blue}ℹ ${text}${colors.reset}`);
}

// Test runner
async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  testsRun++;
  printTest(name);

  try {
    await testFn();
    printSuccess("Passed");
    testsPassed++;
  } catch (error) {
    printError(
      `Failed: ${error instanceof Error ? error.message : String(error)}`
    );
    testsFailed++;
  }
}

// Assertion helpers
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertContains(haystack: string, needle: string, message?: string) {
  if (!haystack.includes(needle)) {
    throw new Error(message || `Expected string to contain "${needle}"`);
  }
}

function assertNotNull<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value == null) {
    throw new Error(message || "Expected value to not be null or undefined");
  }
}

// Main test suite
async function runSmokeTests() {
  printHeader("Effect Patterns MCP Server - Smoke Tests");
  printInfo(`Base URL: ${baseUrl}`);
  printInfo(`API Key: ${API_KEY.substring(0, 10)}...`);

  // Test 1: Health Check (No Auth)
  await runTest("Health check endpoint (no auth required)", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    assertEquals(response.status, 200);

    const data: any = await response.json();
    assertEquals(data.ok, true);
    assertEquals(data.service, "effect-patterns-mcp-server");
    assertNotNull(data.version);
    assertNotNull(data.traceId);
  });

  // Test 2: Health Check Trace ID in Header
  await runTest("Health check includes trace ID in header", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const traceId = response.headers.get("x-trace-id");
    assertNotNull(traceId);
    assert(traceId.length > 0, "Trace ID should not be empty");
  });

  // Test 3: Patterns Requires Auth
  await runTest("Patterns endpoint requires authentication", async () => {
    const response = await fetch(`${baseUrl}/api/patterns`);
    assertEquals(response.status, 401);
  });

  // Test 4: Patterns Rejects Invalid Key
  await runTest("Patterns endpoint rejects invalid API key", async () => {
    const response = await fetch(`${baseUrl}/api/patterns`, {
      headers: { "x-api-key": "invalid-key" },
    });
    assertEquals(response.status, 401);
  });

  // Test 5: Patterns with Valid Key (Header)
  await runTest(
    "Patterns endpoint accepts valid API key (header)",
    async () => {
      const response = await fetch(`${baseUrl}/api/patterns`, {
        headers: { "x-api-key": API_KEY },
      });
      assertEquals(response.status, 200);

      const data: any = await response.json();
      assertNotNull(data.patterns);
      assert(Array.isArray(data.patterns), "Patterns should be an array");
      assert(data.patterns.length > 0, "Should return at least one pattern");
      assertNotNull(data.count);
      assertNotNull(data.traceId);
    }
  );

  // Test 6: Patterns with Valid Key (Query)
  await runTest("Patterns endpoint accepts valid API key (query)", async () => {
    const response = await fetch(`${baseUrl}/api/patterns?key=${API_KEY}`);
    assertEquals(response.status, 200);

    const data: any = await response.json();
    assertNotNull(data.patterns);
    assert(data.count > 0, "Count should be greater than 0");
  });

  // Test 7: Patterns Search Query
  await runTest("Patterns endpoint supports search query", async () => {
    const response = await fetch(`${baseUrl}/api/patterns?q=retry`, {
      headers: { "x-api-key": API_KEY },
    });
    assertEquals(response.status, 200);

    const data: any = await response.json();
    assertNotNull(data.patterns);
  });

  // Test 8: Patterns Category Filter
  await runTest("Patterns endpoint supports category filter", async () => {
    const response = await fetch(
      `${baseUrl}/api/patterns?category=error-handling`,
      {
        headers: { "x-api-key": API_KEY },
      }
    );
    assertEquals(response.status, 200);

    const data: any = await response.json();
    assertNotNull(data.patterns);

    // All patterns should match category
    if (data.patterns.length > 0) {
      for (const pattern of data.patterns) {
        assertEquals(
          pattern.category,
          "error-handling",
          "All patterns should match category filter"
        );
      }
    }
  });

  // Test 9: Patterns Limit
  await runTest("Patterns endpoint respects limit parameter", async () => {
    const response = await fetch(`${baseUrl}/api/patterns?limit=1`, {
      headers: { "x-api-key": API_KEY },
    });
    assertEquals(response.status, 200);

    const data: any = await response.json();
    assert(data.patterns.length <= 1, "Should return at most 1 pattern");
  });

  // Test 10: Get Pattern by ID Requires Auth
  await runTest("Get pattern by ID requires authentication", async () => {
    const response = await fetch(`${baseUrl}/api/patterns/retry-with-backoff`);
    assertEquals(response.status, 401);
  });

  // Test 11: Get Non-existent Pattern
  await runTest("Get non-existent pattern returns 404", async () => {
    const response = await fetch(
      `${baseUrl}/api/patterns/nonexistent-pattern-id`,
      {
        headers: { "x-api-key": API_KEY },
      }
    );
    assertEquals(response.status, 404);

    const data: any = await response.json();
    assertNotNull(data.error);
  });

  // Test 12: Generate Requires Auth
  await runTest("Generate endpoint requires authentication", async () => {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patternId: "retry-with-backoff" }),
    });
    assertEquals(response.status, 401);
  });

  // Test 13: Generate Snippet
  await runTest("Generate snippet from pattern", async () => {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ patternId: "retry-with-backoff" }),
    });

    // Accept either 200 (pattern exists) or 404 (pattern doesn't exist)
    assert(
      response.status === 200 || response.status === 404,
      `Expected 200 or 404, got ${response.status}`
    );

    if (response.status === 200) {
      const data: any = await response.json();
      assertNotNull(data.snippet);
      assertNotNull(data.traceId);
      assertEquals(data.patternId, "retry-with-backoff");
    }
  });

  // Test 14: Generate with Custom Name
  await runTest("Generate snippet with custom name", async () => {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patternId: "retry-with-backoff",
        name: "myRetry",
      }),
    });

    if (response.status === 200) {
      const data: any = await response.json();
      assertContains(data.snippet, "myRetry");
    } else {
      assertEquals(response.status, 404); // Pattern doesn't exist
    }
  });

  // Test 15: Generate with CJS Module Type
  await runTest("Generate snippet with CJS module type", async () => {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patternId: "retry-with-backoff",
        moduleType: "cjs",
      }),
    });

    if (response.status === 200) {
      const data: any = await response.json();
      assertContains(data.snippet, "require");
    } else {
      assertEquals(response.status, 404);
    }
  });

  // Test 16: Generate Invalid Request
  await runTest("Generate endpoint validates request body", async () => {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "test" }), // Missing patternId
    });
    assertEquals(response.status, 400);

    const data: any = await response.json();
    assertNotNull(data.error);
  });

  // Test 17: Trace Wiring Requires Auth
  await runTest("Trace wiring endpoint requires authentication", async () => {
    const response = await fetch(`${baseUrl}/api/trace-wiring`);
    assertEquals(response.status, 401);
  });

  // Test 18: Trace Wiring Returns Examples
  await runTest("Trace wiring endpoint returns examples", async () => {
    const response = await fetch(`${baseUrl}/api/trace-wiring`, {
      headers: { "x-api-key": API_KEY },
    });
    assertEquals(response.status, 200);

    const data: any = await response.json();
    assertNotNull(data.effectNodeSdk);
    assertNotNull(data.effectWithSpan);
    assertNotNull(data.langgraphPython);
    assertNotNull(data.notes);
    assertNotNull(data.traceId);
  });

  // Test 19: Trace Wiring Contains Effect Example
  await runTest("Trace wiring includes Effect.js example", async () => {
    const response = await fetch(`${baseUrl}/api/trace-wiring`, {
      headers: { "x-api-key": API_KEY },
    });
    const data: any = await response.json();
    assertContains(data.effectNodeSdk, "Effect");
    assertContains(data.effectNodeSdk, "@opentelemetry/api");
  });

  // Test 20: Response Time Check
  await runTest("Response time check (< 3 seconds)", async () => {
    const startTime = Date.now();
    await fetch(`${baseUrl}/api/patterns`, {
      headers: { "x-api-key": API_KEY },
    });
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000;

    assert(
      responseTime < 3,
      `Response time too slow: ${responseTime.toFixed(2)}s`
    );
    printInfo(`Response time: ${responseTime.toFixed(2)}s`);
  });

  // Test 21: Trace ID Consistency
  await runTest("Trace ID in body matches header", async () => {
    const response = await fetch(`${baseUrl}/api/patterns`, {
      headers: { "x-api-key": API_KEY },
    });
    const data: any = await response.json();
    const headerTraceId = response.headers.get("x-trace-id");

    assertEquals(
      data.traceId,
      headerTraceId,
      "Trace ID in body should match header"
    );
  });

  // Test 22: Analyze Code Requires Auth
  await runTest("Analyze code endpoint requires authentication", async () => {
    const response = await fetch(`${baseUrl}/api/analyze-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "const x = 1;" }),
    });
    assertEquals(response.status, 401);
  });

  // Test 23: Analyze Code
  await runTest("Analyze code endpoint analyzes TypeScript", async () => {
    const response = await fetch(`${baseUrl}/api/analyze-code`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: 'import { readFile } from "node:fs/promises"; const x = 1;',
        filename: "example.ts",
        analysisType: "all",
      }),
    });
    assertEquals(response.status, 200);

    const data: any = await response.json();
    assertNotNull(data.suggestions, "suggestions should not be null");
    assert(Array.isArray(data.suggestions), "suggestions should be an array");
    assertNotNull(data.traceId, "traceId should not be null");
    assertNotNull(data.timestamp, "timestamp should not be null");
  });

  // Test 24: Generate Pattern Requires Auth
  await runTest("Generate pattern endpoint requires authentication", async () => {
    const response = await fetch(`${baseUrl}/api/generate-pattern`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patternId: "validation-filter-or-fail",
        variables: { Name: "FilePath", paramName: "path", paramType: "string", shortName: "p", condition: "p.length > 0", errorMessage: "Path cannot be empty" },
      }),
    });
    assertEquals(response.status, 401);
  });

  // Test 25: Generate Pattern
  await runTest("Generate pattern endpoint generates code", async () => {
    const response = await fetch(`${baseUrl}/api/generate-pattern`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patternId: "validation-filter-or-fail",
        variables: { Name: "FilePath", paramName: "path", paramType: "string", shortName: "p", condition: "p.length > 0", errorMessage: "Path cannot be empty" },
      }),
    });
    assertEquals(response.status, 200);

    const data: any = await response.json();
    assertEquals(data.patternId, "validation-filter-or-fail");
    assertNotNull(data.name, "name should not be null");
    assertNotNull(data.code, "code should not be null");
    assert(Array.isArray(data.imports), "imports should be an array");
    assertContains(data.code, "validateFilePath");
    assertContains(data.code, "Effect.filterOrFail");
    assertNotNull(data.traceId, "traceId should not be null");
    assertNotNull(data.timestamp, "timestamp should not be null");
  });

  // Test 26: Analyze Consistency Requires Auth
  await runTest("Analyze consistency endpoint requires authentication", async () => {
    const response = await fetch(`${baseUrl}/api/analyze-consistency`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: [{ filename: "a.ts", source: "const x = 1;" }],
      }),
    });
    assertEquals(response.status, 401);
  });

  // Test 27: Analyze Consistency
  await runTest("Analyze consistency endpoint detects issues", async () => {
    const response = await fetch(`${baseUrl}/api/analyze-consistency`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: [
          { filename: "a.ts", source: 'import { readFile } from "node:fs/promises";' },
          { filename: "b.ts", source: 'import { FileSystem } from "@effect/platform";' },
        ],
      }),
    });
    assertEquals(response.status, 200);

    const data: any = await response.json();
    assertNotNull(data.issues, "issues should not be null");
    assert(Array.isArray(data.issues), "issues should be an array");
    assertNotNull(data.traceId, "traceId should not be null");
    assertNotNull(data.timestamp, "timestamp should not be null");
  });

  // Test 28: Apply Refactoring Requires Auth
  await runTest("Apply refactoring endpoint requires authentication", async () => {
    const response = await fetch(`${baseUrl}/api/apply-refactoring`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refactoringId: "replace-node-fs",
        files: [{ filename: "a.ts", source: 'import { readFile } from "node:fs/promises";' }],
      }),
    });
    assertEquals(response.status, 401);
  });

  // Test 29: Apply Refactoring (Preview)
  await runTest("Apply refactoring endpoint returns preview (preview-only)", async () => {
    const response = await fetch(`${baseUrl}/api/apply-refactoring`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refactoringId: "replace-node-fs",
        files: [{ filename: "a.ts", source: 'import { readFile } from "node:fs/promises";' }],
        preview: true,
      }),
    });
    assertEquals(response.status, 200);

    const data: any = await response.json();
    assertEquals(data.applied, false, "Should be preview-only");
    assertNotNull(data.changes, "changes should not be null");
    assert(Array.isArray(data.changes), "changes should be an array");
    if (data.changes.length > 0) {
      const change = data.changes[0];
      assertEquals(change.filename, "a.ts");
      assertContains(change.before, 'from "node:fs/promises"');
      assertContains(change.after, 'from "@effect/platform"');
    }
    assertNotNull(data.traceId, "traceId should not be null");
    assertNotNull(data.timestamp, "timestamp should not be null");
  });

  // Test 30: Review Code Requires Auth
  await runTest("Review code endpoint requires authentication", async () => {
    const response = await fetch(`${baseUrl}/api/review-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "const x: any = 1;",
        filePath: "test.ts",
      }),
    });
    assertEquals(response.status, 401);
  });

  // Test 31: Review Code Returns Top 3 Recommendations
  await runTest("Review code returns top 3 recommendations with Markdown", async () => {
    const response = await fetch(`${baseUrl}/api/review-code`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: "const a: any = 1;\nconst b: any = 2;\nconst c: any = 3;\nconst d: any = 4;",
        filePath: "test.ts",
      }),
    });
    assertEquals(response.status, 200);

    const data: any = await response.json();
    assertNotNull(data.recommendations, "recommendations should not be null");
    assert(Array.isArray(data.recommendations), "recommendations should be an array");
    assert(data.recommendations.length <= 3, "Should return max 3 recommendations");

    if (data.recommendations.length > 0) {
      const rec = data.recommendations[0];
      assertNotNull(rec.severity, "severity should not be null");
      assertNotNull(rec.title, "title should not be null");
      assertNotNull(rec.line, "line should not be null");
      assertNotNull(rec.message, "message should not be null");
    }

    assertNotNull(data.meta, "meta should not be null");
    assertNotNull(data.meta.totalFound, "totalFound should not be null");
    assertNotNull(data.meta.hiddenCount, "hiddenCount should not be null");

    assertNotNull(data.markdown, "markdown should not be null");
    assertContains(data.markdown, "# Code Review Results");

    assertNotNull(data.traceId, "traceId should not be null");
    assertNotNull(data.timestamp, "timestamp should not be null");
  });

  // Test 32: Review Code Rejects Large Files
  await runTest("Review code rejects files larger than 100KB", async () => {
    const largeCode = "x".repeat(101 * 1024);
    const response = await fetch(`${baseUrl}/api/review-code`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: largeCode,
        filePath: "test.ts",
      }),
    });
    assertEquals(response.status, 413);
  });

  // Test 33: Review Code Rejects Non-TypeScript Files
  await runTest("Review code rejects non-TypeScript files", async () => {
    const response = await fetch(`${baseUrl}/api/review-code`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: "const x = 1;",
        filePath: "test.js",
      }),
    });
    assertEquals(response.status, 400);
    const data: any = await response.json();
    assertContains(data.error, "TypeScript");
  });

  // Print summary
  printHeader("Test Summary");
  console.log(`Total Tests: ${testsRun}`);
  console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);

  if (testsFailed === 0) {
    console.log(`\n${colors.green}🎉 All smoke tests passed!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}❌ Some tests failed${colors.reset}\n`);
    process.exit(1);
  }
}

// Run the tests
runSmokeTests().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error}${colors.reset}`);
  process.exit(1);
});
