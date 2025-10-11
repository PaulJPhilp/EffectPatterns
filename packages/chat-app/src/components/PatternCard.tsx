import type { PatternSummary } from "@effect-patterns/toolkit"

interface PatternCardProps {
  pattern: PatternSummary
  onSelect?: (pattern: PatternSummary) => void
}

export function PatternCard({ pattern, onSelect }: PatternCardProps) {
  return (
    <div
      onClick={() => onSelect?.(pattern)}
      style={{
        padding: "1rem",
        border: "1px solid #ddd",
        borderRadius: "8px",
        backgroundColor: "white",
        cursor: onSelect ? "pointer" : "default",
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        if (onSelect) {
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none"
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "0.5rem", color: "#333" }}>
        {pattern.title}
      </h3>

      <p style={{ marginBottom: "0.5rem", color: "#666", fontSize: "0.9rem" }}>
        {pattern.description}
      </p>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {pattern.tags.slice(0, 5).map((tag) => (
          <span
            key={tag}
            style={{
              padding: "0.25rem 0.5rem",
              backgroundColor: "#f0f0f0",
              borderRadius: "4px",
              fontSize: "0.75rem",
              color: "#555",
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div
        style={{
          marginTop: "0.5rem",
          fontSize: "0.75rem",
          color: "#999",
        }}
      >
        Level: {pattern.difficulty}
      </div>
    </div>
  )
}
