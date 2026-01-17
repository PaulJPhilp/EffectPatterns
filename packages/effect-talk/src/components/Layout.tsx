import React from "react";

interface LayoutProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  main: React.ReactNode;
  footer?: React.ReactNode;
  sidebarWidth?: "sm" | "md" | "lg";
}

/**
 * Main layout structure with header, sidebar, main content, and footer
 */
export const Layout: React.FC<LayoutProps> = ({
  header,
  sidebar,
  main,
  footer,
  sidebarWidth = "md",
}) => {
  const sidebarWidthMap = {
    sm: "150px",
    md: "250px",
    lg: "350px",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#1e1e1e",
        color: "#d4d4d4",
      }}
    >
      {/* Header */}
      {header && (
        <div
          style={{
            borderBottom: "1px solid #3e3e3e",
            padding: "8px 16px",
            backgroundColor: "#252526",
          }}
        >
          {header}
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        {sidebar && (
          <div
            style={{
              width: sidebarWidthMap[sidebarWidth],
              borderRight: "1px solid #3e3e3e",
              padding: "8px",
              backgroundColor: "#252526",
              overflowY: "auto",
            }}
          >
            {sidebar}
          </div>
        )}

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {main}
        </div>
      </div>

      {/* Footer */}
      {footer && (
        <div
          style={{
            borderTop: "1px solid #3e3e3e",
            padding: "8px 16px",
            backgroundColor: "#252526",
            fontSize: "12px",
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};

export default Layout;
