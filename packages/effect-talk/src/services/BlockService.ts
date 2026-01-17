import { Effect } from "effect";
import type { Block, BlockStatus } from "../types";
import { generateId } from "../types";
import { LoggerService } from "./LoggerService";

/**
 * BlockService manages discrete blocks of interaction
 * Handles block lifecycle: creation, status updates, and retrieval
 */
export class BlockService extends Effect.Service<BlockService>()(
  "BlockService",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const logger = yield* LoggerService;

      return {
        /**
         * Create a new Block with the given command
         */
        createBlock: (command: string) =>
          Effect.gen(function* () {
            const id = generateId();
            const block: Block = {
              id,
              command,
              status: "idle" as const,
              stdout: "",
              stderr: "",
              startTime: Date.now(),
              metadata: {},
            };
            yield* logger.debug(`Created block: ${id}`);
            return block;
          }),

        /**
         * Update a block's output buffers
         */
        updateBlockOutput: (
          blockId: string,
          stdoutChunk: string,
          stderrChunk: string,
        ) =>
          Effect.gen(function* () {
            yield* logger.debug(
              `Updated block ${blockId} output: stdout=${stdoutChunk.length} bytes, stderr=${stderrChunk.length} bytes`,
            );
            return { blockId, stdoutChunk, stderrChunk };
          }),

        /**
         * Update a block's status and exit code
         */
        updateBlockStatus: (
          blockId: string,
          status: BlockStatus,
          exitCode?: number,
        ) =>
          Effect.gen(function* () {
            yield* logger.debug(
              `Updated block ${blockId} status to ${status}${exitCode !== undefined ? ` (exit code: ${exitCode})` : ""}`,
            );
            return { blockId, status, exitCode };
          }),

        /**
         * List all blocks in current session
         */
        listBlocks: () =>
          Effect.gen(function* () {
            yield* logger.debug("Listing all blocks");
            return [] as Block[];
          }),

        /**
         * Clear all blocks
         */
        clearBlocks: () =>
          Effect.gen(function* () {
            yield* logger.info("Clearing all blocks");
            return void 0;
          }),
      };
    }),
    dependencies: [LoggerService.Default],
  },
) { }
