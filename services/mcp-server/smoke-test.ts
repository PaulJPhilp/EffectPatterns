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

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const API_KEY = process.argv[3] || 'test-api-key';

// Remove trailing slash
const baseUrl = BASE_URL.replace(/\/$/, '');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Test results
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

// Helper functions
function printHeader(text: string) {
  console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.blue}${text}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}\n`);
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
  testFn: () => Promise<void>,
): Promise<void> {
  testsRun++;
  printTest(name);

  try {
    await testFn();
    printSuccess('Passed');
    testsPassed++;
  } catch (error) {
    printError(
      `Failed: ${error instanceof Error ? error.message : String(error)}`,
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
  message?: string,
): asserts value is T {
  if (value == null) {
    throw new Error(message || 'Expected value to not be null or undefined');
  }
}

// Main test suite
async function runSmokeTests() {
  printHeader('Effect Patterns MCP Server - Smoke Tests');
  printInfo(`Base URL: ${baseUrl}`);
  printInfo(`API Key: ${API_KEY.substring(0, 10)}...`);

  // Test 1: Health Check (No Auth)
  await runTest('Health check endpoint (no auth required)', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    assertEquals(response.status, 200);

    const data = await response.json();
    assertEquals(data.ok, true);
    assertEquals(data.service, 'effect-patterns-mcp-server');
    assertNotNull(data.version);
    assertNotNull(data.traceId);
  });

  // Test 2: Health Check Trace ID in Header
  await runTest('Health check includes trace ID in header', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const traceId = response.headers.get('x-trace-id');
    assertNotNull(traceId);
    assert(traceId.length > 0, 'Trace ID should not be empty');
  });

  // Test 3: Patterns Requires Auth
  await runTest('Patterns endpoint requires authentication', async () => {
    const response = await fetch(`${baseUrl}/api/patterns`);
    assertEquals(response.status, 401);
  });

  // Test 4: Patterns Rejects Invalid Key
  await runTest('Patterns endpoint rejects invalid API key', async () => {
    const response = await fetch(`${baseUrl}/api/patterns`, {
      headers: { 'x-api-key': 'invalid-key' },
    });
    assertEquals(response.status, 401);
  });

  // Test 5: Patterns with Valid Key (Header)
  await runTest(
    'Patterns endpoint accepts valid API key (header)',
    async () => {
      const response = await fetch(`${baseUrl}/api/patterns`, {
        headers: { 'x-api-key': API_KEY },
      });
      assertEquals(response.status, 200);

      const data = await response.json();
      assertNotNull(data.patterns);
      assert(Array.isArray(data.patterns), 'Patterns should be an array');
      assert(data.patterns.length > 0, 'Should return at least one pattern');
      assertNotNull(data.count);
      assertNotNull(data.traceId);
    },
  );

  // Test 6: Patterns with Valid Key (Query)
  await runTest('Patterns endpoint accepts valid API key (query)', async () => {
    const response = await fetch(`${baseUrl}/api/patterns?key=${API_KEY}`);
    assertEquals(response.status, 200);

    const data = await response.json();
    assertNotNull(data.patterns);
    assert(data.count > 0, 'Count should be greater than 0');
  });

  // Test 7: Patterns Search Query
  await runTest('Patterns endpoint supports search query', async () => {
    const response = await fetch(`${baseUrl}/api/patterns?q=retry`, {
      headers: { 'x-api-key': API_KEY },
    });
    assertEquals(response.status, 200);

    const data = await response.json();
    assertNotNull(data.patterns);
  });

  // Test 8: Patterns Category Filter
  await runTest('Patterns endpoint supports category filter', async () => {
    const response = await fetch(
      `${baseUrl}/api/patterns?category=error-handling`,
      {
        headers: { 'x-api-key': API_KEY },
      },
    );
    assertEquals(response.status, 200);

    const data = await response.json();
    assertNotNull(data.patterns);

    // All patterns should match category
    if (data.patterns.length > 0) {
      for (const pattern of data.patterns) {
        assertEquals(
          pattern.category,
          'error-handling',
          'All patterns should match category filter',
        );
      }
    }
  });

  // Test 9: Patterns Limit
  await runTest('Patterns endpoint respects limit parameter', async () => {
    const response = await fetch(`${baseUrl}/api/patterns?limit=1`, {
      headers: { 'x-api-key': API_KEY },
    });
    assertEquals(response.status, 200);

    const data = await response.json();
    assert(data.patterns.length <= 1, 'Should return at most 1 pattern');
  });

  // Test 10: Get Pattern by ID Requires Auth
  await runTest('Get pattern by ID requires authentication', async () => {
    const response = await fetch(`${baseUrl}/api/patterns/retry-with-backoff`);
    assertEquals(response.status, 401);
  });

  // Test 11: Get Non-existent Pattern
  await runTest('Get non-existent pattern returns 404', async () => {
    const response = await fetch(
      `${baseUrl}/api/patterns/nonexistent-pattern-id`,
      {
        headers: { 'x-api-key': API_KEY },
      },
    );
    assertEquals(response.status, 404);

    const data = await response.json();
    assertNotNull(data.error);
  });

  // Test 12: Generate Requires Auth
  await runTest('Generate endpoint requires authentication', async () => {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patternId: 'retry-with-backoff' }),
    });
    assertEquals(response.status, 401);
  });

  // Test 13: Generate Snippet
  await runTest('Generate snippet from pattern', async () => {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ patternId: 'retry-with-backoff' }),
    });

    // Accept either 200 (pattern exists) or 404 (pattern doesn't exist)
    assert(
      response.status === 200 || response.status === 404,
      `Expected 200 or 404, got ${response.status}`,
    );

    if (response.status === 200) {
      const data = await response.json();
      assertNotNull(data.snippet);
      assertNotNull(data.traceId);
      assertEquals(data.patternId, 'retry-with-backoff');
    }
  });

  // Test 14: Generate with Custom Name
  await runTest('Generate snippet with custom name', async () => {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patternId: 'retry-with-backoff',
        name: 'myRetry',
      }),
    });

    if (response.status === 200) {
      const data = await response.json();
      assertContains(data.snippet, 'myRetry');
    } else {
      assertEquals(response.status, 404); // Pattern doesn't exist
    }
  });

  // Test 15: Generate with CJS Module Type
  await runTest('Generate snippet with CJS module type', async () => {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patternId: 'retry-with-backoff',
        moduleType: 'cjs',
      }),
    });

    if (response.status === 200) {
      const data = await response.json();
      assertContains(data.snippet, 'require');
    } else {
      assertEquals(response.status, 404);
    }
  });

  // Test 16: Generate Invalid Request
  await runTest('Generate endpoint validates request body', async () => {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'test' }), // Missing patternId
    });
    assertEquals(response.status, 400);

    const data = await response.json();
    assertNotNull(data.error);
  });

  // Test 17: Trace Wiring Requires Auth
  await runTest('Trace wiring endpoint requires authentication', async () => {
    const response = await fetch(`${baseUrl}/api/trace-wiring`);
    assertEquals(response.status, 401);
  });

  // Test 18: Trace Wiring Returns Examples
  await runTest('Trace wiring endpoint returns examples', async () => {
    const response = await fetch(`${baseUrl}/api/trace-wiring`, {
      headers: { 'x-api-key': API_KEY },
    });
    assertEquals(response.status, 200);

    const data = await response.json();
    assertNotNull(data.effectNodeSdk);
    assertNotNull(data.effectWithSpan);
    assertNotNull(data.langgraphPython);
    assertNotNull(data.notes);
    assertNotNull(data.traceId);
  });

  // Test 19: Trace Wiring Contains Effect Example
  await runTest('Trace wiring includes Effect.js example', async () => {
    const response = await fetch(`${baseUrl}/api/trace-wiring`, {
      headers: { 'x-api-key': API_KEY },
    });
    const data = await response.json();
    assertContains(data.effectNodeSdk, 'Effect');
    assertContains(data.effectNodeSdk, '@opentelemetry/api');
  });

  // Test 20: Response Time Check
  await runTest('Response time check (< 3 seconds)', async () => {
    const startTime = Date.now();
    await fetch(`${baseUrl}/api/patterns`, {
      headers: { 'x-api-key': API_KEY },
    });
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000;

    assert(
      responseTime < 3,
      `Response time too slow: ${responseTime.toFixed(2)}s`,
    );
    printInfo(`Response time: ${responseTime.toFixed(2)}s`);
  });

  // Test 21: Trace ID Consistency
  await runTest('Trace ID in body matches header', async () => {
    const response = await fetch(`${baseUrl}/api/patterns`, {
      headers: { 'x-api-key': API_KEY },
    });
    const data = await response.json();
    const headerTraceId = response.headers.get('x-trace-id');

    assertEquals(
      data.traceId,
      headerTraceId,
      'Trace ID in body should match header',
    );
  });

  // Print summary
  printHeader('Test Summary');
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
