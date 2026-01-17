import React, { useState } from "react";

interface CommandInputProps {
  onSubmit: (command: string) => void;
  onInterrupt?: () => void;
  history?: string[];
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Multi-line command input with history support
 */
export const CommandInput: React.FC<CommandInputProps> = ({
  onSubmit,
  onInterrupt,
  history = [],
  placeholder = "Enter command (Shift+Enter for multi-line, Ctrl+C to interrupt)...",
  disabled = false,
}) => {
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;

    // Ctrl+C to interrupt
    if (e.ctrlKey && e.code === "KeyC") {
      e.preventDefault();
      onInterrupt?.();
      return;
    }

    // Enter to submit (Shift+Enter for newline)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSubmit(input);
        setInput("");
        setHistoryIndex(-1);
      }
      return;
    }

    // Arrow up/down for history navigation
    if (e.key === "ArrowUp" && !e.shiftKey && input === "") {
      e.preventDefault();
      const nextIndex = historyIndex + 1;
      if (nextIndex < history.length) {
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
      return;
    }

    if (e.key === "ArrowDown" && !e.shiftKey && input !== "") {
      e.preventDefault();
      const nextIndex = historyIndex - 1;
      if (nextIndex >= 0) {
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      } else if (nextIndex < 0) {
        setHistoryIndex(-1);
        setInput("");
      }
      return;
    }
  };

  return (
    <textarea
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%",
        minHeight: "60px",
        padding: "8px",
        fontFamily: "monospace",
        backgroundColor: "#1e1e1e",
        color: "#d4d4d4",
        border: "1px solid #404040",
        borderRadius: "4px",
        fontSize: "12px",
      }}
    />
  );
};

export default CommandInput;
