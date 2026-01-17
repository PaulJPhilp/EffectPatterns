import { Effect } from "effect";
import type { Block, Session } from "../types";
import { generateId } from "../types";
import { EffectTalkLayer } from "../services/index";

/**
 * Test fixtures for creating mock objects
 */

/**
 * Create a mock Block for testing
 */
export function createMockBlock(
  overrides: Partial<Block> = {}
): Block {
  return {
    id: generateId(),
    command: "echo test",
    status: "idle",
    stdout: "",
    stderr: "",
    startTime: Date.now(),
    metadata: {},
    ...overrides,
  };
}

/**
 * Create a mock Session for testing
 */
export function createMockSession(
  overrides: Partial<Session> = {}
): Session {
  return {
    id: generateId(),
    blocks: [],
    activeBlockId: null,
    workingDirectory: "/tmp",
    environment: {
      HOME: "/home/test",
      PATH: "/usr/bin:/bin",
    },
    createdAt: Date.now(),
    lastModified: Date.now(),
    ...overrides,
  };
}

/**
 * Run an Effect in test context
 * Provides the full EffectTalkLayer
 */
export async function runEffect<A, E>(
  effect: Effect.Effect<A, E>
): Promise<A> {
  return Effect.runPromise(effect.pipe(Effect.provide(EffectTalkLayer)));
}

/**
 * Create a session with pre-populated blocks
 */
export function createMockSessionWithBlocks(
  blockCount: number = 3,
  overrides: Partial<Session> = {}
): Session {
  const blocks = Array.from({ length: blockCount }, (_, i) =>
    createMockBlock({
      command: `command-${i}`,
      status: i === blockCount - 1 ? "running" : "success",
      startTime: Date.now() - (blockCount - i) * 1000,
    })
  );

  return createMockSession({
    blocks,
    activeBlockId: blocks[blockCount - 1]?.id || null,
    ...overrides,
  });
}

/**
 * Create a completed block with output
 */
export function createCompletedBlock(
  command: string = "ls -la",
  exitCode: number = 0
): Block {
  return createMockBlock({
    command,
    status: exitCode === 0 ? "success" : "failure",
    stdout: "file1.txt\nfile2.txt\nfile3.txt",
    stderr: "",
    exitCode,
    endTime: Date.now(),
  });
}

/**
 * Create a block with error output
 */
export function createFailedBlock(
  command: string = "failing-command",
  errorMessage: string = "Command not found"
): Block {
  return createMockBlock({
    command,
    status: "failure",
    stdout: "",
    stderr: errorMessage,
    exitCode: 1,
    endTime: Date.now(),
  });
}

/**
 * Create a running block
 */
export function createRunningBlock(
  command: string = "long-running-command"
): Block {
  return createMockBlock({
    command,
    status: "running",
    stdout: "Processing...",
    stderr: "",
    startTime: Date.now(),
  });
}

/**
 * Wait for a condition to become true
 * Useful for async testing
 */
export async function waitFor(
  condition: () => boolean,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error("Timeout waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/**
 * Create a temporary directory for testing
 */
export function getTempTestDir(): string {
  return `/tmp/effect-talk-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
