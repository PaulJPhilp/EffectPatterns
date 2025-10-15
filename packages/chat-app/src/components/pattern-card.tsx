import type { PatternSummary } from '@effect-patterns/toolkit';
import type { CSSProperties, MouseEvent } from 'react';

const MAX_VISIBLE_TAGS = 5;

type PatternCardProps = {
  pattern: PatternSummary;
  onSelect?: (pattern: PatternSummary) => void;
};

const baseStyle: CSSProperties = {
  padding: '1rem',
  border: '1px solid #ddd',
  borderRadius: '8px',
  backgroundColor: 'white',
  transition: 'box-shadow 0.2s',
  display: 'block',
  width: '100%',
  textAlign: 'left',
  boxShadow: 'none',
};

const hoverShadow = '0 2px 8px rgba(0,0,0,0.1)';

const renderContent = (pattern: PatternSummary) => (
  <>
    <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#333' }}>
      {pattern.title}
    </h3>

    <p style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
      {pattern.description}
    </p>

    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {pattern.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
        <span
          key={tag}
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: '#f0f0f0',
            borderRadius: '4px',
            fontSize: '0.75rem',
            color: '#555',
          }}
        >
          {tag}
        </span>
      ))}
    </div>

    <div
      style={{
        marginTop: '0.5rem',
        fontSize: '0.75rem',
        color: '#999',
      }}
    >
      Level: {pattern.difficulty}
    </div>
  </>
);

export function PatternCard({ pattern, onSelect }: PatternCardProps) {
  const handleMouseEnter = (
    event: MouseEvent<HTMLDivElement | HTMLButtonElement>
  ) => {
    if (onSelect) {
      event.currentTarget.style.boxShadow = hoverShadow;
    }
  };

  const handleMouseLeave = (
    event: MouseEvent<HTMLDivElement | HTMLButtonElement>
  ) => {
    event.currentTarget.style.boxShadow = 'none';
  };

  if (onSelect) {
    return (
      <button
        onClick={() => onSelect(pattern)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ ...baseStyle, cursor: 'pointer', border: '1px solid #ddd' }}
        type="button"
      >
        {renderContent(pattern)}
      </button>
    );
  }

  return (
    <div style={{ ...baseStyle, cursor: 'default' }}>
      {renderContent(pattern)}
    </div>
  );
}
