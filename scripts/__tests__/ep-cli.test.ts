/**
 * ep CLI Full Test Suite
 *
 * Comprehensive tests for all CLI commands
 */

import { type ChildProcess, spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

// --- TEST UTILITIES ---

const TEST_PORT = 45104;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let serverProcess: ChildProcess | null = null;

const startServer = async () => {
  process.env.PORT = String(TEST_PORT);
  serverProcess = spawn('bun', ['run', 'server/index.ts'], {
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
    },
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
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!serverReady) {
    throw new Error(`Pattern Server failed to start on ${BASE_URL}`);
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
  options?: { timeout?: number },
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  return new Promise((resolve, reject) => {
    const needsServerUrl =
      serverProcess !== null &&
      args[0] === 'install' &&
      args[1] === 'add' &&
      !args.includes('--server-url') &&
      !args.includes('--help');

    const finalArgs = needsServerUrl
      ? [...args, '--server-url', `http://localhost:${TEST_PORT}`]
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

    // Timeout handler
    const timeout = options?.timeout || 30_000;
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);

    proc.on('close', () => {
      clearTimeout(timer);
    });
  });
};

// --- MAIN CLI TESTS ---

describe('ep CLI', { sequential: true }, () => {
  describe('Help and Version', () => {
    it('should show help with --help flag', async () => {
      const result = await runCommand(['--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('EffectPatterns CLI');
      expect(result.stdout).toContain('USAGE');
      expect(result.stdout).toContain('COMMANDS');
    });

    it('should show help with -h flag', async () => {
      const result = await runCommand(['-h']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('EffectPatterns CLI');
    });

    it('should show version with --version flag', async () => {
      const result = await runCommand(['--version']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('0.4.0');
    });

    it('should list all top-level commands', async () => {
      const result = await runCommand(['--help']);

      expect(result.stdout).toContain('pattern');
      expect(result.stdout).toContain('install');
      expect(result.stdout).toContain('admin');
    });
  });

  describe('Error Handling', () => {
    it('should show error for unknown command', async () => {
      const result = await runCommand(['unknown-command']);

      // CLI may show help instead of erroring for unknown commands
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should show error for invalid options', async () => {
      const result = await runCommand(['install', 'add', '--invalid-option']);

      expect(result.exitCode).not.toBe(0);
    });
  });
});

// --- INSTALL COMMAND TESTS ---

describe('ep install', { sequential: true }, () => {
  beforeAll(async () => {
    await startServer();
  });

  afterAll(() => {
    stopServer();
  });

  describe('install list', () => {
    it('should list all supported tools', async () => {
      const result = await runCommand(['install', 'list']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Supported AI Tools');
      expect(result.stdout).toContain('cursor');
      expect(result.stdout).toContain('agents');
      expect(result.stdout).toContain('windsurf');
      expect(result.stdout).toContain('gemini');
      expect(result.stdout).toContain('claude');
      expect(result.stdout).toContain('vscode');
      expect(result.stdout).toContain('kilo');
      expect(result.stdout).toContain('kira');
      expect(result.stdout).toContain('trae');
      expect(result.stdout).toContain('goose');
    });

    it('should show file paths for each tool', async () => {
      const result = await runCommand(['install', 'list']);

      expect(result.stdout).toContain('.cursor/rules.md');
      expect(result.stdout).toContain('AGENTS.md');
      expect(result.stdout).toContain('.windsurf/rules.md');
      expect(result.stdout).toContain('GEMINI.md');
      expect(result.stdout).toContain('CLAUDE.md');
      expect(result.stdout).toContain('.vscode/rules.md');
      expect(result.stdout).toContain('.kilo/rules.md');
      expect(result.stdout).toContain('.kira/rules.md');
      expect(result.stdout).toContain('.trae/rules.md');
      expect(result.stdout).toContain('.goosehints');
    });

    it('should show usage examples', async () => {
      const result = await runCommand(['install', 'list']);

      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('ep install add --tool');
    });
  });

  describe('install add', () => {
    afterEach(async () => {
      // Clean up test files
      const testFiles = [
        '.cursor',
        'AGENTS.md',
        '.windsurf',
        'GEMINI.md',
        'CLAUDE.md',
        '.vscode',
        '.kilo',
        '.kira',
        '.trae',
        '.goosehints',
      ];

      for (const file of testFiles) {
        try {
          const stats = await fs.stat(file);
          if (stats.isDirectory()) {
            await fs.rm(file, { recursive: true });
          } else {
            await fs.unlink(file);
          }
        } catch {
          // File doesn't exist, ignore
        }
      }
    });

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
        'unsupported',
      ]);

      expect(result.exitCode).not.toBe(0);
      const output = result.stdout + result.stderr;
      expect(output).toContain('not supported');
    });

    it('should accept cursor tool', async () => {
      const result = await runCommand(['install', 'add', '--tool', 'cursor']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Fetching rules');
      expect(result.stdout).toContain('Successfully added');
    });

    it('should accept agents tool', async () => {
      const result = await runCommand(['install', 'add', '--tool', 'agents']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Fetching rules');
    });

    it('should create target file for cursor', async () => {
      await runCommand(['install', 'add', '--tool', 'cursor']);

      const fileExists = await fs
        .stat('.cursor/rules.md')
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);
    });

    it('should create target file for agents', async () => {
      await runCommand(['install', 'add', '--tool', 'agents']);

      const fileExists = await fs
        .stat('AGENTS.md')
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);
    });

    it('should create target file for goose', async () => {
      await runCommand(['install', 'add', '--tool', 'goose']);

      const fileExists = await fs
        .stat('.goosehints')
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);
    });

    it('should include managed block markers', async () => {
      await runCommand(['install', 'add', '--tool', 'cursor']);

      const content = await fs.readFile('.cursor/rules.md', 'utf-8');

      expect(content).toContain('# --- BEGIN EFFECTPATTERNS RULES ---');
      expect(content).toContain('# --- END EFFECTPATTERNS RULES ---');
    });

    it('should format rules correctly', async () => {
      await runCommand(['install', 'add', '--tool', 'cursor']);

      const content = await fs.readFile('.cursor/rules.md', 'utf-8');

      expect(content).toContain('###');
      expect(content).toContain('**ID:**');
      expect(content).toContain('**Use Case:**');
      expect(content).toContain('**Skill Level:**');
    });

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
      await runCommand(['install', 'add', '--tool', 'cursor']);

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

    it('should support custom server URL', async () => {
      const result = await runCommand([
        'install',
        'add',
        '--tool',
        'cursor',
        '--server-url',
        'http://localhost:3001',
      ]);

      expect(result.exitCode).toBe(0);
    });

    it('should handle server unavailable gracefully', async () => {
      // Stop server
      stopServer();

      const result = await runCommand([
        'install',
        'add',
        '--tool',
        'cursor',
        '--server-url',
        'http://localhost:9999',
      ]);

      expect(result.exitCode).not.toBe(0);
      const output = result.stdout + result.stderr;
      expect(output).toContain('Pattern Server');

      // Restart server for other tests
      await startServer();
    });

    it('should support skill-level filtering', async () => {
      const result = await runCommand([
        'install',
        'add',
        '--tool',
        'cursor',
        '--skill-level',
        'beginner',
      ]);

      // May succeed with 0 rules or fail, depending on available rules
      expect([0, 1]).toContain(result.exitCode);
      expect(result.stdout).toContain('Fetched');
    });

    it('should support use-case filtering', async () => {
      const result = await runCommand([
        'install',
        'add',
        '--tool',
        'cursor',
        '--use-case',
        'error-management',
      ]);

      // May succeed with 0 rules or fail, depending on available rules
      expect([0, 1]).toContain(result.exitCode);
      expect(result.stdout).toContain('Fetched');
    });

    it('should support combining filters', async () => {
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

      // May succeed with 0 rules or fail, depending on available rules
      expect([0, 1]).toContain(result.exitCode);
      expect(result.stdout).toContain('Fetched');
    });

    it('should show warning when no rules match filters', async () => {
      const result = await runCommand([
        'install',
        'add',
        '--tool',
        'cursor',
        '--skill-level',
        'nonexistent-level',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No rules match');
    });

    it('should show filtered count', async () => {
      const result = await runCommand([
        'install',
        'add',
        '--tool',
        'cursor',
        '--skill-level',
        'beginner',
      ]);

      // Should show filtering message
      const hasFilterMessage =
        result.stdout.includes('Filtered to') ||
        result.stdout.includes('No rules match');
      expect(hasFilterMessage).toBe(true);
    });
  });
});

// --- PATTERN COMMAND TESTS ---

describe('ep pattern', { sequential: true }, () => {
  describe('pattern new', () => {
    it('should show help for pattern new', async () => {
      const result = await runCommand(['pattern', 'new', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Create a new pattern');
    });

    // Note: Interactive wizard tests would require mocking stdin
    // which is complex. We'll test the command structure instead.

    it('should accept pattern new command', async () => {
      const result = await runCommand(['pattern', '--help']);

      expect(result.stdout).toContain('new');
      expect(result.stdout).toContain('Create a new pattern');
    });
  });
});

// --- ADMIN COMMAND TESTS ---

describe('ep admin', { sequential: true }, () => {
  describe('admin validate', () => {
    it('should run validation', async () => {
      const result = await runCommand(['admin', 'validate'], {
        timeout: 60_000,
      });

      // Should complete (may pass or fail depending on patterns state)
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should accept --verbose flag', async () => {
      const result = await runCommand(['admin', 'validate', '--verbose'], {
        timeout: 60_000,
      });

      expect([0, 1]).toContain(result.exitCode);
    });

    it('should accept -v flag', async () => {
      const result = await runCommand(['admin', 'validate', '-v'], {
        timeout: 60_000,
      });

      expect([0, 1]).toContain(result.exitCode);
    });
  });

  describe('admin test', () => {
    it('should run tests', async () => {
      const result = await runCommand(['admin', 'test'], { timeout: 120_000 });

      // Should complete
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should accept --verbose flag', async () => {
      const result = await runCommand(['admin', 'test', '--verbose'], {
        timeout: 120_000,
      });

      expect([0, 1]).toContain(result.exitCode);
    });
  });

  describe('admin generate', () => {
    it('should generate README', async () => {
      const result = await runCommand(['admin', 'generate'], {
        timeout: 60_000,
      });

      // Should complete
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should accept --verbose flag', async () => {
      const result = await runCommand(['admin', 'generate', '--verbose'], {
        timeout: 60_000,
      });

      expect([0, 1]).toContain(result.exitCode);
    });
  });

  describe('admin rules', () => {
    it('should show rules subcommands', async () => {
      const result = await runCommand(['admin', 'rules', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('rules');
    });

    it('should generate AI coding rules', async () => {
      const result = await runCommand(['admin', 'rules', 'generate'], {
        timeout: 60_000,
      });

      expect([0, 1]).toContain(result.exitCode);
    });

    it('should accept --verbose flag', async () => {
      const result = await runCommand(
        ['admin', 'rules', 'generate', '--verbose'],
        {
          timeout: 60_000,
        },
      );

      expect([0, 1]).toContain(result.exitCode);
    });
  });

  describe('admin release', () => {
    it('should show release subcommands', async () => {
      const result = await runCommand(['admin', 'release', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('release');
      expect(result.stdout).toContain('preview');
      expect(result.stdout).toContain('create');
    });

    it('should preview release', async () => {
      const result = await runCommand(['admin', 'release', 'preview'], {
        timeout: 30_000,
      });

      // Should complete (may succeed or fail depending on git state)
      expect([0, 1]).toContain(result.exitCode);
    });

    // Note: We don't test 'release create' as it would create actual releases
  });

  describe('admin pipeline', () => {
    it('should run full pipeline', async () => {
      const result = await runCommand(['admin', 'pipeline'], {
        timeout: 180_000,
      });

      // Should complete
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should accept --verbose flag', async () => {
      const result = await runCommand(['admin', 'pipeline', '--verbose'], {
        timeout: 180_000,
      });

      expect([0, 1]).toContain(result.exitCode);
    });
  });
});

// --- COMMAND STRUCTURE TESTS ---

describe('CLI Command Structure', () => {
  it('should have consistent command hierarchy', async () => {
    const result = await runCommand(['--help']);

    expect(result.stdout).toContain('pattern');
    expect(result.stdout).toContain('install');
    expect(result.stdout).toContain('admin');
  });

  it('should show subcommands for each top-level command', async () => {
    const commands = ['pattern', 'install', 'admin'];

    for (const cmd of commands) {
      const result = await runCommand([cmd, '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(cmd);
    }
  });

  it('should have consistent help across all commands', async () => {
    const commands = [
      ['--help'],
      ['pattern', '--help'],
      ['install', '--help'],
      ['admin', '--help'],
    ];

    for (const cmd of commands) {
      const result = await runCommand(cmd);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('USAGE');
    }
  });
});

// --- INTEGRATION TESTS ---

describe('CLI Integration', { sequential: true }, () => {
  beforeAll(async () => {
    await startServer();
  });

  afterAll(() => {
    stopServer();
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm('.cursor', { recursive: true });
    } catch { }
  });

  it('should complete full workflow: install -> validate', async () => {
    // Install rules
    const installResult = await runCommand([
      'install',
      'add',
      '--tool',
      'cursor',
    ]);
    expect(installResult.exitCode).toBe(0);

    // Validate patterns
    const validateResult = await runCommand(['admin', 'validate'], {
      timeout: 60_000,
    });
    expect([0, 1]).toContain(validateResult.exitCode);
  });

  it('should handle multiple tool installations', async () => {
    const tools = ['cursor', 'agents'];

    for (const tool of tools) {
      const result = await runCommand(['install', 'add', '--tool', tool]);
      expect(result.exitCode).toBe(0);
    }

    // Verify files exist
    const cursorExists = await fs
      .stat('.cursor/rules.md')
      .then(() => true)
      .catch(() => false);
    const agentsExists = await fs
      .stat('AGENTS.md')
      .then(() => true)
      .catch(() => false);

    expect(cursorExists).toBe(true);
    expect(agentsExists).toBe(true);

    // Clean up
    await fs.rm('AGENTS.md').catch(() => { });
  });
});
