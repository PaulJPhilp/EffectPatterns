# Search Fix Verification Guide

## Changes Implemented

### 1. Diagnostic Logging ✅
**Location**: `packages/mcp-server/src/tools/tool-implementations.ts` (line 550-577)

**What it does**:
- Checks total patterns in database before each search
- Logs to stderr: `[DIAGNOSTIC] Total patterns in Database: X`
- Returns error if fewer than 10 patterns found

**To verify**:
- Restart the MCP server
- Run a search query
- Check stderr/logs for: `[DIAGNOSTIC] Total patterns in Database: X`
- If X < 10: Database seeding issue (not search logic)
- If X >= 10: Search logic issue

### 2. Keyword Splitting Search ✅
**Location**: `packages/toolkit/src/repositories/effect-pattern.ts` (line 123-185)

**What it does**:
- Splits query by spaces: "error handling" → ["error", "handling"]
- Uses AND logic: ALL keywords must match
- Searches across: id (slug), title, summary, tags
- Normalizes separators: "error handling" matches "error-handling"

**To verify**:
1. Search for "error handling" (should find patterns with "error-handling" in ID)
2. Search for "catchTag catchTags" (should find patterns with both terms)
3. Check that results include patterns where keywords appear in different fields

### 3. SYSTEM CATALOG Fallback ✅
**Location**: `packages/mcp-server/src/tools/tool-implementations.ts` (line 347-444)

**What it does**:
- When 0 results found, shows: `### SYSTEM CATALOG: 0 Matches for '[query]'`
- Lists 10 real pattern IDs from database
- Instructs agent to select from the list

**To verify**:
- Search for a query that returns 0 results
- Check response includes SYSTEM CATALOG section with 10 pattern IDs

## Next Steps

### 1. **REBUILD MCP Server** ⚠️ CRITICAL
The server runs from compiled `dist/` folder. **You MUST rebuild before restarting:**

```bash
cd packages/mcp-server

# Rebuild the MCP server (this compiles TypeScript to dist/)
bun run mcp:build

# OR rebuild and run in one command:
bun run mcp

# If using start-mcp.sh script, rebuild first:
bun run mcp:build
# Then restart (the script will use the rebuilt dist/)
```

**Why rebuild is needed:**
- `start-mcp.sh` executes `dist/mcp-stdio.js` (compiled code)
- TypeScript changes won't be picked up until rebuild
- The `mcp` script auto-rebuilds, but if using `start-mcp.sh` directly, rebuild manually

### 2. Check Diagnostic Output
After restarting, search for "error handling" and check logs for:
```
[DIAGNOSTIC] Total patterns in Database: X
```

### 3. Test Keyword Splitting
Try these searches:
- "error handling" → Should find "error-handling" patterns
- "retry timeout" → Should find patterns with both terms
- "catchTag catchTags" → Should find patterns with both terms

### 4. Verify Results
If searches still return 0 results:
1. Check diagnostic log shows patterns exist (X >= 10)
2. Check database has patterns with matching keywords
3. Verify keyword splitting is working (check SQL query logs)

## Troubleshooting

### Diagnostic Log Not Appearing
- **Cause**: Server not rebuilt (runs from compiled `dist/` folder)
- **Fix**: Run `bun run mcp:build` to rebuild, then restart server
- **Verify**: Check logs for `[DIAGNOSTIC] Total patterns in Database: X` after rebuild

### Searches Return 0 Results
- **Check**: Diagnostic log shows patterns exist
- **If X < 10**: Database seeding issue
- **If X >= 10**: Check keyword splitting logic

### Keyword Splitting Not Working
- **Check**: SQL query logs to see if keywords are split
- **Verify**: Repository file has keyword splitting code
- **Test**: Search for single keyword vs multiple keywords

## Files Modified

1. `packages/mcp-server/src/tools/tool-implementations.ts`
   - Added diagnostic logging (line 550-577)
   - Updated SYSTEM CATALOG format (line 397-400)

2. `packages/toolkit/src/repositories/effect-pattern.ts`
   - Fixed syntax error (moved normalizeForSearch outside)
   - Implemented keyword splitting search (line 123-185)
