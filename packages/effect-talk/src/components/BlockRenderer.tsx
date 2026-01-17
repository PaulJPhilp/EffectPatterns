import React from "react";
import type { Block } from "../types";

interface BlockRendererProps {
  block: Block;
  isActive?: boolean;
  onSelect?: (blockId: string) => void;
}

/**
 * Renders a single Block with command, status, and output
 */
export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  isActive = false,
  onSelect,
}) => {
  const statusSymbol =
    block.status === "running"
      ? "▶"
      : block.status === "success"
        ? "✓"
        : block.status === "failure"
          ? "✗"
          : block.status === "interrupted"
            ? "⊘"
            : "○";

  const statusColor =
    block.status === "running"
      ? "\x1b[33m"
      : block.status === "success"
        ? "\x1b[32m"
        : block.status === "failure"
          ? "\x1b[31m"
          : block.status === "interrupted"
            ? "\x1b[36m"
            : "\x1b[37m";

  const resetColor = "\x1b[0m";

  return (
    <div
      style={{
        padding: "1 2",
        border: isActive ? "┌─" : "  ",
        borderColor: isActive ? "blue" : "gray",
      }}
      onClick={() => onSelect?.(block.id)}
    >
      <div>
        {statusColor}
        {statusSymbol}
        {resetColor} {block.command}
      </div>
      {block.stdout && <pre>{block.stdout.substring(0, 500)}</pre>}
      {block.stderr && (
        <pre style={{ color: "red" }}>{block.stderr.substring(0, 500)}</pre>
      )}
      {block.exitCode !== undefined && (
        <div>
          Exit code: {block.exitCode}
          {block.endTime &&
            ` (${((block.endTime - block.startTime) / 1000).toFixed(2)}s)`}
        </div>
      )}
    </div>
  );
};

export default BlockRenderer;
