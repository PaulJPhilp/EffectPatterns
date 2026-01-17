import { BlockList } from "../components/BlockList";
import { CommandInput } from "../components/CommandInput";
import { Layout } from "../components/Layout";
import { Sidebar } from "../components/Sidebar";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { EffectProvider, useEffectTalk } from "../contexts/EffectProvider";
import { generateId } from "../types";
import type { Block } from "../types";
import "./App.css";

/**
 * AppContent component that uses EffectTalk context
 * Separated from App to allow EffectProvider wrapping
 */
function AppContent() {
  const {
    session,
    isLoading,
    error,
    executeCommand,
    addBlock,
    updateBlock,
    setActiveBlock,
    clearBlocks,
    saveSession,
  } = useEffectTalk();

  const handleCommandSubmit = async (command: string) => {
    if (!session) return;

    // Create new block
    const newBlock: Block = {
      id: generateId(),
      command,
      status: "running",
      stdout: "",
      stderr: "",
      startTime: Date.now(),
      metadata: {},
    };

    // Add block and set as active
    await addBlock(newBlock);
    await setActiveBlock(newBlock.id);

    // Execute command with session context
    try {
      await executeCommand(
        command,
        session.workingDirectory,
        session.environment
      );

      // Update block on success
      await updateBlock(newBlock.id, {
        status: "success",
        exitCode: 0,
        endTime: Date.now(),
      });
    } catch (err) {
      // Update block on failure
      const errorMessage =
        err instanceof Error ? err.message : "Command failed";
      await updateBlock(newBlock.id, {
        status: "failure",
        stderr: errorMessage,
        exitCode: 1,
        endTime: Date.now(),
      });
    } finally {
      // Save session
      await saveSession();
    }
  };

  const handleInterrupt = async () => {
    if (session?.activeBlockId) {
      await updateBlock(session.activeBlockId, {
        status: "interrupted",
        endTime: Date.now(),
      });
      await setActiveBlock(null);
    }
  };

  if (!session) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#1e1e1e",
          color: "#d4d4d4",
          fontFamily: "monospace",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "10px" }}>
            Loading EffectTalk...
          </div>
          {error && (
            <div style={{ color: "#f48771", fontSize: "12px" }}>
              Error: {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  const blocks = session.blocks || [];

  return (
    <Layout
      header={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "16px" }}>EffectTalk</h1>
          <div style={{ fontSize: "12px", color: "#888" }}>
            Blocks: {blocks.length} | Status:{" "}
            {session.activeBlockId ? "Running" : "Ready"}
            {error && <span style={{ color: "#f48771" }}> | Error</span>}
          </div>
        </div>
      }
      sidebar={<Sidebar session={session} />}
      main={
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {error && (
            <div
              style={{
                backgroundColor: "#5c2222",
                color: "#f48771",
                padding: "10px",
                fontSize: "12px",
                borderBottom: "1px solid #3e3e3e",
              }}
            >
              Error: {error}
            </div>
          )}
          <BlockList
            blocks={blocks}
            activeBlockId={session.activeBlockId || undefined}
            onBlockSelect={(blockId) => {
              setActiveBlock(blockId);
            }}
          />
          <CommandInput
            onSubmit={handleCommandSubmit}
            onInterrupt={handleInterrupt}
            history={blocks.map((b) => b.command)}
            disabled={isLoading}
          />
        </div>
      }
      footer={
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Cmd+K: Omnibar | Cmd+B: Toggle Sidebar | Cmd+L: Clear</span>
          <span>v0.1.0</span>
        </div>
      }
    />
  );
}

/**
 * Main EffectTalk application component
 * Wrapped with EffectProvider and ErrorBoundary
 */
export function App() {
  return (
    <ErrorBoundary>
      <EffectProvider autoRestore={true}>
        <AppContent />
      </EffectProvider>
    </ErrorBoundary>
  );
}

export default App;
