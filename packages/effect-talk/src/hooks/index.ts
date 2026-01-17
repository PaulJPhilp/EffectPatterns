import { Effect } from "effect";
import { useCallback, useEffect, useRef, useState } from "react";
import { CommandExecutor } from "../services/CommandExecutor";
import { createEffectRunner } from "../services/ReactIntegrationService";
import type { Block, Session } from "../types";
import { generateId } from "../types";

/**
 * Hook to manage blocks in the current session
 */
export function useBlocks(initialBlocks: Block[] = []) {
    const [blocks, setBlocks] = useState<Block[]>(initialBlocks);

    const addBlock = useCallback((command: string) => {
        const block: Block = {
            id: generateId(),
            command,
            status: "idle",
            stdout: "",
            stderr: "",
            startTime: Date.now(),
            metadata: {},
        };
        setBlocks((prev) => [...prev, block]);
        return block;
    }, []);

    const updateBlock = useCallback(
        (blockId: string, updates: Partial<Block>) => {
            setBlocks((prev) =>
                prev.map((b) => (b.id === blockId ? { ...b, ...updates } : b)),
            );
        },
        [],
    );

    const clearBlocks = useCallback(() => {
        setBlocks([]);
    }, []);

    return { blocks, addBlock, updateBlock, clearBlocks };
}

/**
 * Hook to manage sessions
 */
export function useSessions() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSession, setCurrentSession] = useState<Session | null>(null);

    const createSession = useCallback(() => {
        const session: Session = {
            id: generateId(),
            blocks: [],
            activeBlockId: null,
            workingDirectory: process.cwd(),
            environment: process.env as Record<string, string>,
            createdAt: Date.now(),
            lastModified: Date.now(),
        };
        setSessions((prev) => [...prev, session]);
        setCurrentSession(session);
        return session;
    }, []);

    const updateSession = useCallback((updates: Partial<Session>) => {
        setCurrentSession((prev) =>
            prev ? { ...prev, ...updates, lastModified: Date.now() } : null,
        );
    }, []);

    return { sessions, currentSession, createSession, updateSession };
}

/**
 * Hook to run async commands and capture output
 * Bridges Effect-based services with React component state
 */
export function useAsyncCommand() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const runnerRef = useRef(createEffectRunner());

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            runnerRef.current.dispose();
        };
    }, []);

    const executeCommand = useCallback(
        async (command: string, cwd?: string, env?: Record<string, string>) => {
            setIsLoading(true);
            setError(null);
            try {
                // Run the Effect and wait for result
                const result = await runnerRef.current.runEffect(
                    Effect.gen(function* () {
                        const executor = yield* CommandExecutor;
                        yield* executor.executeCommand(command, cwd, env);
                        return { success: true, command };
                    }),
                );
                return result;
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                setError(message);
                return { success: false, error: message };
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    return { executeCommand, isLoading, error };
}
