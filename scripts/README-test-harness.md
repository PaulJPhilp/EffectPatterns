# AI Coding Assistant Test Harness

An interactive terminal user interface (TUI) test harness for testing the AI coding assistant functionality using effect-cli-tui.

## Overview

The test harness provides an interactive menu-driven interface to test and validate the AI coding assistant:

- **Chat Testing**: Test conversational AI with predefined scenarios
- **Task Testing**: Test coding agent functionality with development scenarios
- **Model Comparison**: Compare performance across different AI models
- **Health Checks**: Verify the assistant is running and responsive

## Prerequisites

1. **Set Environment Variables**:
   Ensure your `.env.local` file has the necessary API keys for the AI models you want to test:
   - `ANTHROPIC_API_KEY` for Claude models
   - `OPENAI_API_KEY` for GPT models
   - `GOOGLE_GENERATIVE_AI_API_KEY` for Gemini models

2. **Real API Calls**:
   The test harness makes actual API calls to AI services - no mocking. Ensure you have sufficient API quotas and credits. Each test consumes API tokens and may incur costs.

## Usage

### Starting the Interactive Test Harness

```bash
bun run test:harness
```

This launches an interactive menu where you can select testing options.

### Main Menu Options

- **🗣️ Test Chat Scenarios**: Test conversational AI capabilities
- **🔧 Test Task Scenarios**: Test coding agent functionality
- **🏁 Compare Models**: Compare performance across AI models
- **📋 List Scenarios & Models**: Browse available test scenarios and models
- **❌ Exit**: Exit the test harness

## Test Scenarios

### Chat Scenarios
- `basic_greeting`: Test basic conversational response
- `coding_question`: Test coding assistance capabilities
- `effect_pattern`: Test Effect-TS pattern knowledge
- `complex_reasoning`: Test reasoning capabilities

### Task Scenarios
- `create_component`: Test component creation task
- `refactor_code`: Test code refactoring task

### Available Models
- `chat-model`: Basic chat model
- `chat-model-reasoning`: Reasoning model
- `claude-3-5-sonnet`: Anthropic Claude
- `gpt-4`: OpenAI GPT-4
- `gemini-pro`: Google Gemini

## Interactive Workflow

1. **Launch**: `bun run test:harness`
2. **Choose Test Type**: Select from chat testing, task testing, model comparison, or browsing
3. **Configure**: Select scenarios, models, and connection settings
4. **Run Tests**: Watch progress with live status updates
5. **View Results**: See detailed results and performance metrics
6. **Continue or Exit**: Choose to run more tests or exit

## Output Format

The test harness provides clear, emoji-enhanced output:

```
📊 Chat Test Results (chat-model)
✅ Passed: 4/4

✅ basic_greeting (chat-model) (1250ms)
✅ coding_question (chat-model) (2100ms)
✅ effect_pattern (chat-model) (1800ms)
✅ complex_reasoning (chat-model) (3200ms)
```

## Model Comparison

When comparing models, results are sorted by response time:

```
🏁 Model Comparison: "Test basic conversational response"
────────────────────────────────────────────────────────────
✅ chat-model                 1250ms
✅ claude-3-5-sonnet          1800ms
✅ gpt-4                      2100ms

📈 Summary:
Fastest: chat-model (1250ms)
Slowest: gpt-4 (2100ms)
Average: 1717ms
```

## Error Handling

The test harness includes robust error handling:

- **App Not Running**: Checks if the assistant app is accessible before testing
- **Invalid Scenarios/Models**: Validates inputs and provides helpful error messages
- **Network Issues**: Handles API failures gracefully
- **Timeout Protection**: Prevents hanging tests with reasonable timeouts

## Extending the Test Harness

### Adding New Scenarios

Add scenarios to the `CHAT_SCENARIOS` or `TASK_SCENARIOS` arrays:

```typescript
{
  name: 'my_scenario',
  description: 'Test my specific functionality',
  prompt: 'Test prompt here',
  expectedPatterns: ['expected', 'response', 'patterns'],
}
```

### Adding New Models

Add model IDs to the `AVAILABLE_MODELS` array:

```typescript
const AVAILABLE_MODELS = [
  // ... existing models
  'new-model-id',
];
```

## Architecture

The test harness is built with:

- **Effect-TS**: For type-safe, composable operations
- **effect-cli-tui**: For interactive terminal user interface components
- **ora**: For progress indicators during test execution
- **LLM Service**: Direct integration with AI providers (no mocking)
- **Real API Calls**: Actual consumption of API credits and tokens

## TUI Features

The interactive interface includes:

- **Select Menus**: Choose from predefined options
- **Multi-Select**: Select multiple models for comparison
- **Confirmations**: Yes/no prompts for configuration
- **Text Input**: Custom host/port configuration
- **Status Displays**: Info, success, and error messages
- **Progress Indicators**: Visual feedback during long-running tests

## Troubleshooting

### Common Issues

1. **API Key Missing**:
   - Ensure all required API keys are set in `.env.local`
   - Check that the keys are valid and have sufficient credits/quota

2. **Rate Limiting**:
   - AI APIs have rate limits; wait between test runs if hitting limits
   - Consider testing fewer scenarios or models to stay within limits

3. **API Costs**:
   - Each test consumes tokens and may incur costs
   - Monitor your API provider dashboard for usage
   - Start with single scenarios to test functionality before running full suites

4. **Slow Tests**:
   - AI model responses can take time; the harness includes proper timeouts
   - Network latency and API queue times affect response times

5. **Pattern Matching Failures**:
   - Review the `expectedPatterns` in scenario definitions
   - AI responses may vary; patterns are case-insensitive regex
   - Some scenarios may need pattern updates based on actual AI responses
