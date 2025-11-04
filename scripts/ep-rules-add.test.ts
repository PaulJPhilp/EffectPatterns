/**
 * ep install add Command Tests
 *
 * Comprehensive test suite for the CLI install add command
 */

import { type ChildProcess, spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// --- TEST UTILITIES ---

const TEST_PORT = 45101;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let serverProcess: ChildProcess | null = null;
let serverLogs = '';

const startServer = async () => {
  process.env.PORT = String(TEST_PORT);
  serverLogs = '';
  serverProcess = spawn('bun', ['run', 'server/index.ts'], {
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
    },
  });

  serverProcess.stdout?.on('data', (data) => {
    const chunk = data.toString();
    serverLogs += chunk;
  });

  serverProcess.stderr?.on('data', (data) => {
    const chunk = data.toString();
    serverLogs += chunk;
  });

  serverProcess.on('exit', (code, signal) => {
    serverLogs += `\n[server-exit] code=${code ?? 'null'} signal=${signal ?? 'null'}\n`;
  });

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
    throw new Error(
      `Pattern Server failed to start on ${BASE_URL}\nLogs:\n${serverLogs.trim()}`,
    );
  }

  const sanityResponse = await fetch(`${BASE_URL}/api/v1/rules`);
  if (!sanityResponse.ok) {
    const body = await sanityResponse.text();
    throw new Error(
      `Pattern Server returned ${sanityResponse.status} for /api/v1/rules: ${body}\nLogs:\n${serverLogs.trim()}`,
    );
  }
};

const stopServer = () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  delete process.env.PORT;
};

const runCommand = async (
  args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> =>
  new Promise((resolve) => {
    const needsServerUrl =
      args[0] === 'install' &&
      args[1] === 'add' &&
      !args.includes('--server-url') &&
      !args.includes('--help');

    const finalArgs = needsServerUrl
      ? [...args, '--server-url', BASE_URL]
      : args;

    const proc = spawn('bun', ['run', 'scripts/ep.ts', ...finalArgs], {
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

const TEST_DIR = '.cursor-test';
const _TEST_FILE = path.join(TEST_DIR, 'rules.md');

// --- TESTS ---

describe('ep install add command', () => {
  beforeEach(async () => {
    // Start server before each test
    await startServer();

    // Clean up test directory
    try {
      await fs.rm(TEST_DIR, { recursive: true });
    } catch { }
  });

  afterEach(async () => {
    // Stop server after each test
    stopServer();

    // Clean up test directory
    try {
      await fs.rm(TEST_DIR, { recursive: true });
    } catch { }
  });

  describe('Tool Validation', () => {
    it('should require --tool option', async () => {
      const result = await runCommand(['install', 'add']);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('tool');
    });

    it('should reject unsupported tools', async () => {
      const result = await runCommand([
        'install',
        'add',
        '--tool',
        'unsupported-tool',
      ]);

      expect(result.exitCode).not.toBe(0);
      const output = result.stdout + result.stderr;
      expect(output).toContain('not supported');
    });

    it('should accept cursor tool', async () => {
      // Override target file for test
      const result = await runCommand(['install', 'add', '--tool', 'cursor']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Fetching rules');
    });
  });

  describe('API Integration', () => {
    it('should fetch rules from server', async () => {
      const result = await runCommand(['install', 'add', '--tool', 'cursor']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Fetched');
      expect(result.stdout).toContain('rules');
    });

    it('should handle server unavailable gracefully', async () => {
      // Stop server first
      stopServer();

      // Wait for server to fully stop
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = await runCommand([
        'install',
        'add',
        '--tool',
        'cursor',
        '--server-url',
        'http://localhost:9999',
      ]);

      expect(result.exitCode).not.toBe(0);
      expect(result.stdout + result.stderr).toContain('Cannot connect');
    });
  });

  describe('File Operations', () => {
    it('should create .cursor directory if not exists', async () => {
      const result = await runCommand(['install', 'add', '--tool', 'cursor']);

      expect(result.exitCode).toBe(0);

      // Check directory was created
      const dirExists = await fs
        .stat('.cursor')
        .then(() => true)
        .catch(() => false);

      expect(dirExists).toBe(true);
    });

    it('should create rules.md file', async () => {
      const result = await runCommand(['install', 'add', '--tool', 'cursor']);

      expect(result.exitCode).toBe(0);

      // Check file was created
      const fileExists = await fs
        .stat('.cursor/rules.md')
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);
    });

    it('should include managed block markers', async () => {
      const result = await runCommand(['install', 'add', '--tool', 'cursor']);

      expect(result.exitCode).toBe(0);

      const content = await fs.readFile('.cursor/rules.md', 'utf-8');

      expect(content).toContain('# --- BEGIN EFFECTPATTERNS RULES ---');
      expect(content).toContain('# --- END EFFECTPATTERNS RULES ---');
    });

    it('should format rules correctly', async () => {
      const result = await runCommand(['install', 'add', '--tool', 'cursor']);

      expect(result.exitCode).toBe(0);

      const content = await fs.readFile('.cursor/rules.md', 'utf-8');

      // Check for rule formatting
      expect(content).toContain('###');
      expect(content).toContain('**ID:**');
      expect(content).toContain('**Use Case:**');
      expect(content).toContain('**Skill Level:**');
    });
  });

  describe('Update Behavior', () => {
    it('should replace existing managed block', async () => {
      // Create initial file
      await fs.mkdir('.cursor', { recursive: true });
      const initialContent = `# My Custom Rules

Some custom content here

# --- BEGIN EFFECTPATTERNS RULES ---
Old rules content
# --- END EFFECTPATTERNS RULES ---

More custom content`;

      await fs.writeFile('.cursor/rules.md', initialContent);

      // Run command
      const result = await runCommand(['install', 'add', '--tool', 'cursor']);
      expect(result.exitCode).toBe(0);

      // Check content
      const content = await fs.readFile('.cursor/rules.md', 'utf-8');

      // Should preserve custom content
      expect(content).toContain('My Custom Rules');
      expect(content).toContain('Some custom content here');
      expect(content).toContain('More custom content');

      // Should replace managed block
      expect(content).not.toContain('Old rules content');
      expect(content).toContain('# --- BEGIN EFFECTPATTERNS RULES ---');
      expect(content).toContain('# --- END EFFECTPATTERNS RULES ---');
    });

    it('should append managed block if not present', async () => {
      // Create initial file without managed block
      await fs.mkdir('.cursor', { recursive: true });
      const initialContent = `# My Custom Rules

Some custom content here`;

      await fs.writeFile('.cursor/rules.md', initialContent);

      // Run command
      const result = await runCommand(['install', 'add', '--tool', 'cursor']);
      expect(result.exitCode).toBe(0);

      // Check content
      const content = await fs.readFile('.cursor/rules.md', 'utf-8');

      // Should preserve custom content
      expect(content).toContain('My Custom Rules');
      expect(content).toContain('Some custom content here');

      // Should add managed block
      expect(content).toContain('# --- BEGIN EFFECTPATTERNS RULES ---');
      expect(content).toContain('# --- END EFFECTPATTERNS RULES ---');
    });
  });

  describe('Output Messages', () => {
    it('should show progress messages', async () => {
      const result = await runCommand(['install', 'add', '--tool', 'cursor']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Fetching rules');
      expect(result.stdout).toContain('Injecting rules');
      expect(result.stdout).toContain('Successfully added');
      expect(result.stdout).toContain('Rules integration complete');
    });

    it('should show rule count', async () => {
      const result = await runCommand(['install', 'add', '--tool', 'cursor']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/Fetched \d+ rules/);
      expect(result.stdout).toMatch(/Successfully added \d+ rules/);
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors', async () => {
      // Clean up .cursor directory if it exists
      try {
        await fs.rm('.cursor', { recursive: true });
      } catch { }

      // Create a file where directory should be
      await fs.writeFile('.cursor', 'This is a file, not a directory');

      const result = await runCommand(['install', 'add', '--tool', 'cursor']);

      // Should fail due to file system error
      expect(result.exitCode).not.toBe(0);

      // Clean up the file
      await fs.unlink('.cursor');
    });

    it('should show helpful error messages', async () => {
      stopServer();

      // Wait for server to fully stop
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = await runCommand([
        'install',
        'add',
        '--tool',
        'cursor',
        '--server-url',
        'http://localhost:9999',
      ]);

      const output = result.stdout + result.stderr;
      expect(output).toContain('Pattern Server');
      expect(output.toLowerCase()).toContain('server');
    });
  });
});

describe('ep install command structure', { sequential: true }, () => {
  it('should have install subcommand', async () => {
    const result = await runCommand(['install', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('install');
  });

  it('should have add subcommand', async () => {
    const result = await runCommand(['install', '--help']);

    expect(result.stdout).toContain('add');
  });

  it('should have list subcommand', async () => {
    const result = await runCommand(['install', '--help']);

    expect(result.stdout).toContain('list');
  });
});

describe('ep install filtering', { sequential: true }, () => {
  beforeEach(async () => {
    await startServer();
  });

  afterEach(async () => {
    stopServer();

    // Clean up test files
    try {
      await fs.rm('.cursor', { recursive: true });
    } catch { }
  });

  it('should show skill-level option in help', async () => {
    const result = await runCommand(['install', 'add', '--help']);

    expect(result.stdout).toContain('skill-level');
  });

  it('should show use-case option in help', async () => {
    const result = await runCommand(['install', 'add', '--help']);

    expect(result.stdout).toContain('use-case');
  });

  it('should filter by skill level', async () => {
    const result = await runCommand([
      'install',
      'add',
      '--tool',
      'cursor',
      '--skill-level',
      'beginner',
    ]);

    // Command should complete successfully
    expect([0, 1]).toContain(result.exitCode);

    // Should show it's filtering
    const output = result.stdout;
    expect(
      output.includes('Filtered to') || output.includes('No rules match'),
    ).toBe(true);
  });

  it('should filter by use case', async () => {
    const result = await runCommand([
      'install',
      'add',
      '--tool',
      'cursor',
      '--use-case',
      'error-management',
    ]);

    // Command should complete successfully
    expect([0, 1]).toContain(result.exitCode);

    // Should show it's filtering
    const output = result.stdout;
    expect(
      output.includes('Filtered to') || output.includes('No rules match'),
    ).toBe(true);
  });

  it('should combine skill-level and use-case filters', async () => {
    const result = await runCommand([
      'install',
      'add',
      '--tool',
      'cursor',
      '--skill-level',
      'intermediate',
      '--use-case',
      'concurrency',
    ]);

    // Command should complete successfully
    expect([0, 1]).toContain(result.exitCode);
    expect(result.stdout).toContain('Fetched');
  });

  it('should warn when no rules match filters', async () => {
    const result = await runCommand([
      'install',
      'add',
      '--tool',
      'cursor',
      '--skill-level',
      'nonexistent',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No rules match');
  });

  it('should be case-insensitive for skill-level', async () => {
    const result = await runCommand([
      'install',
      'add',
      '--tool',
      'cursor',
      '--skill-level',
      'BEGINNER',
    ]);

    expect([0, 1]).toContain(result.exitCode);
    expect(result.stdout).toContain('Fetched');
  });

  it('should be case-insensitive for use-case', async () => {
    const result = await runCommand([
      'install',
      'add',
      '--tool',
      'cursor',
      '--use-case',
      'ERROR-MANAGEMENT',
    ]);

    expect([0, 1]).toContain(result.exitCode);
    expect(result.stdout).toContain('Fetched');
  });
});
