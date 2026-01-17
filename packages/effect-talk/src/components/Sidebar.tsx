import React from "react";
import type { Session } from "../types";
import { formatTimestamp } from "../types";

interface SidebarProps {
  session?: Session;
  width?: "sm" | "md" | "lg";
}

/**
 * Sidebar displays workspace context and session information
 */
export const Sidebar: React.FC<SidebarProps> = ({ session }) => {
  if (!session) {
    return (
      <div style={{ fontSize: "12px", color: "#888" }}>No session loaded</div>
    );
  }

  return (
    <div style={{ fontSize: "12px", lineHeight: "1.6" }}>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: "bold", color: "#61afef" }}>Session</div>
        <div
          style={{ color: "#888", fontSize: "11px", wordBreak: "break-all" }}
        >
          {session.id.substring(0, 16)}...
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: "bold", color: "#61afef" }}>Directory</div>
        <div
          style={{ color: "#d4d4d4", wordBreak: "break-all", fontSize: "11px" }}
        >
          {session.workingDirectory}
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: "bold", color: "#61afef" }}>Blocks</div>
        <div style={{ color: "#d4d4d4" }}>{session.blocks.length}</div>
      </div>

      {session.activeBlockId && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontWeight: "bold", color: "#61afef" }}>
            Active Block
          </div>
          <div
            style={{
              color: "#d4d4d4",
              fontSize: "11px",
              wordBreak: "break-all",
            }}
          >
            {session.activeBlockId.substring(0, 16)}...
          </div>
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: "bold", color: "#61afef" }}>Created</div>
        <div style={{ color: "#888", fontSize: "11px" }}>
          {formatTimestamp(session.createdAt)}
        </div>
      </div>

      <div>
        <div style={{ fontWeight: "bold", color: "#61afef" }}>
          Last Modified
        </div>
        <div style={{ color: "#888", fontSize: "11px" }}>
          {formatTimestamp(session.lastModified)}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

export default Sidebar;
