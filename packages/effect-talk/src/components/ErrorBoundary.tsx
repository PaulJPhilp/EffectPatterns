import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error) => React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary to catch and handle React rendering errors
 * Prevents the entire application from crashing due to component errors
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
    // Could send to error reporting service here
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback ? (
        this.props.fallback(this.state.error)
      ) : (
        <div
          style={{
            padding: "20px",
            backgroundColor: "#1e1e1e",
            color: "#d4d4d4",
            fontFamily: "monospace",
            fontSize: "12px",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              maxWidth: "600px",
              textAlign: "center",
            }}
          >
            <h2 style={{ color: "#f48771", marginBottom: "20px" }}>
              Something went wrong
            </h2>

            <div
              style={{
                backgroundColor: "#252526",
                padding: "15px",
                borderRadius: "4px",
                marginBottom: "20px",
                textAlign: "left",
                border: "1px solid #3e3e3e",
              }}
            >
              <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
                Error:
              </div>
              <pre
                style={{
                  margin: 0,
                  overflow: "auto",
                  maxHeight: "200px",
                  color: "#ce9178",
                }}
              >
                {this.state.error.message}
              </pre>

              <div style={{ marginTop: "15px", marginBottom: "10px", fontWeight: "bold" }}>
                Stack trace:
              </div>
              <pre
                style={{
                  margin: 0,
                  overflow: "auto",
                  maxHeight: "200px",
                  color: "#858585",
                  fontSize: "10px",
                }}
              >
                {this.state.error.stack}
              </pre>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#007acc",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontFamily: "monospace",
                }}
              >
                Reload App
              </button>
              <button
                onClick={() => {
                  // Try to recover by clearing state
                  if (
                    typeof window !== "undefined" &&
                    window.localStorage
                  ) {
                    window.localStorage.clear();
                    window.location.reload();
                  }
                }}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#6a6a6a",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontFamily: "monospace",
                }}
              >
                Clear & Reload
              </button>
            </div>

            <p
              style={{
                marginTop: "20px",
                fontSize: "11px",
                color: "#888",
              }}
            >
              If this error persists, please report it to the development team.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
