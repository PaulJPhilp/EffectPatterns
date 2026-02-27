/**
 * Scaffold Test Project Tests
 *
 * Tests for the pure/extractable logic in scaffold-test-project.ts:
 * makePackageJson, templateFiles, TEMPLATES, and TOOLS constants.
 */

import { describe, expect, it } from 'vitest';
import {
  GITIGNORE,
  makePackageJson,
  templateFiles,
  TEMPLATES,
  TOOLS,
  TSCONFIG,
} from '../scaffold-test-project.js';

// ---------------------------------------------------------------------------
// TEMPLATES & TOOLS constants
// ---------------------------------------------------------------------------

describe('TEMPLATES', () => {
  it('should contain exactly the six expected templates', () => {
    expect(TEMPLATES).toEqual([
      'basic',
      'service',
      'cli',
      'http-server',
      'lib',
      'worker',
    ]);
  });
});

describe('TOOLS', () => {
  it('should contain exactly the five expected tools (agents, claude, cursor, vscode, windsurf)', () => {
    expect(TOOLS).toEqual(['agents', 'claude', 'cursor', 'vscode', 'windsurf']);
  });
});

// ---------------------------------------------------------------------------
// makePackageJson
// ---------------------------------------------------------------------------

describe('makePackageJson', () => {
  it('basic: should have effect in deps and no vitest', () => {
    const pkg = JSON.parse(makePackageJson('test-basic', 'basic'));

    expect(pkg.name).toBe('test-basic');
    expect(pkg.dependencies.effect).toBe('latest');
    expect(pkg.devDependencies.vitest).toBeUndefined();
    expect(pkg.scripts.test).toBeUndefined();
  });

  it('basic: should have standard devDeps (typescript, tsx, @types/node)', () => {
    const pkg = JSON.parse(makePackageJson('test-basic', 'basic'));

    expect(pkg.devDependencies.typescript).toBe('latest');
    expect(pkg.devDependencies.tsx).toBe('latest');
    expect(pkg.devDependencies['@types/node']).toBe('latest');
  });

  it('service: should have effect in deps and vitest in devDeps with test script', () => {
    const pkg = JSON.parse(makePackageJson('test-svc', 'service'));

    expect(pkg.dependencies.effect).toBe('latest');
    expect(pkg.devDependencies.vitest).toBe('latest');
    expect(pkg.scripts.test).toBe('vitest run');
  });

  it('cli: should have @effect/cli, @effect/platform, @effect/platform-node in deps', () => {
    const pkg = JSON.parse(makePackageJson('test-cli', 'cli'));

    expect(pkg.dependencies['@effect/cli']).toBe('latest');
    expect(pkg.dependencies['@effect/platform']).toBe('latest');
    expect(pkg.dependencies['@effect/platform-node']).toBe('latest');
  });

  it('http-server: should have @effect/platform, @effect/platform-node, and @effect/experimental in deps', () => {
    const pkg = JSON.parse(makePackageJson('test-http', 'http-server'));

    expect(pkg.dependencies['@effect/platform']).toBe('latest');
    expect(pkg.dependencies['@effect/platform-node']).toBe('latest');
    expect(pkg.dependencies['@effect/experimental']).toBe('latest');
    expect(pkg.dependencies['@effect/cli']).toBeUndefined();
  });

  it('lib: should have vitest in devDeps and test script', () => {
    const pkg = JSON.parse(makePackageJson('test-lib', 'lib'));

    expect(pkg.dependencies.effect).toBe('latest');
    expect(pkg.devDependencies.vitest).toBe('latest');
    expect(pkg.scripts.test).toBe('vitest run');
  });

  it('worker: should have effect only (no platform)', () => {
    const pkg = JSON.parse(makePackageJson('test-worker', 'worker'));

    expect(pkg.dependencies.effect).toBe('latest');
    expect(pkg.dependencies['@effect/platform']).toBeUndefined();
    expect(pkg.scripts.dev).toBe('tsx src/index.ts');
  });

  it('all templates should have type: module and standard scripts', () => {
    for (const template of TEMPLATES) {
      const pkg = JSON.parse(makePackageJson(`test-${template}`, template));

      expect(pkg.type).toBe('module');
      expect(pkg.scripts.dev).toBe('tsx src/index.ts');
      expect(pkg.scripts.build).toBe('tsc');
      expect(pkg.scripts.start).toBe('node dist/index.js');
    }
  });
});

// ---------------------------------------------------------------------------
// templateFiles
// ---------------------------------------------------------------------------

describe('templateFiles', () => {
  it('should have an entry for every template', () => {
    for (const template of TEMPLATES) {
      expect(templateFiles[template]).toBeDefined();
    }
  });

  it('every template should include src/index.ts', () => {
    for (const template of TEMPLATES) {
      expect(templateFiles[template]['src/index.ts']).toBeDefined();
    }
  });

  it('service template should have src/service.ts and src/service.test.ts', () => {
    const files = Object.keys(templateFiles.service);

    expect(files).toContain('src/service.ts');
    expect(files).toContain('src/service.test.ts');
  });

  it('cli template should have src/commands.ts', () => {
    const files = Object.keys(templateFiles.cli);

    expect(files).toContain('src/commands.ts');
  });

  it('http-server template should have src/routes.ts', () => {
    const files = Object.keys(templateFiles['http-server']);

    expect(files).toContain('src/routes.ts');
  });

  it('lib template should have src/index.ts and src/index.test.ts', () => {
    const files = Object.keys(templateFiles.lib);

    expect(files).toContain('src/index.ts');
    expect(files).toContain('src/index.test.ts');
  });

  it('worker template should only have src/index.ts', () => {
    const files = Object.keys(templateFiles.worker);

    expect(files).toEqual(['src/index.ts']);
  });

  it('basic template should only have src/index.ts', () => {
    const files = Object.keys(templateFiles.basic);

    expect(files).toEqual(['src/index.ts']);
  });
});

// ---------------------------------------------------------------------------
// TSCONFIG & GITIGNORE
// ---------------------------------------------------------------------------

describe('TSCONFIG', () => {
  it('should be valid JSON with expected compiler options', () => {
    const tsconfig = JSON.parse(TSCONFIG);

    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.module).toBe('NodeNext');
    expect(tsconfig.compilerOptions.outDir).toBe('dist');
    expect(tsconfig.compilerOptions.rootDir).toBe('src');
    expect(tsconfig.include).toEqual(['src']);
  });
});

describe('GITIGNORE', () => {
  it('should ignore node_modules and dist', () => {
    expect(GITIGNORE).toContain('node_modules/');
    expect(GITIGNORE).toContain('dist/');
  });
});
