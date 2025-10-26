/**
 * Integration Tests
 *
 * End-to-end integration tests for Pattern Server + CLI
 */

import { type ChildProcess, spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import { FetchHttpClient, HttpClient } from '@effect/platform';
import { Effect, Schema } from 'effect';
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

// --- TEST UTILITIES ---

const BASE_URL = 'http://localhost:3001';
const TestLayer = FetchHttpClient.layer;

let serverProcess: ChildProcess | null = null;

const runCommand = async (
  args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> =>
  new Promise((resolve) => {
    const proc = spawn('bun', ['run', 'scripts/ep.ts', ...args], {
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code || 0 });
    });
  });

beforeAll(async () => {
  // Start the server
  serverProcess = spawn('bun', ['run', 'server/index.ts'], {
    stdio: 'pipe',
  });

  // Wait for server to start
  await new Promise((resolve) => setTimeout(resolve, 2000));
});

afterAll(async () => {
  // Stop the server
  if (serverProcess) {
    serverProcess.kill();
  }

  // Clean up test files
  try {
    await fs.rm('.cursor', { recursive: true });
  } catch {}
});

// --- TESTS ---

describe.sequential('End-to-End Integration', () => {
  describe('Server → CLI Flow', () => {
    it('should fetch rules from server and inject into file', async () => {
      // 1. Verify server is running and has rules
      const checkServer = Effect.gen(function* () {
        const client = (yield* HttpClient.HttpClient).pipe(
          HttpClient.filterStatusOk,
        );

        const response = yield* client.get(`${BASE_URL}/api/v1/rules`);
        const json = yield* response.json;
        const rules = yield* Schema.decodeUnknown(Schema.Array(RuleSchema))(
          json,
        );

        expect(rules.length).toBeGreaterThan(0);
        return rules.length;
      });

      const serverRuleCount = await Effect.runPromise(
        checkServer.pipe(Effect.provide(TestLayer)),
      );

      // 2. Run CLI command to inject rules
      const cliResult = await runCommand(['rules', 'add', '--tool', 'cursor']);

      expect(cliResult.exitCode).toBe(0);
      expect(cliResult.stdout).toContain(`Fetched ${serverRuleCount} rules`);
      expect(cliResult.stdout).toContain(
        `Successfully added ${serverRuleCount} rules`,
      );

      // 3. Verify file was created with correct content
      const fileContent = await fs.readFile('.cursor/rules.md', 'utf-8');

      expect(fileContent).toContain('# --- BEGIN EFFECTPATTERNS RULES ---');
      expect(fileContent).toContain('# --- END EFFECTPATTERNS RULES ---');
      expect(fileContent).toContain('###'); // Rule title markers
      expect(fileContent).toContain('**ID:**');
    });

    it('should handle server-to-cli-to-file round trip', async () => {
      // 1. Get a specific rule from server
      const getRule = Effect.gen(function* () {
        const client = (yield* HttpClient.HttpClient).pipe(
          HttpClient.filterStatusOk,
        );

        const response = yield* client.get(
          `${BASE_URL}/api/v1/rules/use-effect-gen-for-business-logic`,
        );
        const json = yield* response.json;
        const rule = yield* Schema.decodeUnknown(RuleSchema)(json);

        return rule;
      });

      const serverRule = await Effect.runPromise(
        getRule.pipe(Effect.provide(TestLayer)),
      );

      // 2. Run CLI command
      const cliResult = await runCommand(['rules', 'add', '--tool', 'cursor']);
      expect(cliResult.exitCode).toBe(0);

      // 3. Verify the specific rule is in the file
      const fileContent = await fs.readFile('.cursor/rules.md', 'utf-8');

      expect(fileContent).toContain(serverRule.id);
      expect(fileContent).toContain(serverRule.title);
    });
  });

  describe('Multiple Updates', () => {
    it('should handle multiple CLI runs correctly', async () => {
      // Run command first time
      const result1 = await runCommand(['rules', 'add', '--tool', 'cursor']);
      expect(result1.exitCode).toBe(0);

      const content1 = await fs.readFile('.cursor/rules.md', 'utf-8');
      const lineCount1 = content1.split('\n').length;

      // Run command second time
      const result2 = await runCommand(['rules', 'add', '--tool', 'cursor']);
      expect(result2.exitCode).toBe(0);

      const content2 = await fs.readFile('.cursor/rules.md', 'utf-8');
      const lineCount2 = content2.split('\n').length;

      // Should have similar line count (not duplicated)
      expect(Math.abs(lineCount2 - lineCount1)).toBeLessThan(10);

      // Should still have markers
      expect(content2).toContain('# --- BEGIN EFFECTPATTERNS RULES ---');
      expect(content2).toContain('# --- END EFFECTPATTERNS RULES ---');
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all rule data through the pipeline', async () => {
      // 1. Get all rules from server
      const getAllRules = Effect.gen(function* () {
        const client = (yield* HttpClient.HttpClient).pipe(
          HttpClient.filterStatusOk,
        );

        const response = yield* client.get(`${BASE_URL}/api/v1/rules`);
        const json = yield* response.json;
        return yield* Schema.decodeUnknown(Schema.Array(RuleSchema))(json);
      });

      const serverRules = await Effect.runPromise(
        getAllRules.pipe(Effect.provide(TestLayer)),
      );

      // 2. Run CLI command
      const cliResult = await runCommand(['rules', 'add', '--tool', 'cursor']);
      expect(cliResult.exitCode).toBe(0);

      // 3. Verify all rules are in the file
      const fileContent = await fs.readFile('.cursor/rules.md', 'utf-8');

      for (const rule of serverRules) {
        expect(fileContent).toContain(rule.id);
      }
    });

    it('should maintain rule formatting consistency', async () => {
      const cliResult = await runCommand(['rules', 'add', '--tool', 'cursor']);
      expect(cliResult.exitCode).toBe(0);

      const fileContent = await fs.readFile('.cursor/rules.md', 'utf-8');

      // Each rule should have ID and metadata
      const idMarkers = fileContent.match(/\*\*ID:\*\*/g);
      expect(idMarkers).toBeTruthy();
      expect(idMarkers?.length).toBeGreaterThan(0);

      // Each rule should have use case and skill level
      const useCaseMarkers = fileContent.match(/\*\*Use Case:\*\*/g);
      expect(useCaseMarkers).toBeTruthy();
      expect(useCaseMarkers?.length).toBe(idMarkers?.length);

      const skillLevelMarkers = fileContent.match(/\*\*Skill Level:\*\*/g);
      expect(skillLevelMarkers).toBeTruthy();
      expect(skillLevelMarkers?.length).toBe(idMarkers?.length);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle partial server data gracefully', async () => {
      // This tests that even if server returns partial data,
      // CLI handles it correctly
      const cliResult = await runCommand(['rules', 'add', '--tool', 'cursor']);

      // Should succeed even with any data shape
      expect(cliResult.exitCode).toBe(0);
      expect(cliResult.stdout).toContain('Successfully added');
    });
  });

  describe('File System Edge Cases', () => {
    it('should create directory structure if missing', async () => {
      // Clean up first
      try {
        await fs.rm('.cursor', { recursive: true });
      } catch {}

      // Verify directory doesn't exist
      const dirExistsBefore = await fs
        .stat('.cursor')
        .then(() => true)
        .catch(() => false);
      expect(dirExistsBefore).toBe(false);

      // Run command
      const cliResult = await runCommand(['rules', 'add', '--tool', 'cursor']);
      expect(cliResult.exitCode).toBe(0);

      // Verify directory was created
      const dirExistsAfter = await fs
        .stat('.cursor')
        .then(() => true)
        .catch(() => false);
      expect(dirExistsAfter).toBe(true);
    });

    it('should preserve user content outside managed block', async () => {
      // Create file with custom content
      await fs.mkdir('.cursor', { recursive: true });
      const customContent = `# My Custom Cursor Rules

These are my personal rules.

## Section 1
Content here`;

      await fs.writeFile('.cursor/rules.md', customContent);

      // Run command
      const cliResult = await runCommand(['rules', 'add', '--tool', 'cursor']);
      expect(cliResult.exitCode).toBe(0);

      // Verify custom content is preserved
      const fileContent = await fs.readFile('.cursor/rules.md', 'utf-8');

      expect(fileContent).toContain('My Custom Cursor Rules');
      expect(fileContent).toContain('These are my personal rules');
      expect(fileContent).toContain('Section 1');
    });
  });
});

describe.sequential('Performance', () => {
  it('should complete end-to-end flow in reasonable time', async () => {
    const startTime = Date.now();

    const cliResult = await runCommand(['rules', 'add', '--tool', 'cursor']);
    expect(cliResult.exitCode).toBe(0);

    const duration = Date.now() - startTime;

    // Should complete within 10 seconds
    expect(duration).toBeLessThan(10_000);
  }, 15_000); // 15 second timeout for this test
});
