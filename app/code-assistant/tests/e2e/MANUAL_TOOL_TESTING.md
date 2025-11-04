# Manual Tool Call Testing Guide

This guide walks you through manually testing tool calls in the Chat Assistant.

## Prerequisites

1. **Start the dev server**:
   ```bash
   cd app/code-assistant
   bun run dev
   ```
   The app will be available at `http://localhost:3000` (or next available port)

2. **Ensure environment is configured**:
   - `.env.local` has valid API keys
   - Database is running
   - You're authenticated (create an account or use guest login)

## Test Workflow

### Step 1: Open Chat

1. Navigate to `http://localhost:3000/chat`
2. You should see a new blank chat with model selector

### Step 2: Select Model

1. Click the model selector dropdown (shows current model)
2. Choose a model from the list
3. Note: `chat-model-reasoning` will not trigger tools (by design)

### Step 3: Test Each Tool

#### Tool 1: Weather (getWeather)

**Prompt**: "What's the weather in San Francisco?"

**Expected**:
- ✅ Assistant calls getWeather tool
- ✅ Response mentions current weather conditions
- ✅ May include temperature, conditions, forecast
- ⏱️ Takes 2-5 seconds (calls Open-Meteo API)

**If it fails**:
- Check internet connection
- Verify Open-Meteo API is accessible
- Try different city name

---

#### Tool 2: Pattern Search (searchPatternsTool)

**Prompt**: "Show me error handling patterns in Effect"

**Expected**:
- ✅ Assistant calls searchPatternsTool
- ✅ Response lists available patterns
- ✅ May mention specific pattern names
- ⏱️ Takes 1-2 seconds (local search)

**If it fails**:
- Verify `/data/patterns-index.json` exists
- Check patterns are loaded correctly
- Try simpler search terms

---

#### Tool 3: Get Pattern Details (getPatternByIdTool)

**Prompt**: "Tell me about the retry-with-backoff pattern"

**Expected**:
- ✅ Assistant calls getPatternByIdTool
- ✅ Response includes pattern details
- ✅ May include code examples
- ⏱️ Takes 1-2 seconds

**If it fails**:
- Pattern ID might be different (use search first)
- Check patterns are indexed correctly

---

#### Tool 4: List Pattern Categories (listPatternCategoriesTool)

**Prompt**: "What categories of Effect patterns are available?"

**Expected**:
- ✅ Assistant calls listPatternCategoriesTool
- ✅ Response lists 8 categories:
  - error-handling
  - concurrency
  - data-access
  - resource-management
  - configuration
  - observability
  - testing
  - integration
- ⏱️ Takes 1-2 seconds

**If it fails**:
- Check tool is defined in chat API
- Verify categories are returned

---

#### Tool 5: Create Document (createDocument)

**Prompt**: "Create a TypeScript file for a REST API"

**Expected**:
- ✅ Assistant calls createDocument tool
- ✅ Artifact panel appears on right side
- ✅ Shows generated code
- ⏱️ Takes 3-10 seconds (LLM generation)

**If it fails**:
- Check you're authenticated (user session required)
- Verify database connection
- Check artifact-model is configured

---

#### Tool 6: Update Document (updateDocument)

**Prerequisite**: Must have created a document first

**Prompt**: "Add error handling to the API"

**Expected**:
- ✅ Assistant calls updateDocument tool
- ✅ Artifact updates with new content
- ✅ Changes visible in artifact panel
- ⏱️ Takes 3-10 seconds

**If it fails**:
- May not recognize previous document (context issue)
- Try asking explicitly: "Can you update that document?"
- Verify document ID is passed correctly

---

#### Tool 7: Request Suggestions (requestSuggestions)

**Prerequisite**: Must have a document in artifact panel

**Prompt**: "Can you suggest improvements?"

**Expected**:
- ✅ Assistant calls requestSuggestions tool
- ✅ Suggestions appear in artifact panel
- ✅ Shows original vs suggested changes
- ⏱️ Takes 5-15 seconds (LLM processing)

**If it fails**:
- Document may not be selected
- Try refreshing and creating new document
- Check suggestions schema matches expected format

---

## Testing All 7 Models

Follow this checklist:

| Model | Weather | Search | Categories | Create Doc | Update Doc | Suggestions | Notes |
|-------|---------|--------|------------|-----------|-----------|-------------|-------|
| chat-model | ○ | ○ | ○ | ○ | ○ | ○ | Claude default |
| chat-model-reasoning | ⊗ | ⊗ | ⊗ | ⊗ | ⊗ | ⊗ | Tools disabled |
| gpt-5 | ○ | ○ | ○ | ○ | ○ | ○ | OpenAI |
| gemini-2.0-flash | ○ | ○ | ○ | ○ | ○ | ○ | Google |
| gemini-2.5-flash | ○ | ○ | ○ | ○ | ○ | ○ | Google fallback |
| gpt-4.1 | ○ | ○ | ○ | ○ | ○ | ○ | OpenAI fallback |
| gpt-5-mini | ○ | ○ | ○ | ○ | ○ | ○ | OpenAI mini |
| claude-4.5-haiku | ○ | ○ | ○ | ○ | ○ | ○ | Anthropic |

**Legend:**
- ○ = Should work / Test it
- ⊗ = Known to not work (by design)
- ✅ = Confirmed working
- ❌ = Confirmed not working

## Debugging

### Tools not being invoked

1. Check browser DevTools console for errors
2. Verify API key is configured for each provider
3. Check chat API logs: `bun run dev` output
4. Look for errors in `/api/chat` network request

### Tool invokes but returns wrong data

1. Check tool implementation in `lib/ai/tools/`
2. Verify tool input schema matches expected parameters
3. Check external API (weather, patterns) is accessible
4. Review response in DevTools network tab

### No response from assistant

1. Check API response is streaming correctly
2. Verify database connection for document tools
3. Check LLM provider API keys
4. Review server logs for errors

### Performance issues

- Weather tool: ~2-5 seconds (API call)
- Document tools: ~5-15 seconds (LLM generation)
- Pattern tools: ~1-2 seconds (local search)

If slower, check:
- Network latency
- LLM provider response time
- Database query performance

## Automated Testing

To run the full test suite:

```bash
bun run test tool-calls.test.ts
```

This will:
1. Test each tool on all 7 models
2. Validate tool invocation and parameters
3. Check response quality
4. Test error handling

Expected runtime: ~15-30 minutes (Playwright tests are slow)

## Common Issues

### "Tool not found" error
- Verify tool is registered in `/api/chat/route.ts`
- Check tool export from `lib/ai/tools/`

### "Model not found" error
- Verify model ID exists in `CHAT_MODEL_IDS`
- Check model is mapped in `lib/ai/providers.ts`

### Streaming stops
- Check connection hasn't dropped
- Verify API key hasn't expired
- Try refreshing page

### Document not appearing
- May need to scroll artifact panel
- Try creating new document
- Check browser DevTools for JS errors

## Notes

- Tools may have different behavior per model (LLM variation)
- Some tools require authentication (document operations)
- Pattern tools use cached data (may be stale)
- Weather API has rate limits (be gentle with testing)
- Reasoning model disables tools intentionally

## Success Criteria

✅ All 7 tools work on all 7 enabled models
✅ Tool invocations are correct and timely
✅ Responses integrate well into conversation
✅ No hallucinated tool calls or results
✅ Error cases handled gracefully
✅ Streaming works for all tools
✅ UI updates correctly with tool results
