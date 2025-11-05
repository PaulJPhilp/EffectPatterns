# Assistant-UI Integration Strategy

## Current State

✅ **Installed Dependencies**:
- `@assistant-ui/react@0.11.37`
- `@assistant-ui/react-markdown@0.11.4`
- `@assistant-ui/react-syntax-highlighter@0.11.4`
- Supporting peer dependencies (radix-ui, zustand)

✅ **Current Implementation**:
- Response rendering: Streamdown (working well with markdown + code)
- Message handling: Custom components with Vercel AI SDK
- Chat UI: Next.js + custom React components

## Architecture Analysis

### assistant-ui Design Philosophy
assistant-ui is a **complete chat UI framework** that provides:
1. **Thread management** (conversation lists, history)
2. **Message UI** with built-in markdown rendering
3. **Tool/Generative UI** support for function calls
4. **Real-time streaming** integration
5. **Context API** for accessing chat state

### Our Current Architecture
- **Transport**: Vercel AI SDK (`useChat` hook)
- **Message structure**: Custom React components
- **Rendering**: Streamdown for markdown
- **State management**: React hooks + custom context

### Integration Paths

#### Path 1: Full Migration ❌ (Not Recommended)
**Pros**: Get complete assistant-ui ecosystem, built-in features
**Cons**: Large refactor, lose custom styling, require different runtime setup

**Decision**: Too invasive for current state. Keep iteratively.

#### Path 2: Partial Component Integration ⚠️ (Evaluated, Blocked)
**Attempted**: Using `@assistant-ui/react-markdown` and `@assistant-ui/react-syntax-highlighter`
**Issue**: These components are designed to work within assistant-ui's context system
- They expect `AssistantContext` from `@assistant-ui/react`
- Cannot be used standalone with Vercel AI SDK
- Import names don't match public exports

**Decision**: Deferred until we migrate to full assistant-ui.

#### Path 3: Tool Call Rendering ⏳ (Future)
**Potential**: Use `@assistant-ui/react` for generative UI components
**Benefit**: Professional rendering of LLM-generated components (charts, forms, etc.)
**Timeline**: Q4 2025+ after patterns chat stabilizes

#### Path 4: Syntax Highlighting Enhancement ✅ (Recommended Now)
**Option 1**: Add `react-syntax-highlighter` directly to response.tsx
- Better code highlighting than Streamdown
- Lightweight integration
- No context requirements

**Option 2**: Keep Streamdown (simpler)
- Already working well
- Minimal configuration
- Covers all current use cases

**Decision**: Assess user feedback on current code rendering first.

## Recommendation

### Immediate (Next Sprint)
1. **Keep current setup**: Streamdown + custom components working great
2. **Monitor**: Test actual pattern examples in chat
3. **Gather feedback**: Does syntax highlighting need improvement?

### Short-term (2-3 Sprints)
1. **If** code rendering becomes a bottleneck:
   - Add `react-syntax-highlighter` for enhanced highlighting
   - OR migrate to assistant-ui Thread/Message components

2. **If** tool calls become important:
   - Integrate `@assistant-ui/react` generative UI support
   - Implement tool call rendering UI

### Long-term (Q4 2025+)
1. **Evaluate full migration** to assistant-ui if:
   - Tool calling/generative UI becomes core feature
   - Need advanced chat management (branching, editing, history)
   - Team capacity available for refactor

## Cost-Benefit Analysis

### Current State
- ✅ Build time: 17-25s (excellent)
- ✅ Bundle size: Minimal overhead (5 packages added)
- ✅ Functionality: Complete for current needs
- ✅ Maintainability: Clear, simple architecture

### If Migrating to Full assistant-ui
- ⚠️ Build time: Likely 30-40s+ (framework overhead)
- ⚠️ Bundle size: Significant increase (full UI framework)
- ✅ Functionality: Complete chat management
- ⚠️ Maintainability: Larger learning curve, more moving parts

## Action Items

- [x] Research assistant-ui architecture
- [x] Evaluate integration paths
- [ ] Monitor code rendering quality in production
- [ ] Gather user feedback on current implementation
- [ ] Decide on Path 3 (tool rendering) for future sprints
- [ ] Consider Path 1 (full migration) in Q4 2025 if needed

## References
- assistant-ui docs: https://assistant-ui.com/docs/getting-started
- Vercel AI SDK: https://sdk.vercel.ai/
- Current response implementation: `components/elements/response.tsx`
