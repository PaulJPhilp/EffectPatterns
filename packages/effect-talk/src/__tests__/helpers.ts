import type { Block, Session } from "../types";

/**
 * Test helper functions for assertions and utilities
 */

/**
 * Assert that a block is in "running" state
 */
export function expectBlockRunning(block: Block): void {
  if (block.status !== "running") {
    throw new Error(`Expected block to be running, but was ${block.status}`);
  }
  if (block.startTime === 0) {
    throw new Error("Expected running block to have startTime");
  }
  if (block.endTime !== undefined) {
    throw new Error(
      "Expected running block to not have endTime"
    );
  }
}

/**
 * Assert that a block has completed successfully
 */
export function expectBlockSuccess(block: Block): void {
  if (block.status !== "success") {
    throw new Error(
      `Expected block status to be success, but was ${block.status}`
    );
  }
  if (block.exitCode !== 0) {
    throw new Error(
      `Expected exit code 0 for success, but was ${block.exitCode}`
    );
  }
  if (block.endTime === undefined) {
    throw new Error("Expected completed block to have endTime");
  }
}

/**
 * Assert that a block has failed
 */
export function expectBlockFailure(block: Block): void {
  if (block.status !== "failure") {
    throw new Error(
      `Expected block status to be failure, but was ${block.status}`
    );
  }
  if (block.exitCode === undefined || block.exitCode === 0) {
    throw new Error(
      `Expected non-zero exit code for failure, but was ${block.exitCode}`
    );
  }
  if (block.endTime === undefined) {
    throw new Error("Expected completed block to have endTime");
  }
}

/**
 * Assert that a block was interrupted
 */
export function expectBlockInterrupted(block: Block): void {
  if (block.status !== "interrupted") {
    throw new Error(
      `Expected block status to be interrupted, but was ${block.status}`
    );
  }
  if (block.endTime === undefined) {
    throw new Error("Expected interrupted block to have endTime");
  }
}

/**
 * Assert that a session has specific number of blocks
 */
export function expectBlockCount(session: Session, count: number): void {
  if (session.blocks.length !== count) {
    throw new Error(
      `Expected session to have ${count} blocks, but has ${session.blocks.length}`
    );
  }
}

/**
 * Assert that a session has an active block
 */
export function expectActiveBlock(session: Session): Block {
  if (!session.activeBlockId) {
    throw new Error("Expected session to have an active block");
  }

  const activeBlock = session.blocks.find(
    (b) => b.id === session.activeBlockId
  );
  if (!activeBlock) {
    throw new Error(
      `Active block ID ${session.activeBlockId} not found in blocks`
    );
  }

  return activeBlock;
}

/**
 * Assert that a session has no active block
 */
export function expectNoActiveBlock(session: Session): void {
  if (session.activeBlockId !== null) {
    throw new Error(
      `Expected session to have no active block, but has ${session.activeBlockId}`
    );
  }
}

/**
 * Find a block by command in a session
 */
export function findBlockByCommand(
  session: Session,
  command: string
): Block | undefined {
  return session.blocks.find((b) => b.command === command);
}

/**
 * Find all blocks with a specific status
 */
export function findBlocksByStatus(
  session: Session,
  status: Block["status"]
): Block[] {
  return session.blocks.filter((b) => b.status === status);
}

/**
 * Calculate total execution time for all blocks
 */
export function calculateTotalExecutionTime(session: Session): number {
  return session.blocks.reduce((total, block) => {
    if (block.endTime !== undefined) {
      return total + (block.endTime - block.startTime);
    }
    return total;
  }, 0);
}

/**
 * Get the most recent block in a session
 */
export function getLastBlock(session: Session): Block | undefined {
  return session.blocks[session.blocks.length - 1];
}

/**
 * Check if a session has any failures
 */
export function hasFailures(session: Session): boolean {
  return session.blocks.some((b) => b.status === "failure");
}

/**
 * Get all failed blocks
 */
export function getFailedBlocks(session: Session): Block[] {
  return session.blocks.filter((b) => b.status === "failure");
}

/**
 * Get total stdout from all blocks
 */
export function getTotalStdout(session: Session): string {
  return session.blocks.map((b) => b.stdout).join("\n");
}

/**
 * Get total stderr from all blocks
 */
export function getTotalStderr(session: Session): string {
  return session.blocks.map((b) => b.stderr).join("\n");
}

/**
 * Create a string representation of session for debugging
 */
export function describeSession(session: Session): string {
  return `Session ${session.id}:
  - Blocks: ${session.blocks.length}
  - Active: ${session.activeBlockId || "none"}
  - CWD: ${session.workingDirectory}
  - Created: ${new Date(session.createdAt).toISOString()}
  - Modified: ${new Date(session.lastModified).toISOString()}`;
}

/**
 * Create a string representation of a block for debugging
 */
export function describeBlock(block: Block): string {
  return `Block ${block.id}:
  - Command: ${block.command}
  - Status: ${block.status}
  - Exit Code: ${block.exitCode ?? "N/A"}
  - Duration: ${block.endTime ? block.endTime - block.startTime : "running"}ms
  - Stdout: ${block.stdout.length} bytes
  - Stderr: ${block.stderr.length} bytes`;
}
