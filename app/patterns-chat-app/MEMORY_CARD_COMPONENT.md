# MemoryCard Component Documentation

## Overview

**MemoryCard** is a reusable React component that displays individual memory/conversation items with comprehensive metadata visualization and interaction options.

**File:** `components/memory-card.tsx`

## Features

### ✅ Display Elements

1. **Title/Summary**
   - Extracted from first line of conversation content
   - Truncated to 100 characters
   - Fallback to "Untitled Conversation" if empty

2. **Timestamp**
   - Relative date (e.g., "2 hours ago", "3 days ago")
   - Uses `date-fns` `formatDistanceToNow()` for natural language
   - Precise datetime available in tooltip

3. **Outcome Badge**
   - **Solved** - Green, checkmark icon
   - **Unsolved** - Red, alert icon
   - **Partially Solved** - Yellow, help icon
   - **Revisited** - Blue, tag icon
   - Fully typed and color-coded

4. **Tags**
   - Displays up to 5 tags as badge pills
   - Shows "+N" for additional tags
   - Outline variant for secondary styling

5. **Satisfaction Score**
   - Progress bar visualization (0-5 scale)
   - Gradient color (yellow → green)
   - Percentage display
   - Only shown if score > 0

6. **Relevance Scores**
   - 4-column grid showing scoring breakdown
   - **Semantic** - Vector similarity (meaning-based match)
   - **Keyword** - Keyword relevance (text match)
   - **Recency** - Time-based boost
   - **Final Score** - Weighted combination
   - Each shows as percentage

7. **Preview Text**
   - 150-character excerpt from next 2 lines
   - Line-clamped to 2 lines
   - Gray text for secondary importance

8. **Metadata Footer**
   - Memory ID (chat ID) in monospace code
   - Copy-to-clipboard button with feedback
   - View full conversation link

### ✨ Interactive Features

- **Hover Effects**
  - Enhanced shadow on hover
  - Optional ring effect when selectable
  - Smooth transitions (200ms)

- **Selection Mode**
  - Optional `isSelectable` prop for batch operations
  - Visual ring indicator when selected
  - `onSelect` callback for handling selection

- **Copy to Clipboard**
  - Click copy button to copy memory ID
  - Shows success feedback (Check icon)
  - Auto-resets after 2 seconds

- **View Conversation**
  - Links to full chat conversation
  - Routes to `/chat/{chatId}`
  - Stop propagation to prevent card selection conflicts

## Component API

### Props

```typescript
export interface MemoryCardProps {
  result: SemanticSearchResult;           // Required: Search result data
  onSelect?: (result: SemanticSearchResult) => void;  // Selection callback
  isSelectable?: boolean;                 // Enable selection mode
  isSelected?: boolean;                   // Current selection state
}
```

### SemanticSearchResult Structure

```typescript
{
  id: string;                        // Memory/chat ID
  metadata: {
    chatId: string;
    userId: string;
    type: string;
    content: string;                // Full conversation text
    timestamp: string;               // ISO 8601 datetime
    outcome?: "solved" | "unsolved" | "partial" | "revisited";
    tags?: string[];
    satisfactionScore?: number;     // 0-5 scale
  };
  score: {
    vectorSimilarity: number;        // 0-1
    keywordRelevance: number;        // 0-1
    recencyBoost: number;            // 0-1
    satisfactionBoost: number;       // 0-1
    finalScore: number;              // 0-1 (weighted)
  };
}
```

## Usage Examples

### Basic Display

```tsx
import { MemoryCard } from "@/components/memory-card";

export function MemoryList({ results }) {
  return (
    <div className="space-y-3">
      {results.map((result) => (
        <MemoryCard key={result.id} result={result} />
      ))}
    </div>
  );
}
```

### With Selection Mode

```tsx
import { useState } from "react";
import { MemoryCard } from "@/components/memory-card";

export function SelectableMemoryList({ results }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleSelect = (result) => {
    const newSelected = new Set(selected);
    if (newSelected.has(result.id)) {
      newSelected.delete(result.id);
    } else {
      newSelected.add(result.id);
    }
    setSelected(newSelected);
  };

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <MemoryCard
          key={result.id}
          result={result}
          isSelectable
          isSelected={selected.has(result.id)}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
```

### In Infinite Scroll List

```tsx
import { useEffect, useRef } from "react";
import { MemoryCard, MemoryCardSkeleton } from "@/components/memory-card";

export function InfiniteMemoryList({ results, isLoading, onLoadMore }) {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isLoading) {
        onLoadMore();
      }
    });

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isLoading, onLoadMore]);

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <MemoryCard key={result.id} result={result} />
      ))}

      {isLoading && <MemoryCardSkeleton />}

      <div ref={observerTarget} />
    </div>
  );
}
```

## Styling

### Design System Integration

- ✅ Uses Card components from `components/ui/card.tsx`
- ✅ Uses Badge components from `components/ui/badge.tsx`
- ✅ Uses Button components from `components/ui/button.tsx`
- ✅ Tailwind CSS for styling
- ✅ Dark mode support (uses `dark:` prefix)
- ✅ Responsive design (scales from mobile to desktop)

### Customization

Add custom className to extend styling:

```tsx
// Via parent wrapper
<div className="max-w-2xl mx-auto">
  {results.map((result) => (
    <MemoryCard key={result.id} result={result} />
  ))}
</div>
```

## Loading State

**MemoryCardSkeleton** provides a loading placeholder:

```tsx
import { MemoryCardSkeleton } from "@/components/memory-card";

export function LoadingMemoryList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <MemoryCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

## Accessibility

- ✅ Semantic HTML structure
- ✅ ARIA labels for icon buttons (`sr-only` text)
- ✅ Keyboard navigation support (buttons, links)
- ✅ Proper heading hierarchy
- ✅ Color contrast meets WCAG AA standards
- ✅ Focus states on interactive elements

## Performance

- ✅ Memoization-ready (stateless except for copy feedback)
- ✅ No heavy computations (date formatting cached)
- ✅ Efficient rendering with line-clamp CSS
- ✅ Copy state resets automatically (no memory leak)

## Date Formatting

Uses `date-fns` `formatDistanceToNow()` for relative dates:

```
formatDistanceToNow(new Date("2024-11-01 10:00"), { addSuffix: true })
// Output: "2 hours ago"
```

**Supported formats:**
- "a few seconds ago"
- "30 seconds ago"
- "2 minutes ago"
- "30 minutes ago"
- "2 hours ago"
- "yesterday"
- "2 days ago"
- "a month ago"

## Score Interpretation

### Semantic Score (60% weight)
- **0.0-0.3**: Low relevance (not similar)
- **0.3-0.6**: Moderate relevance
- **0.6-0.8**: High relevance (similar meaning)
- **0.8-1.0**: Very high relevance (very similar)

### Keyword Score (30% weight)
- **0-0.33**: Few keywords match
- **0.33-0.66**: Some keywords match
- **0.66-1.0**: Most/all keywords match

### Recency Score (7% weight)
- **1.0**: Within 1 day
- **0.5**: 1-7 days old
- **0.1**: 7-30 days old
- **0.01**: 30+ days old

### Satisfaction Score (3% weight)
- Maps user satisfaction 1-5 to 0-1 scale
- Higher scores boost final relevance

### Final Score
Weighted combination of all factors used for ranking.

## Outcome Badges Styling

```typescript
// Solved - Green
bg-green-100 text-green-800 dark:bg-green-900

// Unsolved - Red
bg-red-100 text-red-800 dark:bg-red-900

// Partial - Yellow
bg-yellow-100 text-yellow-800 dark:bg-yellow-900

// Revisited - Blue
bg-blue-100 text-blue-800 dark:bg-blue-900
```

## Icons Used

- `CheckCircle` - Solved outcome
- `AlertCircle` - Unsolved outcome
- `HelpCircle` - Partial/unknown outcome
- `Tag` - Revisited outcome
- `ChevronRight` - View conversation link
- `Copy` - Copy to clipboard
- `Check` - Copy success

All from `lucide-react`.

## Related Components

- **MemoriesBrowser** - Combines MemoryCard with search and infinite scroll
- **MemorySearch** - Search and filter controls
- **MemoriesGuide** - Help/documentation modal

## Future Enhancements

- [ ] Add click handler to expand card details inline
- [ ] Add context menu for quick actions (delete, archive)
- [ ] Add conversation preview modal
- [ ] Add sharing functionality
- [ ] Add favorite/bookmark feature
- [ ] Add conversation comparison (side-by-side)
- [ ] Add edit/update memory functionality
- [ ] Add conversation statistics (word count, time taken)

## Testing

### Unit Test Example

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryCard } from "@/components/memory-card";

describe("MemoryCard", () => {
  const mockResult = {
    id: "conv_123",
    metadata: {
      chatId: "chat_123",
      userId: "user_123",
      type: "conversation",
      content: "How to handle errors?\nUse try-catch blocks.",
      timestamp: new Date().toISOString(),
      outcome: "solved",
      tags: ["error-handling", "javascript"],
      satisfactionScore: 4.5,
    },
    score: {
      vectorSimilarity: 0.85,
      keywordRelevance: 0.9,
      recencyBoost: 1.0,
      satisfactionBoost: 0.9,
      finalScore: 0.87,
    },
  };

  it("renders memory card with content", () => {
    render(<MemoryCard result={mockResult} />);
    expect(screen.getByText("How to handle errors?")).toBeInTheDocument();
    expect(screen.getByText("Solved")).toBeInTheDocument();
  });

  it("copies memory ID to clipboard", async () => {
    const user = userEvent.setup();
    render(<MemoryCard result={mockResult} />);

    const copyButton = screen.getByTitle("Copy memory ID");
    await user.click(copyButton);

    expect(await screen.findByTestId("copy-success")).toBeInTheDocument();
  });

  it("shows satisfaction score", () => {
    render(<MemoryCard result={mockResult} />);
    expect(screen.getByText("4.5/5")).toBeInTheDocument();
  });
});
```

## Build Status

✅ **BUILDS SUCCESSFULLY**
- No TypeScript errors
- All dependencies installed
- Component compiles and renders
- Ready for integration

## File Structure

```
components/
├── memory-card.tsx          ← Main component
├── ui/
│   ├── card.tsx            ← Used by MemoryCard
│   ├── badge.tsx           ← Used by MemoryCard
│   └── button.tsx          ← Used by MemoryCard
└── memory-search.tsx       ← Coming next in Phase 2b
```

## Next Component: MemorySearch

The MemorySearch component will provide:
- Search input with debouncing
- Tag filter pills
- Outcome filter dropdown
- Clear filters button

Expected in Phase 2b.
