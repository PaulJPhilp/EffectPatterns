# MemoriesBrowser Component Documentation

## Overview

**MemoriesBrowser** is a comprehensive React component that combines search, filtering, and infinite scroll to provide a complete memory browsing experience.

**File:** `components/memories-browser.tsx`

## Features

### 🔍 Integrated Search & Filtering
- Uses MemorySearch component for all search/filter controls
- Debounced search (500ms) to reduce API calls
- Real-time filter updates
- Error handling and validation

### ♾️ Infinite Scroll Pagination
- IntersectionObserver API for performance
- Automatically loads next page when scrolling near bottom
- 100px margin to start loading before reaching end
- Loading indicator during pagination
- "End of memories" message when complete

### 📋 Result Display
- MemoryCard components for each result
- Results summary showing count and total
- Loading skeleton placeholders (MemoryCardSkeleton)
- Active filters display

### 🎯 States & Feedback
- **Loading State** - Shows 3 skeleton cards
- **Error State** - Alert with error message
- **Empty State** - Inbox icon + helpful tips
- **Initial State** - Start searching prompt
- **End State** - "You've reached the end" message

### 🎨 Selection Mode (Optional)
- Optional memory selection for batch operations
- Selection counter in sticky footer
- Clear selection button
- Selected state persists during scroll

### 📊 Pagination Details
- Offset-based pagination (20 items per page)
- Total count tracking
- "hasMore" flag to know when to stop
- Next offset pre-calculated for efficiency

## Component API

### Props

```typescript
export interface MemoriesBrowserProps {
  initialQuery?: string;              // Pre-fill search query
  onMemorySelect?: (memory) => void;  // Callback when memory selected
  isSelectable?: boolean;             // Enable multi-select mode
  title?: string;                     // Component title
  description?: string;               // Component description
}
```

### Event Callbacks

1. **onMemorySelect(memory: SemanticSearchResult)**
   - Called when user clicks a memory card
   - Also called when selecting in multi-select mode
   - Passes full SemanticSearchResult object

## Usage Examples

### Basic Memory Browser

```tsx
import { MemoriesBrowser } from "@/components/memories-browser";

export default function MemoriesPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8">
      <MemoriesBrowser
        title="My Memories"
        description="Browse all your conversations"
      />
    </div>
  );
}
```

### With Initial Query

```tsx
export default function SearchResults() {
  return (
    <MemoriesBrowser
      initialQuery="error handling"
      title="Search Results"
      description="Results for 'error handling'"
    />
  );
}
```

### With Selection Callback

```tsx
export function MemoriesWithActions() {
  const handleMemorySelect = (memory: SemanticSearchResult) => {
    console.log("Selected memory:", memory.id);
    // Could open modal, navigate, etc.
  };

  return (
    <MemoriesBrowser
      onMemorySelect={handleMemorySelect}
      isSelectable={true}
      title="Select Memories"
      description="Choose memories to perform bulk actions"
    />
  );
}
```

### Full Page Component

```tsx
// Using the provided MemoriesBrowserPage component
import { MemoriesBrowserPage } from "@/components/memories-browser";

export default function Page() {
  return <MemoriesBrowserPage />;
}
```

## State Management

### Local State

```typescript
// Search and filtering
const [filters, setFilters] = useState<MemorySearchFilters>({
  query: "",
  tags: [],
  outcome: null,
})

// Pagination
const [results, setResults] = useState<SemanticSearchResult[]>([])
const [offset, setOffset] = useState(0)
const [total, setTotal] = useState(0)
const [hasMore, setHasMore] = useState(true)

// UI states
const [isLoading, setIsLoading] = useState(false)
const [isLoadingMore, setIsLoadingMore] = useState(false)
const [error, setError] = useState<string | null>(null)

// Selection mode
const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set())
```

### Refs

```typescript
// IntersectionObserver target for infinite scroll
const observerTarget = useRef<HTMLDivElement>(null)

// Debounce timer for search
const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

// Track last query to avoid duplicate searches
const lastQueryRef = useRef("")
```

## Data Flow

```
User Input (MemorySearch)
         ↓
handleFiltersChange()
         ↓
Debounce 500ms
         ↓
fetchMemories(isLoadMore: boolean)
         ↓
/api/search API Call
         ↓
Parse PaginatedSearchResults
         ↓
Update state (results, offset, hasMore, total)
         ↓
Render MemoryCard components
         ↓
User scrolls near bottom
         ↓
IntersectionObserver triggers
         ↓
fetchMemories(true) → Load more
         ↓
Append new results
         ↓
Loop until hasMore = false
```

## API Integration

### Search Endpoint
- **Path:** `/api/search`
- **Method:** GET
- **Query Parameters:**
  - `q` - Search query (required)
  - `limit` - Results per page (default: 20)
  - `offset` - Pagination offset (default: 0)
  - `tag` - Tag filter (optional, single tag)
  - `outcome` - Outcome filter (optional)

### Response Format
```typescript
{
  query: string
  offset: number
  limit: number
  total: number              // Total available results
  hasMore: boolean           // More results exist?
  nextOffset?: number        // Calculated next offset
  count: number              // Items in this response
  results: SemanticSearchResult[]
}
```

## Error Handling

### Error States

1. **Empty Query**
   - Message: "Please enter a search query"
   - Type: User error (caught before API call)

2. **API Error (400)**
   - Message: "Please enter a search query"
   - Type: Validation error

3. **API Error (Other)**
   - Message: `Search failed: {statusText}`
   - Type: Server error

4. **Network Error**
   - Message: Caught and logged
   - Type: Connection error

### Error Display
- Red Alert component with AlertCircle icon
- Displayed above results
- Auto-cleared when new search attempted

## Performance Optimizations

### Debouncing
- Search is debounced 500ms after filter change
- Prevents excessive API calls while typing
- Immediate search on button click (no debounce)

### IntersectionObserver
- More efficient than scroll event listener
- 100px rootMargin for preloading
- 0.1 threshold (10% visible)
- Auto-cleanup on unmount

### Memoization
- Callbacks memoized with useCallback
- Dependencies properly tracked
- Prevents unnecessary re-renders

### Lazy Loading
- Results loaded on-demand as user scrolls
- 20 items per page (configurable via API)
- Smooth loading experience

## Infinite Scroll Behavior

### Initial Load
```
1. User enters search query
2. Click Search button
3. Fetch memories with offset=0
4. Display first 20 results
5. Observe target div
```

### During Scroll
```
1. User scrolls down
2. Observer detects target div near viewport
3. Check: hasMore && !isLoading && !isLoadingMore
4. If all true: fetchMemories(true)
5. Append new 20 results
6. Update offset
7. Continue observing
```

### End of Results
```
1. Response has hasMore=false
2. Stop loading more
3. Show "You've reached the end" message
4. Display total count
```

## UI States

### Empty/Initial State
```
🗳️
Start searching
Enter a query or apply filters to browse your memories
```

### Loading State
```
[Skeleton] [Skeleton] [Skeleton]
(animated pulse effect)
```

### Results State
```
Showing 20 of 47 memories

[Memory Card 1]
[Memory Card 2]
...
[Memory Card 20]

[Loading more...]
```

### No Results State
```
🗳️
No memories found
Try adjusting your search or filters

💡 Tips:
• Use different keywords...
• Remove tag filters...
• Check spelling and syntax...
• Try searching for related topics...
```

### Error State
```
⚠️ [Error message]
```

## Selection Mode

### When Enabled
- MemoryCards show selection ring when selected
- Clicking card toggles selection
- Selection persists during infinite scroll
- Sticky footer shows count
- "Clear" button to deselect all

### Use Cases
- Bulk export memories
- Batch tagging
- Conversation comparison
- Multi-memory actions

## Accessibility

- ✅ Semantic HTML
- ✅ ARIA roles (alert for errors)
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Screen reader support
- ✅ Color contrast WCAG AA
- ✅ Loading indicators

## Mobile Responsiveness

- ✅ Full-width on small screens
- ✅ Touch-friendly button sizes (44px min)
- ✅ Optimized spacing for mobile
- ✅ Responsive text sizing
- ✅ Proper viewport handling
- ✅ Sticky footer on mobile

## Customization

### Custom Header
```tsx
<MemoriesBrowser
  title="My Custom Title"
  description="Custom description text"
/>
```

### Custom Tags (via MemorySearch)
The MemorySearch component accepts `availableTags` prop that MemoriesBrowser passes through.

### Styling
Wrap component with custom className:
```tsx
<div className="custom-wrapper">
  <MemoriesBrowser />
</div>
```

## Testing

### Unit Test Example
```typescript
import { render, screen, waitFor } from "@testing-library/react";
import { MemoriesBrowser } from "@/components/memories-browser";

describe("MemoriesBrowser", () => {
  it("fetches and displays memories on search", async () => {
    render(<MemoriesBrowser />);

    const input = screen.getByPlaceholderText(/Search memories/);
    fireEvent.change(input, { target: { value: "test" } });

    const button = screen.getByText("Search");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Showing.*memories/)).toBeInTheDocument();
    });
  });

  it("loads more results on infinite scroll", async () => {
    // Mock API to return hasMore: true on first call
    // Then hasMore: false on second call

    const { container } = render(<MemoriesBrowser />);

    // Trigger infinite scroll
    const target = container.querySelector("[data-observe]");
    // Simulate IntersectionObserver trigger

    await waitFor(() => {
      expect(screen.getByText(/You've reached the end/)).toBeInTheDocument();
    });
  });
});
```

## Performance Metrics

### Expected Performance
- **Initial Load:** ~500ms (includes API call)
- **Subsequent Pagination:** ~300ms per page
- **Search Debounce:** 500ms
- **Memory Usage:** ~2-5MB with 100+ results loaded

### Optimization Tips
- Use debouncing for filter changes (already implemented)
- Implement result caching in parent component
- Consider virtual scrolling if loading 1000+ items
- Use React Query or SWR for better cache management

## Browser Compatibility

- ✅ Chrome/Edge 51+
- ✅ Firefox 55+
- ✅ Safari 12.1+
- ✅ iOS Safari 12.2+
- ⚠️ IE 11 (requires IntersectionObserver polyfill)

## Build Status

✅ **BUILDS SUCCESSFULLY**
- No TypeScript errors
- All dependencies present
- Component compiles and renders
- Ready for deployment

## File Dependencies

```
components/
├── memories-browser.tsx    ← Main component
├── memory-search.tsx       ← Search/filter UI
├── memory-card.tsx         ← Result cards
├── ui/
│   ├── input.tsx           ← Used by MemorySearch
│   ├── button.tsx          ← Used by MemorySearch & MemoryCard
│   ├── badge.tsx           ← Used by MemoryCard
│   └── alert.tsx           ← Used for errors
└── icons.tsx               ← Lucide icons

lib/
├── semantic-search/
│   └── search.ts           ← Type definitions
└── utils.ts                ← cn utility

app/(chat)/api/
└── search/route.ts         ← API endpoint
```

## Next Steps: Phase 2d - UI Integration

Integrate MemoriesBrowser into:
1. **Option A:** Add "Browse" tab to `/memories` page
2. **Option B:** Create `/memories/browse` route
3. **Option C:** Add both

Recommended: Option A - Keep single /memories page with tabs

## Summary

**MemoriesBrowser** provides:
- ✅ Complete search interface
- ✅ Advanced filtering (query, tags, outcome)
- ✅ Infinite scroll pagination
- ✅ Loading/error/empty states
- ✅ Optional batch selection
- ✅ Mobile responsive
- ✅ Accessibility compliant
- ✅ Production ready

Ready for deployment! 🚀
