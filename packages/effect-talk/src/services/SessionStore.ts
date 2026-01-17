import { Effect, Ref } from "effect";
import type { Block, EffectTalkConfig, Session } from "../types";
import { generateId } from "../types";
import { LoggerService } from "./LoggerService";

/**
 * SessionStore manages mutable session state using Effect.Ref
 * This is the central state holder for EffectTalk
 */
export class SessionStore extends Effect.Service<SessionStore>()(
    "SessionStore",
    {
        accessors: true,
        effect: Effect.gen(function* () {
            const logger = yield* LoggerService;

            // Initialize with an empty session
            const initialSession: Session = {
                id: generateId(),
                blocks: [],
                activeBlockId: null,
                workingDirectory: "/",
                environment: {},
                createdAt: Date.now(),
                lastModified: Date.now(),
            };

            const stateRef = yield* Ref.make(initialSession);

            return {
                /**
                 * Get the current session state
                 */
                getSession: () =>
                    Effect.gen(function* () {
                        const session = yield* Ref.get(stateRef);
                        yield* logger.debug(`Retrieved session: ${session.id}`);
                        return session;
                    }),

                /**
                 * Update the session with a transformation function
                 */
                updateSession: (fn: (session: Session) => Session) =>
                    Effect.gen(function* () {
                        const current = yield* Ref.get(stateRef);
                        const updated = fn(current);
                        yield* Ref.set(stateRef, updated);
                        yield* logger.debug(`Updated session: ${updated.id}`);
                    }),

                /**
                 * Add a new block to the session
                 */
                addBlock: (block: Block) =>
                    Effect.gen(function* () {
                        const current = yield* Ref.get(stateRef);
                        const updated: Session = {
                            ...current,
                            blocks: [...current.blocks, block],
                            lastModified: Date.now(),
                        };
                        yield* Ref.set(stateRef, updated);
                        yield* logger.debug(`Added block: ${block.id}`);
                    }),

                /**
                 * Set the active block ID
                 */
                setActiveBlock: (blockId: string | null) =>
                    Effect.gen(function* () {
                        const current = yield* Ref.get(stateRef);
                        const updated: Session = {
                            ...current,
                            activeBlockId: blockId,
                            lastModified: Date.now(),
                        };
                        yield* Ref.set(stateRef, updated);
                        yield* logger.debug(`Set active block: ${blockId}`);
                    }),

                /**
                 * Clear all blocks
                 */
                clearBlocks: () =>
                    Effect.gen(function* () {
                        const current = yield* Ref.get(stateRef);
                        const updated: Session = {
                            ...current,
                            blocks: [],
                            activeBlockId: null,
                            lastModified: Date.now(),
                        };
                        yield* Ref.set(stateRef, updated);
                        yield* logger.info("Cleared all blocks");
                    }),

                /**
                 * Reset to a new session
                 */
                resetSession: () =>
                    Effect.gen(function* () {
                        const newSession: Session = {
                            id: generateId(),
                            blocks: [],
                            activeBlockId: null,
                            workingDirectory: "/",
                            environment: {},
                            createdAt: Date.now(),
                            lastModified: Date.now(),
                        };
                        yield* Ref.set(stateRef, newSession);
                        yield* logger.info(`Reset to new session: ${newSession.id}`);
                    }),

                /**
                 * Restore a session from disk
                 */
                restoreSession: (session: Session) =>
                    Effect.gen(function* () {
                        yield* Ref.set(stateRef, session);
                        yield* logger.info(`Restored session: ${session.id}`);
                    }),

                /**
                 * Get a specific block by ID
                 */
                getBlock: (blockId: string) =>
                    Effect.gen(function* () {
                        const session = yield* Ref.get(stateRef);
                        const block = session.blocks.find((b: Block) => b.id === blockId);
                        return block || null;
                    }),

                /**
                 * Get all blocks
                 */
                getAllBlocks: () =>
                    Effect.gen(function* () {
                        const session = yield* Ref.get(stateRef);
                        return session.blocks;
                    }),

                /**
                 * Get the currently active block
                 */
                getActiveBlock: () =>
                    Effect.gen(function* () {
                        const session = yield* Ref.get(stateRef);
                        if (!session.activeBlockId) return null;
                        const block = session.blocks.find(
                            (b: Block) => b.id === session.activeBlockId,
                        );
                        return block || null;
                    }),

                /**
                 * Execute a command (placeholder for integration)
                 */
                executeCommand: (
                    command: string,
                    cwd?: string,
                    env?: Record<string, string>,
                ) =>
                    Effect.gen(function* () {
                        yield* logger.debug(`Executing command: ${command}`);
                    }),
            };
        }),
        dependencies: [LoggerService.Default],
    },
) { }

/**
 * Configuration service for EffectTalk
 */
export class ConfigService extends Effect.Service<ConfigService>()(
    "ConfigService",
    {
        accessors: true,
        effect: Effect.gen(function* () {
            const config: EffectTalkConfig = {
                sessionStorePath: "~/.effecttalk/sessions",
                maxHistorySize: 1000,
                debounceMs: 300,
                ptyCols: 80,
                ptyRows: 24,
            };

            return {
                get: <K extends keyof EffectTalkConfig>(key: K): EffectTalkConfig[K] =>
                    config[key],
                getConfig: () => config,
            };
        }),
    },
) { }
