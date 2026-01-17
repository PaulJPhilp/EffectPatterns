import React, { useEffect, useRef } from "react";
import type { Block } from "../types";
import BlockRenderer from "./BlockRenderer";

interface BlockListProps {
  blocks: Block[];
  activeBlockId?: string;
  onBlockSelect?: (blockId: string) => void;
}

/**
 * Scrollable list of blocks with auto-scroll to newest
 */
export const BlockList: React.FC<BlockListProps> = ({
  blocks,
  activeBlockId,
  onBlockSelect,
}) => {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new blocks are added
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [blocks.length]);

  if (blocks.length === 0) {
    return (
      <div style={{ padding: "20px", color: "#666" }}>
        No blocks yet. Start by entering a command.
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
      {blocks.map((block) => (
        <BlockRenderer
          key={block.id}
          block={block}
          isActive={block.id === activeBlockId}
          onSelect={onBlockSelect}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
};

export default BlockList;
