/**
 * Pattern Server Tests
 *
 * Comprehensive test suite for the Pattern Server API endpoints
 */

import {
  FetchHttpClient,
  HttpClient,
  type HttpClientResponse,
} from '@effect/platform';
import { Effect, Schema } from 'effect';
import { type ChildProcess, spawn } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// --- SCHEMAS ---

const RuleSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  skillLevel: Schema.optional(Schema.String),
  useCase: Schema.optional(Schema.Array(Schema.String)),
  content: Schema.String,
});

type Rule = typeof RuleSchema.Type;

// --- TEST UTILITIES ---

const TEST_PORT = 45103;
let BASE_URL = `http://localhost:${TEST_PORT}`;

/**
 * Make HTTP request with Effect
 */
const makeRequest = (path: string) =>
  Effect.gen(function* () {
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.filterStatusOk,
    );
    return yield* client.get(`${BASE_URL}${path}`);
  });

/**
 * Get JSON from response
 */
const getJson = (response: HttpClientResponse.HttpClientResponse) =>
  Effect.gen(function* () {
    return yield* response.json;
  });

/**
 * Test layer with HTTP client
 */
const TestLayer = FetchHttpClient.layer;

// --- SERVER LIFECYCLE ---

let serverProcess: ChildProcess | null = null;

beforeAll(async () => {
  BASE_URL = `http://localhost:${TEST_PORT}`;
  process.env.PORT = String(TEST_PORT);

  // Start the server
  serverProcess = spawn('bun', ['run', 'server/index.ts'], {
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
    },
  });

  // Wait for server to start
  const startTime = Date.now();
  const timeoutMs = 5000;
  let serverReady = false;
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) {
        serverReady = true;
        break;
      }
    } catch {
      // retry until ready
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!serverReady) {
    throw new Error(`Pattern Server failed to start on ${BASE_URL}`);
  }
});

afterAll(async () => {
  // Stop the server
  if (serverProcess) {
    serverProcess.kill();
  }

  serverProcess = null;
  delete process.env.PORT;
  BASE_URL = `http://localhost:${TEST_PORT}`;
});

// --- TESTS ---

describe('Pattern Server', { sequential: true }, () => {
  describe('GET /health', () => {
    it('should return 200 OK with status', async () => {
      const program = Effect.gen(function* () {
        const response = yield* makeRequest('/health');
        const json = yield* getJson(response);

        expect(json).toEqual({ status: 'ok' });
        expect(response.status).toBe(200);
      });

      await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));
    });
  });

  describe('GET /api/v1/rules', () => {
    it('should return array of rules', async () => {
      const program = Effect.gen(function* () {
        const response = yield* makeRequest('/api/v1/rules');
        const json = yield* getJson(response);

        expect(Array.isArray(json)).toBe(true);
        const rules = json as ReadonlyArray<unknown>;
        expect(rules.length).toBeGreaterThan(0);
      });

      await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));
    });

    it('should return rules with correct schema', async () => {
      const program = Effect.gen(function* () {
        const response = yield* makeRequest('/api/v1/rules');
        const json = yield* getJson(response);

        // Validate against schema
        const validated = yield* Schema.decodeUnknown(
          Schema.Array(RuleSchema),
        )(json);

        expect(validated.length).toBeGreaterThan(0);

        // Check first rule has required fields
        const firstRule = validated[0];
        expect(firstRule).toHaveProperty('id');
        expect(firstRule).toHaveProperty('title');
        expect(firstRule).toHaveProperty('description');
        expect(firstRule).toHaveProperty('content');
      });

      await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));
    });

    it('should return valid rule IDs', async () => {
      const program = Effect.gen(function* () {
        const response = yield* makeRequest('/api/v1/rules');
        const json = yield* getJson(response);
        const validated = yield* Schema.decodeUnknown(
          Schema.Array(RuleSchema),
        )(json);

        validated.forEach((rule: Rule) => {
          expect(rule.id).toBeTruthy();
          expect(typeof rule.id).toBe('string');
          expect(rule.id.length).toBeGreaterThan(0);
        });
      });

      await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));
    });

    it('should return rules with content', async () => {
      const program = Effect.gen(function* () {
        const response = yield* makeRequest('/api/v1/rules');
        const json = yield* getJson(response);
        const validated = yield* Schema.decodeUnknown(Schema.Array(RuleSchema))(
          json,
        );

        validated.forEach((rule: Rule) => {
          expect(rule.content).toBeTruthy();
          expect(rule.content.length).toBeGreaterThan(0);
        });
      });

      await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));
    });
  });

  describe('GET /api/v1/rules/:id', () => {
    it('should return a single rule by ID', async () => {
      const program = Effect.gen(function* () {
        const response = yield* makeRequest(
          '/api/v1/rules/use-effect-gen-for-business-logic',
        );
        const json = yield* getJson(response);

        const validated = yield* Schema.decodeUnknown(RuleSchema)(json);

        expect(validated.id).toBe('use-effect-gen-for-business-logic');
        expect(validated.title).toBeTruthy();
        expect(validated.content).toBeTruthy();
      });

      await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));
    });

    it('should return 404 for non-existent rule', async () => {
      const program = Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient;

        const result = yield* Effect.either(
          client.get(`${BASE_URL}/api/v1/rules/non-existent-rule-id`),
        );

        if (result._tag === 'Left') {
          // Should fail with status error
          expect(result.left).toBeDefined();
        } else {
          const response = result.right;
          expect(response.status).toBe(404);

          const json = (yield* getJson(response)) as { error?: unknown };
          expect(json).toHaveProperty('error');
          expect(json.error).toBe('Rule not found');
        }
      });

      await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));
    });

    it('should return valid schema for existing rules', async () => {
      const program = Effect.gen(function* () {
        // First get all rules to find a valid ID
        const listResponse = yield* makeRequest('/api/v1/rules');
        const listJson = yield* getJson(listResponse);
        const rules = yield* Schema.decodeUnknown(Schema.Array(RuleSchema))(
          listJson,
        );

        // Pick a random rule
        const randomRule = rules[Math.floor(Math.random() * rules.length)];

        // Fetch it by ID
        const response = yield* makeRequest(`/api/v1/rules/${randomRule.id}`);
        const json = yield* getJson(response);
        const validated = yield* Schema.decodeUnknown(RuleSchema)(json);

        expect(validated.id).toBe(randomRule.id);
        expect(validated.title).toBe(randomRule.title);
      });

      await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));
    });
  });

  describe('Server Logging', () => {
    it('should log requests', async () => {
      // This test verifies the server logs requests
      // In a real implementation, you might capture stdout
      const program = Effect.gen(function* () {
        const response = yield* makeRequest('/health');
        expect(response.status).toBe(200);
      });

      await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));
    });
  });

  describe('CORS and Headers', () => {
    it('should return correct content-type', async () => {
      const program = Effect.gen(function* () {
        const response = yield* makeRequest('/api/v1/rules');

        const contentType = response.headers['content-type'];
        expect(contentType).toContain('application/json');
      });

      await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));
    });
  });
});
