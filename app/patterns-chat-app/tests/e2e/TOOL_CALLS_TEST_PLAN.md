# Tool Calls Test Plan

## Overview

This document outlines the comprehensive test strategy for validating tool calls across all 8 models in the Chat Assistant.

## Available Tools

1. **getWeather** - Fetch weather data (Open-Meteo API)
2. **createDocument** - Create artifact documents
3. **updateDocument** - Update artifact documents
4. **requestSuggestions** - AI-powered document suggestions
5. **searchPatternsTool** - Search Effect-TS patterns
6. **getPatternByIdTool** - Get specific pattern details
7. **listPatternCategoriesTool** - List available pattern categories

## Test Models

All 8 models should support tool calls (except reasoning model which disables tools):

1. ✅ `chat-model` (Claude default)
2. ❌ `chat-model-reasoning` (tools disabled)
3. ✅ `gpt-5` (OpenAI)
4. ✅ `gemini-2.0-flash` (Google)
5. ✅ `gemini-2.5-flash` (Google)
6. ✅ `gpt-4.1` (OpenAI)
7. ✅ `gpt-5-mini` (OpenAI)
8. ✅ `claude-4.5-haiku` (Anthropic)

## Test Cases

### Category 1: Tool Invocation

**Test 1.1: Weather Tool**
- Prompt: "What's the weather in San Francisco?"
- Expected: Tool call to getWeather with city parameter
- Validation:
  - Tool is invoked
  - Response contains weather data
  - No errors in tool execution

**Test 1.2: Pattern Search Tool**
- Prompt: "Show me error handling patterns in Effect"
- Expected: Tool call to searchPatternsTool
- Validation:
  - Tool is invoked with correct query
  - Returns pattern summaries
  - Results are relevant to query

**Test 1.3: List Categories Tool**
- Prompt: "What are the available pattern categories?"
- Expected: Tool call to listPatternCategoriesTool
- Validation:
  - Tool is invoked
  - Returns list of categories
  - Categories are valid

**Test 1.4: Get Pattern Details**
- Prompt: "Tell me about the retry pattern"
- Expected: Tool call to getPatternByIdTool (after search identifies ID)
- Validation:
  - Tool retrieves specific pattern
  - Returns full pattern details
  - Includes code examples

### Category 2: Document Tools (Artifacts)

**Test 2.1: Create Document**
- Prompt: "Create a TypeScript file for a REST API"
- Expected: Tool call to createDocument
- Validation:
  - Document ID is generated
  - Artifact appears in UI
  - Document kind is correct

**Test 2.2: Update Document**
- Prompt: "Add error handling to the API"
- Expected: Tool call to updateDocument (after createDocument)
- Validation:
  - Document is updated
  - Changes are reflected
  - No data loss

**Test 2.3: Request Suggestions**
- Prompt: "Can you suggest improvements?"
- Expected: Tool call to requestSuggestions
- Validation:
  - Suggestions are generated
  - Suggestions are meaningful
  - UI updates with suggestions

### Category 3: Multi-Tool Sequences

**Test 3.1: Search → Details**
- Prompt: "Find a retry pattern and explain it"
- Expected: searchPatternsTool → getPatternByIdTool chain
- Validation:
  - Both tools called in sequence
  - Results are coherent
  - User gets comprehensive answer

**Test 3.2: Weather + Context**
- Prompt: "What's the weather and should I plan outdoor activities?"
- Expected: getWeather tool + natural language reasoning
- Validation:
  - Tool data informs response
  - Assistant provides context-aware advice
  - Response quality is high

### Category 4: Tool Error Handling

**Test 4.1: Invalid Location**
- Prompt: "Weather in XYZ123InvalidPlace"
- Expected: Tool handles gracefully, fallback response
- Validation:
  - No crash
  - Error message is helpful
  - Chat continues normally

**Test 4.2: Non-existent Pattern**
- Prompt: "Show me the foobar-xyz-pattern"
- Expected: Tool returns not found, assistant responds appropriately
- Validation:
  - Error is handled gracefully
  - Assistant explains pattern doesn't exist
  - Suggests alternatives if relevant

### Category 5: Cross-Model Validation

**Test 5.1: Tool Call Consistency**
- Run identical prompt on all 7 tool-enabled models
- Expected: All models invoke same tool for same prompt
- Validation:
  - Same tool called across models
  - Tool parameters are reasonable
  - Results are consistent in quality

**Test 5.2: Response Quality**
- Compare tool + response quality across models
- Expected: All models produce valid responses
- Validation:
  - Responses use tool data effectively
  - No hallucinated data
  - Quality is similar across models

## Test Execution Plan

### Phase 1: Manual Testing (This Sprint)
1. Test each tool individually with each model
2. Document any issues or unexpected behavior
3. Validate UI updates and streaming work correctly
4. Test error cases

### Phase 2: Automated Tests (Future)
1. Create parametrized E2E tests for all model × tool combinations
2. Add assertions for tool invocation, parameters, and results
3. Test streaming data updates
4. Add regression tests for tool bugs

## Success Criteria

✅ All 7 tools work with all 7 enabled models
✅ Tool calls are made with correct parameters
✅ Tool responses are properly integrated into chat
✅ Errors are handled gracefully
✅ Streaming updates work for document tools
✅ UI reflects tool results correctly
✅ No hallucinated tool calls or results
✅ Response quality is consistent across models

## Known Limitations

- `chat-model-reasoning` intentionally disables tools (by design)
- Some tools require specific environment setup (API keys, databases)
- Streaming tests require WebSocket connection
- Document operations require authenticated session

## Notes

- Tool call parameters are logged for debugging
- Response times should be tracked for performance analysis
- API rate limits should be considered for bulk testing
- Test prompts should be consistent across all models for comparison
