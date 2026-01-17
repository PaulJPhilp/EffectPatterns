import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { BlockService } from "../BlockService";
import { LoggerService } from "../LoggerService";
import { createMockBlock } from "../../__tests__/fixtures";
import type { Block, BlockStatus } from "../../types";

/**
 * Test suite for BlockService
 * Tests block lifecycle management: creation, updates, and status tracking
 */

describe("BlockService", () => {
  const runBlockService = async <A>(
    effect: Effect.Effect<A, never, BlockService | LoggerService>
  ): Promise<A> => {
    return Effect.runPromise(
      effect.pipe(
        Effect.provide(LoggerService.Default),
        Effect.provide(BlockService.Default)
      )
    );
  };

  describe("createBlock", () => {
    it("should create a block with command", async () => {
      const block = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.createBlock("echo test");
        })
      );

      expect(block).toBeDefined();
      expect(block.command).toBe("echo test");
    });

    it("should create block with idle status", async () => {
      const block = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.createBlock("ls -la");
        })
      );

      expect(block.status).toBe("idle");
    });

    it("should assign unique ID to each block", async () => {
      const blocks = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          const block1 = yield* service.createBlock("cmd1");
          const block2 = yield* service.createBlock("cmd2");
          const block3 = yield* service.createBlock("cmd3");
          return [block1, block2, block3];
        })
      );

      const ids = blocks.map((b) => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it("should initialize empty stdout and stderr", async () => {
      const block = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.createBlock("test");
        })
      );

      expect(block.stdout).toBe("");
      expect(block.stderr).toBe("");
    });

    it("should set startTime to current time", async () => {
      const beforeCreate = Date.now();

      const block = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.createBlock("test");
        })
      );

      const afterCreate = Date.now();

      expect(block.startTime).toBeGreaterThanOrEqual(beforeCreate);
      expect(block.startTime).toBeLessThanOrEqual(afterCreate);
    });

    it("should initialize with empty metadata", async () => {
      const block = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.createBlock("test");
        })
      );

      expect(block.metadata).toBeDefined();
      expect(typeof block.metadata).toBe("object");
      expect(Object.keys(block.metadata).length).toBe(0);
    });

    it("should handle empty command string", async () => {
      const block = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.createBlock("");
        })
      );

      expect(block.command).toBe("");
      expect(block.status).toBe("idle");
    });

    it("should handle long command strings", async () => {
      const longCommand =
        "echo " + "a".repeat(1000);

      const block = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.createBlock(longCommand);
        })
      );

      expect(block.command).toBe(longCommand);
    });

    it("should create complete block structure", async () => {
      const block = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.createBlock("test");
        })
      );

      // Verify all required properties exist
      expect("id" in block).toBe(true);
      expect("command" in block).toBe(true);
      expect("status" in block).toBe(true);
      expect("stdout" in block).toBe(true);
      expect("stderr" in block).toBe(true);
      expect("startTime" in block).toBe(true);
      expect("metadata" in block).toBe(true);
    });
  });

  describe("updateBlockOutput", () => {
    it("should handle stdout chunk", async () => {
      const result = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.updateBlockOutput(
            "block-1",
            "output line\n",
            ""
          );
        })
      );

      expect(result.blockId).toBe("block-1");
      expect(result.stdoutChunk).toBe("output line\n");
      expect(result.stderrChunk).toBe("");
    });

    it("should handle stderr chunk", async () => {
      const result = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.updateBlockOutput(
            "block-1",
            "",
            "error message\n"
          );
        })
      );

      expect(result.blockId).toBe("block-1");
      expect(result.stdoutChunk).toBe("");
      expect(result.stderrChunk).toBe("error message\n");
    });

    it("should handle both stdout and stderr", async () => {
      const result = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.updateBlockOutput(
            "block-1",
            "normal output",
            "error output"
          );
        })
      );

      expect(result.stdoutChunk).toBe("normal output");
      expect(result.stderrChunk).toBe("error output");
    });

    it("should handle empty chunks", async () => {
      const result = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.updateBlockOutput("block-1", "", "");
        })
      );

      expect(result.stdoutChunk).toBe("");
      expect(result.stderrChunk).toBe("");
    });

    it("should handle large output chunks", async () => {
      const largeOutput = "x".repeat(10000);

      const result = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.updateBlockOutput(
            "block-1",
            largeOutput,
            ""
          );
        })
      );

      expect(result.stdoutChunk).toBe(largeOutput);
      expect(result.stdoutChunk.length).toBe(10000);
    });

    it("should handle multiline output", async () => {
      const multilineOutput = "line1\nline2\nline3\n";

      const result = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.updateBlockOutput(
            "block-1",
            multilineOutput,
            ""
          );
        })
      );

      expect(result.stdoutChunk).toBe(multilineOutput);
    });

    it("should handle special characters in output", async () => {
      const specialOutput = "!@#$%^&*()_+-=[]{}|;:',.<>?/";

      const result = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.updateBlockOutput(
            "block-1",
            specialOutput,
            ""
          );
        })
      );

      expect(result.stdoutChunk).toBe(specialOutput);
    });

    it("should handle unicode in output", async () => {
      const unicodeOutput = "Hello 世界 🌍 مرحبا";

      const result = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.updateBlockOutput(
            "block-1",
            unicodeOutput,
            ""
          );
        })
      );

      expect(result.stdoutChunk).toBe(unicodeOutput);
    });
  });

  describe("updateBlockStatus", () => {
    it("should update status to running", async () => {
      const result = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.updateBlockStatus("block-1", "running");
        })
      );

      expect(result.blockId).toBe("block-1");
      expect(result.status).toBe("running");
      expect(result.exitCode).toBeUndefined();
    });

    it("should update status to success with exit code", async () => {
      const result = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.updateBlockStatus("block-1", "success", 0);
        })
      );

      expect(result.status).toBe("success");
      expect(result.exitCode).toBe(0);
    });

    it("should update status to failure with exit code", async () => {
      const result = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.updateBlockStatus("block-1", "failure", 1);
        })
      );

      expect(result.status).toBe("failure");
      expect(result.exitCode).toBe(1);
    });

    it("should update status to interrupted", async () => {
      const result = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.updateBlockStatus(
            "block-1",
            "interrupted",
            130
          );
        })
      );

      expect(result.status).toBe("interrupted");
      expect(result.exitCode).toBe(130);
    });

    it("should handle all valid status values", async () => {
      const statuses: BlockStatus[] = [
        "idle",
        "running",
        "success",
        "failure",
        "interrupted",
      ];

      const results = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          const updates = yield* Effect.all(
            statuses.map((status) =>
              service.updateBlockStatus("block-1", status)
            )
          );
          return updates;
        })
      );

      expect(results).toHaveLength(5);
      expect(results.map((r) => r.status)).toEqual(statuses);
    });

    it("should handle various exit codes", async () => {
      const exitCodes = [0, 1, 127, 255, -1];

      const results = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* Effect.all(
            exitCodes.map((code) =>
              service.updateBlockStatus("block-1", "success", code)
            )
          );
        })
      );

      expect(results.map((r) => r.exitCode)).toEqual(exitCodes);
    });

    it("should handle status update without exit code", async () => {
      const result = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.updateBlockStatus("block-1", "running");
        })
      );

      expect(result.exitCode).toBeUndefined();
    });
  });

  describe("listBlocks", () => {
    it("should return empty array initially", async () => {
      const blocks = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.listBlocks();
        })
      );

      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks).toHaveLength(0);
    });
  });

  describe("clearBlocks", () => {
    it("should execute without error", async () => {
      const result = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          yield* service.clearBlocks();
          return "cleared";
        })
      );

      expect(result).toBe("cleared");
    });

    it("should handle multiple clears", async () => {
      const result = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          yield* service.clearBlocks();
          yield* service.clearBlocks();
          yield* service.clearBlocks();
          return "cleared multiple times";
        })
      );

      expect(result).toBe("cleared multiple times");
    });
  });

  describe("Block lifecycle workflow", () => {
    it("should handle complete block lifecycle", async () => {
      const lifecycle = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;

          // Create
          const block = yield* service.createBlock("npm test");
          expect(block.status).toBe("idle");

          // Update to running
          const running = yield* service.updateBlockStatus(
            block.id,
            "running"
          );
          expect(running.status).toBe("running");

          // Add output
          const withOutput = yield* service.updateBlockOutput(
            block.id,
            "Test output\n",
            ""
          );
          expect(withOutput.stdoutChunk).toBe("Test output\n");

          // Mark success
          const success = yield* service.updateBlockStatus(
            block.id,
            "success",
            0
          );
          expect(success.status).toBe("success");

          return { blockId: block.id, finalStatus: success.status };
        })
      );

      expect(lifecycle.finalStatus).toBe("success");
      expect(lifecycle.blockId).toBeDefined();
    });

    it("should handle failure lifecycle", async () => {
      const lifecycle = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;

          const block = yield* service.createBlock("failing-cmd");

          yield* service.updateBlockStatus(block.id, "running");

          yield* service.updateBlockOutput(
            block.id,
            "",
            "Error: command not found\n"
          );

          const failed = yield* service.updateBlockStatus(
            block.id,
            "failure",
            127
          );

          return { status: failed.status, exitCode: failed.exitCode };
        })
      );

      expect(lifecycle.status).toBe("failure");
      expect(lifecycle.exitCode).toBe(127);
    });

    it("should handle interrupted lifecycle", async () => {
      const lifecycle = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;

          const block = yield* service.createBlock("long-running-cmd");

          yield* service.updateBlockStatus(block.id, "running");

          // Output some data before interrupt
          yield* service.updateBlockOutput(
            block.id,
            "partial output\n",
            ""
          );

          // Interrupt
          const interrupted = yield* service.updateBlockStatus(
            block.id,
            "interrupted",
            130
          );

          return { status: interrupted.status, exitCode: interrupted.exitCode };
        })
      );

      expect(lifecycle.status).toBe("interrupted");
      expect(lifecycle.exitCode).toBe(130);
    });
  });

  describe("Multiple blocks", () => {
    it("should create multiple independent blocks", async () => {
      const blocks = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;

          const block1 = yield* service.createBlock("cmd1");
          const block2 = yield* service.createBlock("cmd2");
          const block3 = yield* service.createBlock("cmd3");

          return [block1, block2, block3];
        })
      );

      expect(blocks).toHaveLength(3);
      expect(blocks[0].command).toBe("cmd1");
      expect(blocks[1].command).toBe("cmd2");
      expect(blocks[2].command).toBe("cmd3");
    });

    it("should update blocks independently", async () => {
      const results = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;

          const block1 = yield* service.createBlock("cmd1");
          const block2 = yield* service.createBlock("cmd2");

          // Update blocks differently
          const update1 = yield* service.updateBlockStatus(
            block1.id,
            "running"
          );
          const update2 = yield* service.updateBlockStatus(
            block2.id,
            "success",
            0
          );

          return { update1, update2 };
        })
      );

      expect(results.update1.status).toBe("running");
      expect(results.update2.status).toBe("success");
    });
  });

  describe("Edge cases", () => {
    it("should handle very long block IDs", async () => {
      const longId = "a".repeat(1000);

      const result = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;
          return yield* service.updateBlockStatus(longId, "running");
        })
      );

      expect(result.blockId).toBe(longId);
    });

    it("should handle rapid status changes", async () => {
      const results = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;

          const block = yield* service.createBlock("test");

          const update1 = yield* service.updateBlockStatus(
            block.id,
            "running"
          );
          const update2 = yield* service.updateBlockStatus(
            block.id,
            "failure",
            1
          );
          const update3 = yield* service.updateBlockStatus(
            block.id,
            "success",
            0
          );

          return [update1.status, update2.status, update3.status];
        })
      );

      expect(results).toEqual(["running", "failure", "success"]);
    });

    it("should handle rapid output updates", async () => {
      const results = await runBlockService(
        Effect.gen(function* () {
          const service = yield* BlockService;

          const outputs = yield* Effect.all([
            service.updateBlockOutput("block-1", "line1\n", ""),
            service.updateBlockOutput("block-1", "line2\n", ""),
            service.updateBlockOutput("block-1", "line3\n", ""),
          ]);

          return outputs;
        })
      );

      expect(results).toHaveLength(3);
      expect(results[0].stdoutChunk).toBe("line1\n");
      expect(results[1].stdoutChunk).toBe("line2\n");
      expect(results[2].stdoutChunk).toBe("line3\n");
    });
  });
});
