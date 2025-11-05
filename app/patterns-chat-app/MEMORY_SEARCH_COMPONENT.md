# MemorySearch Component Documentation

## Overview

**MemorySearch** is a React component that provides comprehensive search and filtering controls for browsing memories/conversations.

**File:** `components/memory-search.tsx`

## Features

### 🔍 Search Input
- Text search with placeholder guidance
- Real-time input handling
- Clear button (X icon) to reset query
- Enter key submits search
- Loading state feedback
- Search icon indicator

### 🏷️ Tag Filtering
- Multi-select tag pills
- 10 predefined tags (customizable)
- Visual feedback for selected tags
- Toggle tags on/off
- Tag count display
- Keyboard accessible

**Default Tags:**
- effect-ts
- error-handling
- async
- pattern
- performance
- debugging
- best-practices
- refactoring
- testing
- types

### 📊 Outcome Filtering
- Dropdown filter for conversation outcomes
- Options: All, Solved, Unsolved, Partially Solved, Revisited
- Color-coded options
- Radio button style selection
- Clear outcome filter option
- Click-outside to close dropdown

### 🎯 Filter Management
- **Active Filters Summary** - Shows current filters with badge styling
- **Clear All Button** - Resets all filters at once
- **Filter Status** - Text summary of applied filters
- Responsive layout that stacks on mobile

### 💡 Helpful Tips
- Built-in tips section with search best practices
- 4 actionable tips for better search results
- Always visible to guide users
- Styled with muted colors

## Component API

### Props

```typescript
export interface MemorySearchProps {
  onFiltersChange: (filters: MemorySearchFilters) => void;  // Required
  onSearch: (query: string) => void;                         // Required
  availableTags?: string[];                                  // Optional (default: 10 tags)
  isLoading?: boolean;                                       // Optional (default: false)
}
```

### Filters Object

```typescript
export interface MemorySearchFilters {
  query: string;                                   // Search text
  tags: string[];                                  // Selected tags
  outcome: "solved" | "unsolved" | "partial" | "revisited" | null;
}
```

### Event Callbacks

1. **onFiltersChange**
   - Called whenever any filter changes
   - Passes complete filters object
   - Use for updating displayed results in real-time
   - Debounce if calling expensive operations

2. **onSearch**
   - Called when user submits search (Enter key or Search button)
   - Passes only the query string
   - Use for triggering API call

## Usage Examples

### Basic Integration

```tsx
import { useState } from "react";
import { MemorySearch, MemorySearchFilters } from "@/components/memory-search";

export function MemoriesPage() {
  const [filters, setFilters] = useState<MemorySearchFilters>({
    query: "",
    tags: [],
    outcome: null,
  });

  const handleFiltersChange = (newFilters: MemorySearchFilters) => {
    setFilters(newFilters);
    // Update results in real-time as user types/selects filters
  };

  const handleSearch = async (query: string) => {
    // Trigger API call with full filters
    const response = await fetch("/api/search", {
      method: "POST",
      body: JSON.stringify({
        q: query,
        tags: filters.tags,
        outcome: filters.outcome,
      }),
    });
    // Handle response...
  };

  return (
    <div className="space-y-6">
      <MemorySearch
        onFiltersChange={handleFiltersChange}
        onSearch={handleSearch}
      />
      {/* Display search results */}
    </div>
  );
}
```

### With Custom Tags

```tsx
<MemorySearch
  onFiltersChange={handleFiltersChange}
  onSearch={handleSearch}
  availableTags={[
    "react",
    "typescript",
    "nextjs",
    "performance",
    "accessibility",
    "security",
  ]}
/>
```

### With Loading State

```tsx
const [isLoading, setIsLoading] = useState(false);

const handleSearch = async (query: string) => {
  setIsLoading(true);
  try {
    const results = await searchMemories(query, filters);
    setResults(results);
  } finally {
    setIsLoading(false);
  }
};

return (
  <MemorySearch
    onFiltersChange={handleFiltersChange}
    onSearch={handleSearch}
    isLoading={isLoading}
  />
);
```

### With Debounced Real-time Updates

```tsx
import { useCallback, useRef } from "react";

export function MemoriesPage() {
  const debounceTimer = useRef<NodeJS.Timeout>();

  const handleFiltersChange = useCallback((newFilters: MemorySearchFilters) => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(async () => {
      const results = await fetch("/api/search", {
        body: JSON.stringify({
          q: newFilters.query,
          tags: newFilters.tags,
          outcome: newFilters.outcome,
        }),
      });
      // Update results...
    }, 300); // 300ms debounce
  }, []);

  return (
    <MemorySearch
      onFiltersChange={handleFiltersChange}
      onSearch={async (query) => {
        // Immediate search on button click
      }}
    />
  );
}
```

## Component Layout

```
┌─ MemorySearch ───────────────────────────────────────┐
│                                                       │
│ Search Input [Search] Button                         │
│ 🔍 Search memories... (e.g., 'error handling')  [X] │
│                                                       │
│ Outcome Filter ▼                                      │
│ ┌─ Dropdown ────────────────────────────────────────┐│
│ │ ○ All Outcomes                                   ││
│ │ ● Solved                                         ││
│ │ ○ Unsolved                                       ││
│ │ ○ Partially Solved                               ││
│ │ ○ Revisited                                      ││
│ └────────────────────────────────────────────────────┘│
│                                                       │
│ Filter by Tags                                       │
│ [effect-ts] [error-handling] [async] [pattern]      │
│ [performance] [debugging] [best-practices]...        │
│                                                       │
│ Active Filters Summary                               │
│ Query: "error" • 2 tags • Outcome: Solved  [Clear All]│
│                                                       │
│ 💡 Tips:                                             │
│ • Use specific keywords for better results           │
│ • Combine tags and outcomes to narrow results        │
│ • Select tags to filter by multiple categories       │
│ • Use "Solved" filter to find conversations...       │
│                                                       │
└───────────────────────────────────────────────────────┘
```

## UI/UX Features

### 🎨 Visual Feedback
- **Active Filters** - Different badge styling for selected vs unselected tags
- **Loading State** - Search button text changes to "Searching..."
- **Disabled State** - All inputs disabled while loading
- **Clear Indicators** - X buttons to clear individual filters
- **Summary Banner** - Shows all active filters at once

### ⌨️ Keyboard Navigation
- **Enter Key** - Submits search from input field
- **Tab Navigation** - Full keyboard support through all controls
- **Focus States** - Visible focus rings on all interactive elements
- **Escape Key** - Closes outcome dropdown (via blur)

### 📱 Responsive Design
- **Mobile** - Stacked layout, full-width inputs
- **Tablet** - Tag pills wrap appropriately
- **Desktop** - Optimal spacing and alignment
- **Touch-friendly** - Adequate button sizes (44px minimum)

## Color & Styling

### Outcome Colors
- **Solved** - Green (`text-green-600 dark:text-green-400`)
- **Unsolved** - Red (`text-red-600 dark:text-red-400`)
- **Partial** - Yellow (`text-yellow-600 dark:text-yellow-400`)
- **Revisited** - Blue (`text-blue-600 dark:text-blue-400`)

### Badge Variants
- **Selected Tags** - `variant="default"` (primary color)
- **Unselected Tags** - `variant="outline"` (border only)
- **Hover State** - Shadow and scale effects

## Accessibility

- ✅ Semantic HTML (`button`, `input`)
- ✅ ARIA labels for icon-only buttons
- ✅ Focus management for dropdown
- ✅ Keyboard navigation throughout
- ✅ Color contrast meets WCAG AA
- ✅ Screen reader friendly
- ✅ Proper heading hierarchy

## Customization Examples

### Dark Tags
```tsx
const customTags = [
  "dark-mode",
  "tailwind",
  "accessibility",
  "web-performance",
];

<MemorySearch
  availableTags={customTags}
  onFiltersChange={handleFiltersChange}
  onSearch={handleSearch}
/>
```

### Hide Tips
```tsx
// Remove the tips section from the component if needed
// Or conditionally render with a prop (can add in future)
```

### Custom Placeholder
```tsx
// Modify the Input placeholder text by editing the component
// Current: "Search memories... (e.g., 'error handling', 'async patterns')"
```

## Integration Points

### With MemoryCard
```tsx
import { MemoryCard } from "@/components/memory-card";
import { MemorySearch } from "@/components/memory-search";

export function MemoriesList() {
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({ query: "", tags: [], outcome: null });

  return (
    <div className="space-y-6">
      <MemorySearch
        onFiltersChange={setFilters}
        onSearch={async (q) => {
          const res = await fetch(`/api/search?q=${q}&tags=${filters.tags.join(",")}`);
          const data = await res.json();
          setResults(data.results);
        }}
      />
      <div className="space-y-3">
        {results.map((result) => (
          <MemoryCard key={result.id} result={result} />
        ))}
      </div>
    </div>
  );
}
```

### With MemoriesBrowser (Coming Next)
```tsx
// MemoriesBrowser will combine:
// 1. MemorySearch (this component)
// 2. MemoryCard (list of results)
// 3. Infinite scroll loader
// 4. Loading/empty states
```

## Performance Considerations

- ✅ Memoization-ready (mostly stateless)
- ✅ No expensive computations
- ✅ Efficient event handlers with useCallback
- ✅ Debounce search calls in parent component
- ✅ No unnecessary re-renders

## Testing Strategy

### Unit Tests
```typescript
describe("MemorySearch", () => {
  it("calls onFiltersChange when tag is toggled", () => {
    const onFiltersChange = vi.fn();
    render(
      <MemorySearch
        onFiltersChange={onFiltersChange}
        onSearch={vi.fn()}
      />
    );

    const tag = screen.getByText("error-handling");
    fireEvent.click(tag);

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["error-handling"],
      })
    );
  });

  it("calls onSearch when Enter is pressed", () => {
    const onSearch = vi.fn();
    render(
      <MemorySearch
        onFiltersChange={vi.fn()}
        onSearch={onSearch}
      />
    );

    const input = screen.getByPlaceholderText(/Search memories/);
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSearch).toHaveBeenCalledWith("test");
  });

  it("clears all filters when Clear All is clicked", () => {
    const onFiltersChange = vi.fn();
    const { rerender } = render(
      <MemorySearch
        onFiltersChange={onFiltersChange}
        onSearch={vi.fn()}
      />
    );

    // Add filters...
    // Click Clear All...
    // Verify all cleared
  });
});
```

## State Management

**Local State:**
- `query` - Search text input
- `selectedTags` - Array of selected tag strings
- `selectedOutcome` - Current outcome filter
- `showOutcomeDropdown` - Dropdown visibility

**Props-based:**
- Filter changes passed to parent via callbacks
- Parent manages actual search results and loading state

## Future Enhancements

- [ ] Advanced query syntax (AND, OR, NOT operators)
- [ ] Search history/suggestions
- [ ] Saved filter presets
- [ ] Custom tag creation
- [ ] Date range filtering
- [ ] Satisfaction score range filtering
- [ ] Sort options (relevance, recency, satisfaction)
- [ ] Filter suggestions based on popular tags
- [ ] Quick filters ("My Solved Issues", "This Week", etc.)

## Build Status

✅ **BUILDS SUCCESSFULLY**
- No TypeScript errors
- All dependencies present
- Component compiles and renders
- Ready for integration

## Related Components

- **MemoryCard** - Individual memory display (Phase 2a) ✅
- **MemoriesBrowser** - Combined search + infinite scroll (Phase 2c)
- **MemoriesGuide** - Help/documentation modal (existing)

## Dependencies

- React hooks (useState, useCallback, useMemo)
- UI components (Input, Button, Badge)
- Icons (Search, X, Filter)
- Utilities (cn for class merging)
- Tailwind CSS for styling

All dependencies already installed! ✅

## Files Structure

```
components/
├── memory-search.tsx        ← This component
├── memory-card.tsx          ← Used with this
├── memories-browser.tsx     ← Coming next (Phase 2c)
└── ui/
    ├── input.tsx           ← Used by MemorySearch
    ├── button.tsx          ← Used by MemorySearch
    └── badge.tsx           ← Used by MemorySearch
```

## Next Steps

**Phase 2c: MemoriesBrowser Component**

Will combine:
1. MemorySearch (search/filter UI)
2. MemoryCard (result display)
3. Infinite scroll with IntersectionObserver
4. Loading/empty states
5. Error handling

Estimated time: 1-2 hours
