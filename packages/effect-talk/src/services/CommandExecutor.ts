import { Effect, Stream } from "effect";
import type { Block } from "../types";
import { LoggerService } from "./LoggerService";
import { ProcessService } from "./ProcessService";
import { SessionStore } from "./SessionStore";

/**
 * CommandExecutor orchestrates the complete command execution lifecycle
 * Handles process spawning, stream management, and result aggregation
 */
export class CommandExecutor extends Effect.Service<CommandExecutor>()(
    "CommandExecutor",
    {
        accessors: true,
        effect: Effect.gen(function* () {
            const logger = yield* LoggerService;
            const sessionStore = yield* SessionStore;
            const processService = yield* ProcessService;

            return {
                /**
                 * Execute a command and update the session with results
                 */
                executeCommand: (
                    command: string,
                    cwd?: string,
                    env?: Record<string, string>,
                ) =>
                    Effect.scoped(
                        Effect.gen(function* () {
                            const blockId = generateId();

                            // Create block with "running" status
                            const block: Block = {
                                id: blockId,
                                command,
                                status: "running",
                                stdout: "",
                                stderr: "",
                                startTime: Date.now(),
                                metadata: { pid: undefined, cwd },
                            };

                            // Add block to session and set as active
                            yield* sessionStore.addBlock(block);
                            yield* sessionStore.setActiveBlock(blockId);

                            // Spawn process
                            const processHandle = yield* processService.spawn(
                                command,
                                cwd || "/",
                                env || {},
                            );

                            // Update block with PID
                            yield* sessionStore.updateSession((session) => ({
                                ...session,
                                blocks: session.blocks.map((b) =>
                                    b.id === blockId
                                        ? {
                                            ...b,
                                            metadata: { ...b.metadata, pid: processHandle.pid },
                                        }
                                        : b,
                                ),
                            }));

                            // Get stdout and stderr streams
                            const stdoutStream = yield* processService.recordStream(
                                processHandle.pid,
                                "stdout",
                            );
                            const stderrStream = yield* processService.recordStream(
                                processHandle.pid,
                                "stderr",
                            );

                            // Process stdout stream
                            yield* Stream.runForEach(stdoutStream, (data: string) =>
                                Effect.gen(function* () {
                                    yield* sessionStore.updateSession((session) => {
                                        const blocks = session.blocks.map((b) => {
                                            if (b.id !== blockId) return b;
                                            return { ...b, stdout: b.stdout + data };
                                        });
                                        return { ...session, blocks };
                                    });

                                    yield* logger.debug(
                                        `[stdout] ${data.substring(0, 50)}${data.length > 50 ? "..." : ""
                                        }`,
                                    );
                                }),
                            );

                            // Process stderr stream
                            yield* Stream.runForEach(stderrStream, (data: string) =>
                                Effect.gen(function* () {
                                    yield* sessionStore.updateSession((session) => {
                                        const blocks = session.blocks.map((b) => {
                                            if (b.id !== blockId) return b;
                                            return { ...b, stderr: b.stderr + data };
                                        });
                                        return { ...session, blocks };
                                    });

                                    yield* logger.debug(
                                        `[stderr] ${data.substring(0, 50)}${data.length > 50 ? "..." : ""
                                        }`,
                                    );
                                }),
                            );

                            // Update block with final status
                            const exitCode = 0;
                            yield* sessionStore.updateSession((session) => {
                                const blocks = session.blocks.map((b) =>
                                    b.id === blockId
                                        ? {
                                            ...b,
                                            status:
                                                exitCode === 0
                                                    ? ("success" as const)
                                                    : ("failure" as const),
                                            exitCode,
                                            endTime: Date.now(),
                                        }
                                        : b,
                                );
                                return { ...session, blocks, activeBlockId: null };
                            });

                            yield* logger.info(`Command completed: ${command}`);
                        }),
                    ),

                /**
                 * Interrupt a running command
                 */
                interruptCommand: (blockId: string) =>
                    Effect.gen(function* () {
                        const block = yield* sessionStore.getBlock(blockId);
                        if (!block || block.status !== "running") return;

                        const pid = block.metadata?.pid as number | undefined;
                        if (!pid) {
                            yield* logger.warn(`No PID found for block ${blockId}`);
                            return;
                        }

                        yield* processService.interrupt(pid);

                        yield* sessionStore.updateSession((session) => ({
                            ...session,
                            blocks: session.blocks.map((b) =>
                                b.id === blockId
                                    ? {
                                        ...b,
                                        status: "interrupted" as const,
                                        endTime: Date.now(),
                                    }
                                    : b,
                            ),
                            activeBlockId: null,
                        }));

                        yield* logger.info(`Interrupted block: ${blockId}`);
                    }),

                /**
                 * Get the status of a block
                 */
                getBlockStatus: (blockId: string) =>
                    Effect.gen(function* () {
                        const block = yield* sessionStore.getBlock(blockId);
                        return block?.status || null;
                    }),
            };
        }),
        dependencies: [
            LoggerService.Default,
            SessionStore.Default,
            ProcessService.Default,
        ],
    },
) { }

function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
}
