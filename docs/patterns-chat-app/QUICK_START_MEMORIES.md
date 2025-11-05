# Quick Start: Memory Browsing Feature

## How to Access

### 1. Navigate to Memories Page
```
URL: /memories
```

### 2. You'll See Two Tabs
```
📚 Guide  |  🔍 Browse
```

## Guide Tab (Educational)

Learn about how memories work:
- What are memories?
- Key features (6 highlights)
- How the system works (6 steps)
- Quick tips
- Privacy & security information
- Search tips
- Getting started guide

**Action:** Click "Browse Memories" button to jump to Browse tab

## Browse Tab (Interactive)

### Search for Memories

1. **Enter Search Query**
   - Example: "How do I handle async errors?"
   - Or: "error handling"
   - Or: "retry patterns"

2. **Click Search Button**
   - Or press Enter

3. **View Results**
   - Each memory shows:
     - Title (conversation topic)
     - Timestamp (when saved)
     - Outcome (Solved/Unsolved/Partial/Revisited)
     - Tags (auto-assigned categories)
     - Satisfaction score (0-5)
     - Relevance scores (semantic/keyword/recency/final)

### Filter Results

#### By Tags
Click any tag pill to filter:
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

Multiple tags: Click multiple pills (AND operation)

#### By Outcome
Click the filter dropdown:
- All Outcomes (default)
- Solved (🟢)
- Unsolved (🔴)
- Partially Solved (🟡)
- Revisited (🔵)

#### Clear Filters
Click "Clear All" button to reset everything

### Browse with Infinite Scroll

1. **View First Page**
   - See 20 results
   - Message: "Showing 20 of 47 memories"

2. **Scroll Down**
   - IntersectionObserver detects when near bottom
   - "Loading more..." indicator appears

3. **Next Page Loads**
   - 20 more results appended
   - Updated count: "Showing 40 of 47 memories"

4. **Continue Scrolling**
   - Repeats until all results loaded
   - "You've reached the end" message shows

### View Memory Details

Each memory card shows:

```
┌─ CONVERSATION TITLE ─────────────────────────────────┐
│ 🟢 Solved (Outcome Badge)                    2h ago  │
│                                                       │
│ Conversation preview (200 characters)...             │
│                                                       │
│ Tags: [effect-ts] [error-handling] [async] [+1]     │
│                                                       │
│ Satisfaction: ████░ (4.2/5)                         │
│                                                       │
│ Relevance Scores:                                    │
│   Semantic: 85%  Keyword: 72%  Recency: 90%         │
│   Final Score: 81%                                   │
│                                                       │
│ [Copy ID]  [View Conversation]                      │
└─────────────────────────────────────────────────────┘
```

### Find Answers

**Example 1: Find Solved Issues**
```
1. Filter: Outcome = "Solved"
2. Enter search: "error handling"
3. Scroll through results
4. View the solutions that worked before
```

**Example 2: Browse by Topic**
```
1. Click tag: "async"
2. Results narrow to async-related conversations
3. Click another tag: "error-handling"
4. Further narrowed to async + error handling
5. Click "Clear All" to reset
```

**Example 3: Semantic Search**
```
1. Search: "How do I retry a failed request?"
2. System finds similar conversations even if wording differs
3. Results ranked by meaning (60%) + keywords (30%) + recency (7%) + satisfaction (3%)
4. Scroll to see different approaches
```

## Tips for Better Searches

### Do This ✅
- "How do I handle async errors in Effect?"
- "retry with backoff"
- "error recovery patterns"
- "async timeout handling"

### Avoid This ❌
- "async"
- "error"
- "help"
- Too generic words

### Combine Filters ✅
- Search for "effect-ts" + Filter outcome to "Solved"
- Search for "error" + Tag filter "error-handling" + "async"
- Try different tags to find related conversations

## What Information is Shown

Each memory card includes:

| Field | Example | Meaning |
|-------|---------|---------|
| Title | "Error Handling Pattern" | First line of conversation |
| Timestamp | "2h ago" | When conversation saved |
| Outcome | 🟢 Solved | Did it get solved? |
| Tags | error-handling, async | Auto-assigned topics |
| Satisfaction | ████░ (4.2/5) | How satisfied was outcome? |
| Semantic Score | 85% | Meaning-based relevance |
| Keyword Score | 72% | Keyword match |
| Recency Score | 90% | How recent? |
| Final Score | 81% | Combined relevance |

## Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Navigate between elements |
| Enter | Submit search, activate buttons |
| Space | Toggle tags, activate buttons |
| Arrow Keys | Navigate dropdown menu |
| Escape | Close dropdown |

## Mobile View

All features work on mobile:
- Search input adapts to screen width
- Tags wrap appropriately
- Results scroll smoothly
- Infinite scroll still works
- Touch-friendly buttons (44px minimum)

## Batch Operations (Coming Soon)

Enable "Batch Selection" mode to:
- Select multiple memories
- Perform bulk actions (export, tag, organize)
- Sticky footer shows count
- Clear selection button

## Performance

- **First search:** ~500ms (includes API call)
- **Subsequent pages:** ~300ms (infinite scroll)
- **Tab switch:** <50ms (instant)
- **Mobile:** Same performance, optimized layout

## Troubleshooting

### No Results Found
- ❓ Query too specific?
  → Try broader keywords
- ❓ No memories saved yet?
  → Have more conversations in /chat
- ❓ Filters too restrictive?
  → Click "Clear All" to reset

### Search Too Slow
- ❓ Too many results?
  → Add tag filters to narrow down
- ❓ Old browser?
  → Update to latest Chrome/Firefox/Safari
- ❓ Poor connection?
  → Check network speed

### Infinite Scroll Not Working
- ❓ Reached end of results?
  → See "You've reached the end" message
- ❓ Still loading?
  → Wait for "Loading more..." to complete
- ❓ Browser compatibility?
  → IntersectionObserver supported in all modern browsers

## Learn More

For detailed information, see:
- `MEMORIES_BROWSER_COMPONENT.md` - Full component documentation
- `MEMORY_CARD_COMPONENT.md` - Card component details
- `MEMORY_SEARCH_COMPONENT.md` - Search component details
- `PHASE2_SUMMARY.md` - Complete feature overview

## Keyboard Accessibility

✅ Full keyboard support
✅ Visible focus indicators
✅ Tab order follows visual layout
✅ Enter key to submit
✅ Escape to close dropdowns
✅ Screen reader support

## Browser Compatibility

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 13+
✅ Edge 90+
✅ Mobile Safari 13+
✅ Chrome Mobile 90+

---

**Ready to browse your memories?**

Navigate to `/memories` → Click "🔍 Browse" tab → Start searching!
