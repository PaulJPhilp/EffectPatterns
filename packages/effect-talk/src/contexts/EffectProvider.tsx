import React, { useCallback, useEffect, useRef, useState } from "react";
import { Effect } from "effect";
import type { Block, Session } from "../types";
import { SessionStore } from "../services/SessionStore";
import { CommandExecutor } from "../services/CommandExecutor";
import { PersistenceService } from "../services/PersistenceService";
import { EffectTalkLayer } from "../services/index";
import { createEffectRunner } from "../services/ReactIntegrationService";

/**
 * Context type for Effect-based state management
 * This provides a unified state source replacing React's useState
 */
type EffectContextType = {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  executeCommand: (
    cmd: string,
    cwd?: string,
    env?: Record<string, string>
  ) => Promise<void>;
  addBlock: (block: Block) => Promise<void>;
  updateBlock: (blockId: string, updates: Partial<Block>) => Promise<void>;
  clearBlocks: () => Promise<void>;
  setActiveBlock: (blockId: string | null) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  saveSession: () => Promise<void>;
  restoreSession: (sessionId: string) => Promise<void>;
};

export const EffectContext = React.createContext<EffectContextType | null>(null);

interface EffectProviderProps {
  children: React.ReactNode;
  autoRestore?: boolean;
}

/**
 * EffectProvider wraps the application with a unified Effect-based state layer
 * Replaces fragmented React state with a single source of truth backed by Effect.Ref
 */
export function EffectProvider({
  children,
  autoRestore = true,
}: EffectProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runnerRef = useRef(createEffectRunner());

  // Initialize session on mount
  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(true);
      try {
        const result = await runnerRef.current.runEffect(
          Effect.gen(function* () {
            const persistenceService = yield* PersistenceService;
            const sessionStore = yield* SessionStore;

            // Try to restore last session if autoRestore is enabled
            if (autoRestore) {
              const lastSession = yield* persistenceService.getLastSession();
              if (lastSession) {
                yield* sessionStore.restoreSession(lastSession);
                return lastSession;
              }
            }

            // Otherwise return current (empty) session
            const currentSession = yield* sessionStore.getSession();
            return currentSession;
          }).pipe(Effect.provide(EffectTalkLayer))
        );

        setSession(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        // Create a new empty session on error
        const newSession = await runnerRef.current.runEffect(
          Effect.gen(function* () {
            const store = yield* SessionStore;
            const session = yield* store.getSession();
            return session;
          }).pipe(Effect.provide(EffectTalkLayer))
        );
        setSession(newSession);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();

    return () => {
      runnerRef.current.dispose();
    };
  }, [autoRestore]);

  const refreshSession = useCallback(async () => {
    try {
      const result = await runnerRef.current.runEffect(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const currentSession = yield* store.getSession();
          return currentSession;
        }).pipe(Effect.provide(EffectTalkLayer))
      );
      setSession(result);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    }
  }, []);

  const executeCommand = useCallback(
    async (
      cmd: string,
      cwd?: string,
      env?: Record<string, string>
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        await runnerRef.current.runEffect(
          Effect.gen(function* () {
            const executor = yield* CommandExecutor;
            yield* executor.executeCommand(cmd, cwd, env);
          }).pipe(Effect.provide(EffectTalkLayer))
        );
        await refreshSession();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [refreshSession]
  );

  const addBlock = useCallback(
    async (block: Block) => {
      setIsLoading(true);
      try {
        await runnerRef.current.runEffect(
          Effect.gen(function* () {
            const store = yield* SessionStore;
            yield* store.addBlock(block);
          }).pipe(Effect.provide(EffectTalkLayer))
        );
        await refreshSession();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [refreshSession]
  );

  const updateBlock = useCallback(
    async (blockId: string, updates: Partial<Block>) => {
      setIsLoading(true);
      try {
        await runnerRef.current.runEffect(
          Effect.gen(function* () {
            const store = yield* SessionStore;
            yield* store.updateSession((currentSession) => ({
              ...currentSession,
              blocks: currentSession.blocks.map((b) =>
                b.id === blockId ? { ...b, ...updates } : b
              ),
            }));
          }).pipe(Effect.provide(EffectTalkLayer))
        );
        await refreshSession();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [refreshSession]
  );

  const clearBlocks = useCallback(async () => {
    setIsLoading(true);
    try {
      await runnerRef.current.runEffect(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          yield* store.clearBlocks();
        }).pipe(Effect.provide(EffectTalkLayer))
      );
      await refreshSession();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [refreshSession]);

  const setActiveBlock = useCallback(
    async (blockId: string | null) => {
      try {
        await runnerRef.current.runEffect(
          Effect.gen(function* () {
            const store = yield* SessionStore;
            yield* store.setActiveBlock(blockId);
          }).pipe(Effect.provide(EffectTalkLayer))
        );
        await refreshSession();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      }
    },
    [refreshSession]
  );

  const deleteSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    try {
      await runnerRef.current.runEffect(
        Effect.gen(function* () {
          const persistence = yield* PersistenceService;
          yield* persistence.deleteSession(sessionId);
        }).pipe(Effect.provide(EffectTalkLayer))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSession = useCallback(async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      await runnerRef.current.runEffect(
        Effect.gen(function* () {
          const persistence = yield* PersistenceService;
          yield* persistence.saveSession(session);
        }).pipe(Effect.provide(EffectTalkLayer))
      );
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const restoreSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    try {
      const result = await runnerRef.current.runEffect(
        Effect.gen(function* () {
          const persistence = yield* PersistenceService;
          const store = yield* SessionStore;
          const restoredSession = yield* persistence.loadSession(sessionId);
          if (restoredSession) {
            yield* store.restoreSession(restoredSession);
          }
          return restoredSession;
        }).pipe(Effect.provide(EffectTalkLayer))
      );
      setSession(result);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: EffectContextType = {
    session,
    isLoading,
    error,
    executeCommand,
    addBlock,
    updateBlock,
    clearBlocks,
    setActiveBlock,
    deleteSession,
    saveSession,
    restoreSession,
  };

  return (
    <EffectContext.Provider value={value}>{children}</EffectContext.Provider>
  );
}

/**
 * Hook to access Effect context within EffectProvider
 * Throws error if used outside of EffectProvider
 */
export function useEffectTalk(): EffectContextType {
  const context = React.useContext(EffectContext);
  if (!context) {
    throw new Error("useEffectTalk must be used within EffectProvider");
  }
  return context;
}
