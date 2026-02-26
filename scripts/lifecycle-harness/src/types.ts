/**
 * Shared types for lifecycle harness.
 */

/** Discriminated union of all mutation steps; enables exhaustiveness checking. */
export type RunnableMutation =
  | { kind: 'add-ts-module'; run(): void }
  | { kind: 'rename-file-fix-imports'; run(): void }
  | { kind: 'typescript-break-then-fix'; run(): void }
  | { kind: 'add-vitest-then-break-fix'; run(): void }
  | { kind: 'modify-package-scripts'; run(): void }
  | { kind: 'skills-break-then-fix'; run(): void }
  | { kind: 'bun-run-dev'; run(): void }
  | { kind: 'bun-run-test'; run(): void }
  | { kind: 'ep-install-list'; run(): void }
  | { kind: 'ep-install-add'; run(): void }
  | { kind: 'ep-skills-validate'; run(): void }
  | { kind: 'ep-search'; run(): void }
  | { kind: 'ep-show-bogus'; run(): void }

export const TEMPLATES = ['basic', 'service', 'cli', 'http-server'] as const
export type Template = (typeof TEMPLATES)[number]

export const TOOLS = ['agents', 'cursor', 'vscode', 'windsurf'] as const
export type Tool = (typeof TOOLS)[number]
