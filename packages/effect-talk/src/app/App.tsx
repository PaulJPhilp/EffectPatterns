import { useEffect } from "react";
import { BlockList } from "../components/BlockList";
import { CommandInput } from "../components/CommandInput";
import { Layout } from "../components/Layout";
import { Sidebar } from "../components/Sidebar";
import { useAsyncCommand, useBlocks, useSessions } from "../hooks";
import "./App.css";

/**
 * Main EffectTalk application component
 */
export function App() {
  const { blocks, addBlock, updateBlock } = useBlocks();
  const { currentSession, createSession, updateSession } = useSessions();
  const { executeCommand, isLoading } = useAsyncCommand();

  // Initialize session on mount
  useEffect(() => {
    createSession();
  }, []);

  const handleCommandSubmit = async (command: string) => {
    if (!currentSession) return;

    // Create new block
    const block = { ...addBlock(command) };
    updateBlock(block.id, { status: "running" });
    updateSession({ activeBlockId: block.id });

    // Execute command with session context
    const result = await executeCommand(
      command,
      currentSession.workingDirectory,
      currentSession.environment,
    );

    // Update block with result
    if (result.success) {
      updateBlock(block.id, {
        status: "success",
        stdout: "Command executed successfully",
        exitCode: 0,
        endTime: Date.now(),
      });
    } else {
      updateBlock(block.id, {
        status: "failure",
        stderr: result.error || "Command failed",
        exitCode: 1,
        endTime: Date.now(),
      });
    }
  };

  const handleInterrupt = () => {
    if (currentSession?.activeBlockId) {
      updateBlock(currentSession.activeBlockId, {
        status: "interrupted",
        endTime: Date.now(),
      });
      updateSession({ activeBlockId: null });
    }
  };

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
            {currentSession?.activeBlockId ? "Running" : "Ready"}
          </div>
        </div>
      }
      sidebar={
        currentSession ? <Sidebar session={currentSession} /> : undefined
      }
      main={
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <BlockList
            blocks={blocks}
            activeBlockId={currentSession?.activeBlockId}
            onBlockSelect={(blockId) => {
              updateSession({ activeBlockId: blockId });
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

export default App;
