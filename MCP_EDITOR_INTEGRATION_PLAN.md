# MCP Code Review Tool - Editor Integration Plan

## Executive Summary

This document outlines the technical plan for connecting the existing MCP code review tool (`review_code`) to the currently active code editor window, enabling real-time architectural feedback as developers write Effect-TS code.

**Current State**: The `review_code` tool exists and functions in isolation via MCP protocol calls.  
**Goal**: Integrate it into the editor's workflow with zero latency, automatic file capture, and inline feedback.

---

## Architecture Overview

### System Components

1. **Editor Integration Layer** (Windsurf, Claude Code, etc.)
   - Monitors active file and cursor position
   - Captures file content automatically
   - Invokes MCP tool calls on demand or via debounced events

2. **MCP Server** (`packages/mcp-server`)
   - Exposes `review_code` tool via stdio transport
   - Validates inputs (file size, TypeScript extension)
   - Delegates to ReviewCodeService

3. **Code Review Service** (`packages/mcp-server/src/services/review-code.ts`)
   - Calls AnalysisService for pattern detection
   - Sorts findings by severity
   - Limits output to MAX_FREE_TIER_RECOMMENDATIONS (3)
   - Returns CodeRecommendation objects

4. **Analysis Core** (`packages/analysis-core`)
   - Pattern matching engine
   - Anti-pattern rule database
   - Finding generator with line numbers and messages

5. **Editor Display Layer**
   - Inline diagnostics/code lens hints
   - Gutter decorations for severity levels
   - Markdown tooltip on hover

---

## Integration Points

### 1. File Capture (Editor → MCP Server)

**Trigger**: 
- On file save
- On manual invocation (command/keystroke)
- Optional: Debounced on content change (500ms)

**Data Captured**:
```typescript
interface ReviewRequest {
  code: string;          // Full file buffer
  filePath: string;      // e.g., "src/services/user.ts"
}
```

**Validation**:
- File size < 100KB (enforced by ReviewCodeService)
- File extension must be `.ts` or `.tsx` (enforced by ReviewCodeService)

---

### 2. MCP Tool Invocation

**Tool**: `review_code` (already registered in `mcp-stdio.ts`, line 256)

**Call Format**:
```json
{
  "code": "export const MyService = Effect.gen(function* () { ... })",
  "filePath": "src/services/user.ts"
}
```

**Response Format**:
```json
{
  "recommendations": [
    {
      "severity": "high|medium|low",
      "title": "Issue Title",
      "line": 42,
      "message": "Detailed explanation..."
    }
  ],
  "meta": {
    "totalFound": 15,
    "hiddenCount": 12,
    "upgradeMessage": "12 more issues... Upgrade to Pro"
  },
  "markdown": "# Code Review Results\n..."
}
```

---

### 3. Display in Editor Chat

**Display Method**: Chat/Conversation Interface

Results appear in the same tab as the user's prompt, rendered by the editor's built-in chat UI.

**User Flow**:
1. User opens chat (Claude Code, Windsurf, etc.)
2. User types: "Review this code for me" or similar
3. User selects/highlights file or references it
4. MCP client automatically invokes `review_code` tool
5. Results (markdown + recommendations) appear in chat
6. User can follow up with questions about findings

**Editor Rendering**:
- Markdown section rendered as formatted text
- Recommendations displayed as structured list or cards
- Severity colors applied by editor (🔴🟡🔵)
- User can copy, reference, or act on findings

---

## Implementation Phases

### Phase 1: MCP Server Prerequisites ✓ (Already Complete)

- [x] `review_code` tool registered in `mcp-stdio.ts`
- [x] ReviewCodeService implemented
- [x] Input validation (file size, TS extension)
- [x] Output formatting (recommendations + markdown)
- [x] MCP configuration documented in `MCP_CONFIG.md`

### Phase 2: MCP Server Configuration ✓ (Already Complete)

- [x] `.windsurf/mcp_config.json` created and configured
- [x] `effect-patterns` MCP server registered
- [x] API key configured
- [x] Editor's chat interface automatically discovers and uses tools

**Current Configuration** (in `.windsurf/mcp_config.json`):
```json
{
  "effect-patterns": {
    "command": "/Users/paul/Projects/Public/Effect-Patterns/packages/mcp-server/dist/mcp-stdio.js",
    "args": [],
    "env": {
      "PATTERN_API_KEY": "...",
      "EFFECT_PATTERNS_API_URL": "http://localhost:3000"
    }
  }
}
```

### Phase 3: Documentation & Walkthroughs (1-2 days)

#### Task 3a: User Documentation

Update `CLAUDE.md` with:
- How to invoke `review_code` tool in chat
- Example prompts:
  - "Review this TypeScript code for Effect anti-patterns"
  - "Analyze this service for architectural issues"
  - "What are the top issues in this file?"
- Screenshot of chat interaction
- Explanation of severity levels

#### Task 3b: Troubleshooting Guide

- API key setup instructions
- Common error messages and fixes
- Timeout handling
- Non-TS file handling

#### Task 3c: Developer Setup

Document for team:
- How to start MCP server locally
- How to configure `.windsurf/mcp_config.json`
- How to test the integration
- How to debug failed tool calls

### Phase 4: Testing & Examples (1-2 days)

#### Task 4a: Manual Testing

- Start MCP server locally
- Configure `.windsurf/mcp_config.json`
- Open editor chat interface
- Reference a TS file in prompt
- Invoke `review_code` tool
- Verify results appear in chat

#### Task 4b: Example Scenarios

Create sample prompts demonstrating:
1. "Review this service for Error handling patterns"
2. "Analyze this Effect composition for performance issues"
3. "What architectural improvements would you suggest?"

#### Task 4c: Edge Case Testing

Test with:
- Non-TS files (should be rejected gracefully)
- Files > 100KB (should show error)
- Invalid API key (should show auth error)
- Network timeout (should show timeout message)

---

## File Structure (Minimal)

```
packages/
├── mcp-server/
│   ├── src/
│   │   ├── services/
│   │   │   ├── review-code.ts        ✓ (exists)
│   │   │   └── ...
│   │   └── mcp-stdio.ts              ✓ (exists, has review_code tool)
│   └── package.json
│
.windsurf/
├── mcp_config.json                    ← CREATE (Phase 2a)
└── ...

Documentation/
├── CLAUDE.md                          ← UPDATE (Phase 3a)
└── MCP_EDITOR_INTEGRATION_PLAN.md    ← This file
```

**No new packages or code required**. Configuration and documentation only.

---

## Communication Flow Diagram

```
User opens chat in editor
    ↓
User types prompt: "Review this code" + selects/references file
    ↓
Editor's chat UI reads file buffer
    ↓
Chat invokes "review_code" MCP tool
    ↓
mcp-stdio.ts receives tool call
    ↓
ReviewCodeService.reviewCode(code, filePath)
    ↓
AnalysisService.analyzeFile()
    ↓
Return: ReviewCodeResult {
  recommendations: [...top 3...],
  meta: {...},
  markdown: "# Code Review Results\n..."
}
    ↓
Editor's chat UI renders response
    ↓
Results appear in same chat tab as prompt
    ↓
User sees findings + upgrade message (if applicable)
```

---

## API Contract (Already Stable)

### Input
```typescript
{
  code: string;           // Required: Full file content (< 100KB)
  filePath?: string;      // Optional: Relative file path (for context)
}
```

### Output
```typescript
{
  recommendations: [
    {
      severity: "high" | "medium" | "low",
      title: string,                    // Short issue title
      line: number,                     // 1-indexed line number
      message: string                   // Full recommendation text
    }
  ],
  meta: {
    totalFound: number,                 // Total issues detected
    hiddenCount: number,                // Issues beyond tier limit
    upgradeMessage?: string             // Upgrade CTA for free tier
  },
  markdown: string                      // Formatted report
}
```

---

## Configuration Requirements

### Editor Environment
```bash
# .env or shell
PATTERN_API_KEY=sk-xxx...              # Required for MCP server
EFFECT_PATTERNS_API_URL=http://localhost:3000  # Optional, dev default
MCP_DEBUG=false                         # Optional, disable in production
```

### Editor Configuration
```json
{
  "effect-patterns.enabled": true,
  "effect-patterns.realTimeReview": true,
  "effect-patterns.severityFilter": ["high", "medium"],
  "effect-patterns.debounceMs": 500
}
```

---

## Success Criteria

### Functional Requirements
- [ ] User can open chat and reference a TS file in a prompt
- [ ] `review_code` tool is automatically invoked by editor
- [ ] Top 3 recommendations appear in chat with correct severity
- [ ] Markdown report is properly formatted in chat
- [ ] File path is correctly sent to ReviewCodeService
- [ ] Non-TS files show graceful error message
- [ ] Files > 100KB show friendly error message
- [ ] Upgrade CTA displays when findings are hidden (free tier limit)

### Performance Requirements
- [ ] API call completes in < 5 seconds
- [ ] Chat UI remains responsive while waiting
- [ ] No blocking operations

### User Experience
- [ ] Chat shows response in readable format
- [ ] Severity colors are visually distinct (🔴 high, 🟡 medium, 🔵 low)
- [ ] Error messages are clear and actionable
- [ ] Users can ask follow-up questions about findings

---

## Risk Mitigation

### Risk: API Server Downtime
**Mitigation**: 
- Show graceful error message
- Don't block editor if review fails
- Suggest local setup instructions

### Risk: Slow API Responses
**Mitigation**:
- Set 5-second timeout per request
- Cache results
- Show stale cache as fallback

### Risk: API Key Exposure
**Mitigation**:
- Never log API keys
- Store in environment variable (not in config files)
- Use VSCode/Windsurf credential management

### Risk: Large File Analysis Timeout
**Mitigation**:
- Validate file size < 100KB before calling API
- Show clear error if exceeded
- Suggest splitting large files

---

## Next Steps (Immediate)

1. **Verify MCP Server Runs Locally** (Day 1)
   - Build MCP server: `cd packages/mcp-server && bun run build`
   - Ensure `.windsurf/mcp_config.json` points to correct executable
   - Test `review_code` tool manually: `cd packages/mcp-server && bun run smoke-test`

2. **Manual Testing** (Day 1)
   - Restart Windsurf IDE
   - Open Windsurf chat
   - Reference a `.ts` file in prompt: "Review this file: `src/services/user.ts`"
   - Verify `review_code` tool is invoked and results appear in chat
   - Test error cases (non-TS file, oversized file, invalid key)

3. **Documentation & Examples** (Day 2)
   - Update CLAUDE.md with user instructions
   - Document example prompts for code review
   - Add troubleshooting section

---

## Appendix: Code Review Tool Specification

### ReviewCodeService Features

**Validation**:
- File size: Max 100KB
- Extension: `.ts` or `.tsx` only
- Content: Valid UTF-8

**Output**:
- Max 3 recommendations (free tier limit)
- Sorted by severity (high → medium → low)
- Within same severity, sorted by line number
- Includes upgrade CTA if findings hidden

**Severity Ranking**:
- **High**: Critical architectural violations, missing error handling
- **Medium**: Anti-patterns, potential bugs
- **Low**: Style issues, minor improvements

**Source**: 
- `packages/mcp-server/src/services/review-code.ts`
- Depends on: AnalysisService from `@effect-patterns/analysis-core`

---

## References

- [MCP Configuration Guide](./MCP_CONFIG.md)
- [ReviewCodeService](./packages/mcp-server/src/services/review-code.ts)
- [MCP Stdio Server](./packages/mcp-server/src/mcp-stdio.ts)
- [AGENTS.md](./AGENTS.md)
