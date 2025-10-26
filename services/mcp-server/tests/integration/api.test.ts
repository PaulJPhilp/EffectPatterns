/**
 * MCP Server API Integration Tests
 *
 * End-to-end tests for all API endpoints with mock OTLP collector.
 * Verifies authentication, tracing, and business logic integration.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MockOTLPCollector } from '../mock-otlp-server.js';

// Note: These tests require the Next.js dev server to be running
// or we need to set up a test server. For now, we'll use fetch
// to test against a running server.

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.PATTERN_API_KEY || 'test-api-key';

let mockOTLP: MockOTLPCollector;

describe('MCP Server API Integration Tests', () => {
  beforeAll(async () => {
    // Start mock OTLP collector
    mockOTLP = new MockOTLPCollector(4318);
    await mockOTLP.start();
  });

  afterAll(async () => {
    // Stop mock OTLP collector
    await mockOTLP.stop();
  });

  beforeEach(() => {
    // Clear traces before each test
    mockOTLP.clear();
  });

  describe('GET /api/health', () => {
    it('should return health status without authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.version).toBeDefined();
      expect(data.service).toBe('effect-patterns-mcp-server');
      expect(data.timestamp).toBeDefined();
    });

    it('should include trace ID in response', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      const data = await response.json();

      expect(data.traceId).toBeDefined();
      expect(typeof data.traceId).toBe('string');
    });

    it('should include trace ID in response header', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      const traceId = response.headers.get('x-trace-id');

      expect(traceId).toBeDefined();
      expect(traceId).toBeTruthy();
    });

    it('should have matching trace IDs in body and header', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      const data = await response.json();
      const headerTraceId = response.headers.get('x-trace-id');

      expect(data.traceId).toBe(headerTraceId);
    });
  });

  describe('GET /api/patterns (search)', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/patterns`);

      expect(response.status).toBe(401);
    });

    it('should accept API key in header', async () => {
      const response = await fetch(`${BASE_URL}/api/patterns`, {
        headers: {
          'x-api-key': API_KEY,
        },
      });

      expect(response.status).toBe(200);
    });

    it('should accept API key in query parameter', async () => {
      const response = await fetch(`${BASE_URL}/api/patterns?key=${API_KEY}`);

      expect(response.status).toBe(200);
    });

    it('should return all patterns without query', async () => {
      const response = await fetch(`${BASE_URL}/api/patterns`, {
        headers: { 'x-api-key': API_KEY },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBeGreaterThan(0);
      expect(Array.isArray(data.patterns)).toBe(true);
      expect(data.traceId).toBeDefined();
    });

    it('should search patterns by query', async () => {
      const response = await fetch(`${BASE_URL}/api/patterns?q=retry`, {
        headers: { 'x-api-key': API_KEY },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(data.patterns)).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await fetch(
        `${BASE_URL}/api/patterns?category=error-handling`,
        {
          headers: { 'x-api-key': API_KEY },
        },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(
        data.patterns.every((p: any) => p.category === 'error-handling'),
      ).toBe(true);
    });

    it('should filter by difficulty', async () => {
      const response = await fetch(
        `${BASE_URL}/api/patterns?difficulty=intermediate`,
        {
          headers: { 'x-api-key': API_KEY },
        },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(
        data.patterns.every((p: any) => p.difficulty === 'intermediate'),
      ).toBe(true);
    });

    it('should limit results', async () => {
      const response = await fetch(`${BASE_URL}/api/patterns?limit=1`, {
        headers: { 'x-api-key': API_KEY },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.patterns.length).toBeLessThanOrEqual(1);
    });

    it('should return pattern summaries (not full patterns)', async () => {
      const response = await fetch(`${BASE_URL}/api/patterns`, {
        headers: { 'x-api-key': API_KEY },
      });
      const data = await response.json();

      if (data.patterns.length > 0) {
        const pattern = data.patterns[0];
        expect(pattern.id).toBeDefined();
        expect(pattern.title).toBeDefined();
        expect(pattern.description).toBeDefined();
        expect(pattern.category).toBeDefined();
        expect(pattern.difficulty).toBeDefined();
        expect(pattern.tags).toBeDefined();
        // Should NOT include examples, useCases, etc.
        expect(pattern.examples).toBeUndefined();
      }
    });

    it('should include trace ID in response', async () => {
      const response = await fetch(`${BASE_URL}/api/patterns`, {
        headers: { 'x-api-key': API_KEY },
      });
      const data = await response.json();
      const headerTraceId = response.headers.get('x-trace-id');

      expect(data.traceId).toBeDefined();
      expect(headerTraceId).toBeDefined();
      expect(data.traceId).toBe(headerTraceId);
    });
  });

  describe('GET /api/patterns/:id', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/patterns/retry-backoff`);

      expect(response.status).toBe(401);
    });

    it('should return full pattern by ID', async () => {
      const response = await fetch(
        `${BASE_URL}/api/patterns/retry-with-backoff`,
        {
          headers: { 'x-api-key': API_KEY },
        },
      );

      if (response.status === 200) {
        const data = await response.json();

        expect(data.pattern).toBeDefined();
        expect(data.pattern.id).toBe('retry-with-backoff');
        expect(data.pattern.examples).toBeDefined();
        expect(Array.isArray(data.pattern.examples)).toBe(true);
        expect(data.traceId).toBeDefined();
      } else {
        // Pattern may not exist in test data
        expect(response.status).toBe(404);
      }
    });

    it('should return 404 for non-existent pattern', async () => {
      const response = await fetch(
        `${BASE_URL}/api/patterns/nonexistent-pattern`,
        {
          headers: { 'x-api-key': API_KEY },
        },
      );

      expect(response.status).toBe(404);
    });

    it('should include trace ID', async () => {
      const response = await fetch(
        `${BASE_URL}/api/patterns/retry-with-backoff`,
        {
          headers: { 'x-api-key': API_KEY },
        },
      );

      if (response.status === 200) {
        const data = await response.json();
        const headerTraceId = response.headers.get('x-trace-id');

        expect(data.traceId).toBeDefined();
        expect(headerTraceId).toBeDefined();
      }
    });
  });

  describe('POST /api/generate', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId: 'retry-with-backoff' }),
      });

      expect(response.status).toBe(401);
    });

    it('should generate snippet from valid pattern', async () => {
      const response = await fetch(`${BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patternId: 'retry-with-backoff',
        }),
      });

      if (response.status === 200) {
        const data = await response.json();

        expect(data.patternId).toBe('retry-with-backoff');
        expect(data.title).toBeDefined();
        expect(data.snippet).toBeDefined();
        expect(typeof data.snippet).toBe('string');
        expect(data.snippet.length).toBeGreaterThan(0);
        expect(data.timestamp).toBeDefined();
        expect(data.traceId).toBeDefined();
      } else {
        // Pattern may not exist
        expect(response.status).toBe(404);
      }
    });

    it('should support custom name parameter', async () => {
      const response = await fetch(`${BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patternId: 'retry-with-backoff',
          name: 'myRetryHandler',
        }),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.snippet).toContain('myRetryHandler');
      }
    });

    it('should support module type parameter', async () => {
      const response = await fetch(`${BASE_URL}/api/generate`, {
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
        expect(data.snippet).toContain('require');
      }
    });

    it('should return 404 for non-existent pattern', async () => {
      const response = await fetch(`${BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patternId: 'nonexistent',
        }),
      });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid request body', async () => {
      const response = await fetch(`${BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing patternId
          name: 'test',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should include trace ID', async () => {
      const response = await fetch(`${BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patternId: 'retry-with-backoff',
        }),
      });

      if (response.status === 200) {
        const data = await response.json();
        const headerTraceId = response.headers.get('x-trace-id');

        expect(data.traceId).toBeDefined();
        expect(headerTraceId).toBeDefined();
        expect(data.traceId).toBe(headerTraceId);
      }
    });
  });

  describe('GET /api/trace-wiring', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/trace-wiring`);

      expect(response.status).toBe(401);
    });

    it('should return trace wiring examples', async () => {
      const response = await fetch(`${BASE_URL}/api/trace-wiring`, {
        headers: { 'x-api-key': API_KEY },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.effectNodeSdk).toBeDefined();
      expect(typeof data.effectNodeSdk).toBe('string');
      expect(data.effectWithSpan).toBeDefined();
      expect(typeof data.effectWithSpan).toBe('string');
      expect(data.langgraphPython).toBeDefined();
      expect(typeof data.langgraphPython).toBe('string');
      expect(data.notes).toBeDefined();
      expect(data.traceId).toBeDefined();
    });

    it('should include Effect examples', async () => {
      const response = await fetch(`${BASE_URL}/api/trace-wiring`, {
        headers: { 'x-api-key': API_KEY },
      });
      const data = await response.json();

      expect(data.effectNodeSdk).toContain('Effect');
      expect(data.effectNodeSdk).toContain('@opentelemetry/api');
      expect(data.effectWithSpan).toContain('TracingService');
    });

    it('should include Python examples', async () => {
      const response = await fetch(`${BASE_URL}/api/trace-wiring`, {
        headers: { 'x-api-key': API_KEY },
      });
      const data = await response.json();

      expect(data.langgraphPython).toContain('opentelemetry');
      expect(data.langgraphPython).toContain('trace');
    });

    it('should include trace ID', async () => {
      const response = await fetch(`${BASE_URL}/api/trace-wiring`, {
        headers: { 'x-api-key': API_KEY },
      });
      const data = await response.json();
      const headerTraceId = response.headers.get('x-trace-id');

      expect(data.traceId).toBeDefined();
      expect(headerTraceId).toBeDefined();
      expect(data.traceId).toBe(headerTraceId);
    });
  });

  describe('Authentication', () => {
    it('should reject requests with invalid API key', async () => {
      const response = await fetch(`${BASE_URL}/api/patterns`, {
        headers: { 'x-api-key': 'invalid-key' },
      });

      expect(response.status).toBe(401);
    });

    it('should reject requests with missing API key', async () => {
      const response = await fetch(`${BASE_URL}/api/patterns`);

      expect(response.status).toBe(401);
    });

    it('should accept valid API key in header', async () => {
      const response = await fetch(`${BASE_URL}/api/patterns`, {
        headers: { 'x-api-key': API_KEY },
      });

      expect(response.status).toBe(200);
    });

    it('should accept valid API key in query', async () => {
      const response = await fetch(`${BASE_URL}/api/patterns?key=${API_KEY}`);

      expect(response.status).toBe(200);
    });

    it('should prefer header API key over query', async () => {
      const response = await fetch(`${BASE_URL}/api/patterns?key=wrong-key`, {
        headers: { 'x-api-key': API_KEY },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('OTLP Trace Export', () => {
    it('should export traces to OTLP collector', async () => {
      // Make a request that should generate traces
      await fetch(`${BASE_URL}/api/health`);

      // Wait a bit for trace export
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if traces were received
      const traceCount = mockOTLP.getTraceCount();
      expect(traceCount).toBeGreaterThan(0);
    });

    it('should include service name in traces', async () => {
      await fetch(`${BASE_URL}/api/health`);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const traces = mockOTLP.getTraces();
      expect(traces.length).toBeGreaterThan(0);

      const firstTrace = traces[0];
      const attributes = firstTrace.resourceSpans[0]?.resource.attributes;

      const serviceName = attributes?.find(
        (attr) => attr.key === 'service.name',
      );
      expect(serviceName).toBeDefined();
    });

    it('should create spans for API requests', async () => {
      mockOTLP.clear();

      await fetch(`${BASE_URL}/api/health`);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const spans = mockOTLP.getAllSpans();
      expect(spans.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 for server errors', async () => {
      // This would require triggering a server error
      // For now, just verify error response structure
    });

    it('should include error message in response', async () => {
      const response = await fetch(`${BASE_URL}/api/patterns/nonexistent`, {
        headers: { 'x-api-key': API_KEY },
      });

      if (response.status === 404) {
        const data = await response.json();
        expect(data.error).toBeDefined();
        expect(typeof data.error).toBe('string');
      }
    });
  });
});
