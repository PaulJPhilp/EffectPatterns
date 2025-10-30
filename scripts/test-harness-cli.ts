#!/usr/bin/env bun

/**
 * test-harness-cli.ts
 *
 * A CLI test harness for the AI coding assistant.
 * Tests chat functionality, task/agent capabilities, model performance, and scenarios.
 *
 * Makes real API calls to LLM services (no mocking).
 */

import { chatModels } from '../app/code-assistant/lib/ai/models';
import ora from 'ora';
import { TUIHandler } from 'effect-cli-tui';
import * as Effect from 'effect/Effect';
import { Layer } from 'effect';
import { myProvider } from '../app/code-assistant/lib/ai/providers';
import { systemPrompt } from '../app/code-assistant/lib/ai/prompts';
import { convertToModelMessages } from 'ai';
import { LLMService, LLMServiceLive } from '../services/llm-service';
import { FetchHttpClient } from '@effect/platform';
import { NodeContext, NodeRuntime } from '@effect/platform-node';

// --- TYPES ---

interface TestResult {
  testName: string;
  duration: number;
  success: boolean;
  response?: string;
  error?: string;
  metrics?: Record<string, any>;
}

interface TestScenario {
  name: string;
  description: string;
  prompt: string;
  expectedPatterns?: string[];
  model?: string;
}

// --- TEST SCENARIOS ---

const CHAT_SCENARIOS: TestScenario[] = [
  {
    name: 'basic_greeting',
    description: 'Test basic conversational response',
    prompt: 'Hello, how are you?',
    expectedPatterns: ['hello', 'hi', 'greetings'],
  },
  {
    name: 'coding_question',
    description: 'Test coding assistance capabilities',
    prompt: 'How do I create a function in TypeScript?',
    expectedPatterns: ['function', 'typescript', 'const|let|var'],
  },
  {
    name: 'effect_pattern',
    description: 'Test Effect-TS pattern knowledge',
    prompt: 'Show me how to handle errors with Effect.gen',
    expectedPatterns: ['Effect\\.gen', 'yield\\*', 'catchTag|mapError'],
  },
  {
    name: 'complex_reasoning',
    description: 'Test reasoning capabilities',
    prompt: 'Explain the difference between monads and functors in functional programming',
    expectedPatterns: ['monad', 'functor', 'map|flatMap|bind'],
  },
];

const TASK_SCENARIOS: TestScenario[] = [
  {
    name: 'create_component',
    description: 'Test component creation task',
    prompt: 'Create a React component for a todo list',
    expectedPatterns: ['import.*React', 'function|const.*Component', 'useState|useEffect'],
  },
  {
    name: 'refactor_code',
    description: 'Test code refactoring task',
    prompt: 'Refactor this JavaScript code to use modern syntax: var x = function() { return 42; }',
    expectedPatterns: ['const|let|=>|arrow function'],
  },
];

// --- CLI ARGUMENTS ---

const args = process.argv.slice(2);
const command = args[0];

// --- HELPER FUNCTIONS ---

const runChatTest = async (scenario: TestScenario, modelId: string): Promise<TestResult> => {
  const startTime = Date.now();

  console.log(`Testing: ${scenario.name} with model ${modelId}`);

  const testEffect = Effect.gen(function* () {
    const service = yield* LLMService;

    // Convert scenario prompt to messages format
    const messages = convertToModelMessages([{
      role: 'user',
      content: scenario.prompt,
      id: `msg-${Date.now()}`,
      parts: [{ type: 'text', text: scenario.prompt }],
      createdAt: new Date(),
      attachments: [],
    }]);

    // Call the LLM service
    const result = yield* service.generateText({
      model: myProvider.languageModel(modelId),
      messages,
      system: systemPrompt({ selectedChatModel: modelId, requestHints: {} }),
    });

    const duration = Date.now() - startTime;

    // Check for expected patterns
    const hasExpectedPatterns = scenario.expectedPatterns?.every(pattern =>
      new RegExp(pattern, 'i').test(result.text)
    ) ?? true;

    return {
      testName: `${scenario.name} (${modelId})`,
      duration,
      success: hasExpectedPatterns,
      response: result.text,
      metrics: {
        responseLength: result.text.length,
        hasExpectedPatterns,
      },
    };
  });

  const layer = Layer.mergeAll(
    LLMServiceLive,
    NodeContext.layer,
    FetchHttpClient.layer
  );

  try {
    const result = await Effect.runPromise(Effect.provide(testEffect, layer));
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      testName: `${scenario.name} (${modelId})`,
      duration,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// --- CLI COMMAND HANDLERS ---

async function handleList() {
  console.log('\n🤖 Available AI Models:');
  console.log('─'.repeat(30));
  for (const model of chatModels) {
    console.log(`  ${model.name} (${model.id})`);
    console.log(`    ${model.description}`);
  }
  console.log('');

  console.log('\n💬 Chat Scenarios:');
  console.log('─'.repeat(40));
  for (const scenario of CHAT_SCENARIOS) {
    console.log(`  ${scenario.name.padEnd(20)} ${scenario.description}`);
    console.log(`    Prompt: ${scenario.prompt}`);
  }
  console.log('');

  console.log('\n🔧 Task Scenarios:');
  console.log('─'.repeat(40));
  for (const scenario of TASK_SCENARIOS) {
    console.log(`  ${scenario.name.padEnd(20)} ${scenario.description}`);
    console.log(`    Prompt: ${scenario.prompt}`);
  }
  console.log('');
}

async function handleChat(scenarioName?: string, modelId?: string) {
  scenarioName = scenarioName || args[1];
  modelId = modelId || args[2];

  if (!scenarioName || !modelId) {
    console.error('Usage: bun run test:harness chat <scenario> <model>');
    console.error('Available scenarios:', CHAT_SCENARIOS.map(s => s.name).join(', '));
    console.error('Available models:', chatModels.map(m => m.id).join(', '));
    process.exit(1);
  }

  const scenario = CHAT_SCENARIOS.find(s => s.name === scenarioName);
  if (!scenario) {
    console.error(`Scenario '${scenarioName}' not found.`);
    console.error('Available scenarios:', CHAT_SCENARIOS.map(s => s.name).join(', '));
    process.exit(1);
  }

  const model = chatModels.find(m => m.id === modelId);
  if (!model) {
    console.error(`Model '${modelId}' not found.`);
    console.error('Available models:', chatModels.map(m => m.id).join(', '));
    process.exit(1);
  }

  console.log(`🗣️ Testing chat scenario: ${scenario.name}`);
  console.log(`🤖 Using model: ${model.name}`);
  console.log(`💬 Prompt: ${scenario.prompt}`);
  console.log('');

  const spinner = ora('Running test...').start();
  const result = await runChatTest(scenario, modelId);
  spinner.stop();

  console.log(`📊 Test Result: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`⏱️  Duration: ${result.duration}ms`);
  console.log(`📏 Response Length: ${result.metrics?.responseLength || 0} chars`);

  if (result.response) {
    console.log(`\n💬 Response:\n${result.response}`);
  }

  if (!result.success && result.error) {
    console.log(`\n❌ Error: ${result.error}`);
  }

  process.exit(result.success ? 0 : 1);
}

async function handleTask(scenarioName?: string, modelId?: string) {
  scenarioName = scenarioName || args[1];
  modelId = modelId || args[2];

  if (!scenarioName || !modelId) {
    console.error('Usage: bun run test:harness task <scenario> <model>');
    console.error('Available scenarios:', TASK_SCENARIOS.map(s => s.name).join(', '));
    console.error('Available models:', chatModels.map(m => m.id).join(', '));
    process.exit(1);
  }

  const scenario = TASK_SCENARIOS.find(s => s.name === scenarioName);
  if (!scenario) {
    console.error(`Scenario '${scenarioName}' not found.`);
    console.error('Available scenarios:', TASK_SCENARIOS.map(s => s.name).join(', '));
    process.exit(1);
  }

  const model = chatModels.find(m => m.id === modelId);
  if (!model) {
    console.error(`Model '${modelId}' not found.`);
    console.error('Available models:', chatModels.map(m => m.id).join(', '));
    process.exit(1);
  }

  console.log(`🔧 Testing task scenario: ${scenario.name}`);
  console.log(`🤖 Using model: ${model.name}`);
  console.log(`📝 Prompt: ${scenario.prompt}`);
  console.log('');

  const spinner = ora('Running test...').start();
  const result = await runChatTest(scenario, modelId); // Reuse runChatTest, assuming it's similar
  spinner.stop();

  console.log(`📊 Test Result: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`⏱️  Duration: ${result.duration}ms`);
  console.log(`📏 Response Length: ${result.metrics?.responseLength || 0} chars`);

  if (result.response) {
    console.log(`\n💬 Response:\n${result.response}`);
  }

  if (!result.success && result.error) {
    console.log(`\n❌ Error: ${result.error}`);
  }

  process.exit(result.success ? 0 : 1);
}

async function handleModels(scenarioName?: string) {
  scenarioName = scenarioName || args[1];

  if (!scenarioName) {
    console.error('Usage: bun run test:harness models <scenario>');
    console.error('Available scenarios:', CHAT_SCENARIOS.map(s => s.name).join(', '));
    process.exit(1);
  }

  const scenario = CHAT_SCENARIOS.find(s => s.name === scenarioName);
  if (!scenario) {
    console.error(`Scenario '${scenarioName}' not found.`);
    console.error('Available scenarios:', CHAT_SCENARIOS.map(s => s.name).join(', '));
    process.exit(1);
  }

  console.log(`🏁 Comparing all models on scenario: ${scenario.name}`);
  console.log(`💬 Prompt: ${scenario.prompt}`);
  console.log('');

  const results: TestResult[] = [];
  const spinner = ora('Running model comparison...').start();

  for (const model of chatModels) {
    spinner.text = `Testing ${model.name}...`;
    const result = await runChatTest(scenario, model.id);
    results.push(result);
  }

  spinner.stop();

  console.log('\n📊 Model Comparison Results:');
  console.log('─'.repeat(60));

  const sortedResults = results.sort((a, b) => a.duration - b.duration);

  for (const result of sortedResults) {
    const status = result.success ? '✅' : '❌';
    const time = `${result.duration}ms`;
    const model = chatModels.find(m => result.testName.includes(m.id));
    console.log(`${status} ${model?.name.padEnd(20)} ${time.padStart(8)} ${result.success ? 'PASS' : 'FAIL'}`);
  }

  const fastest = sortedResults[0];
  const slowest = sortedResults[sortedResults.length - 1];
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log('\n📈 Summary:');
  console.log(`Fastest: ${fastest.testName} (${fastest.duration}ms)`);
  console.log(`Slowest: ${slowest.testName} (${slowest.duration}ms)`);
  console.log(`Average: ${avgDuration.toFixed(0)}ms`);

  const allPassed = results.every(r => r.success);
  process.exit(allPassed ? 0 : 1);
}

// --- MAIN EXECUTION ---

async function main() {
  if (!command) {
    await runTestHarness();
    return;
  }

  try {
    switch (command) {
      case 'list':
        await handleList();
        break;
      case 'chat':
        await handleChat();
        break;
      case 'models':
        await handleModels();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use: bun run test:harness (no args for help)');
        process.exit(1);
    }
  } catch (error) {
    console.error('Test harness failed:', error);
    process.exit(1);
  }
}

// --- RUNNER ---

async function runTestHarness() {
  const tui = new TUIHandler();

  let continueTesting = true;
  let iterations = 0;
  const maxIterations = 10; // Prevent infinite loop

  while (continueTesting && iterations < maxIterations) {
    iterations++;
    try {
      console.log('🤖 AI Coding Assistant Test Harness');

      const choice = await Effect.runPromise(tui.selectOption('What would you like to do?', [
        { label: '🗣️  Test Chat Scenarios', value: 'chat', description: 'Test conversational AI capabilities' },
        { label: '🔧 Test Task Scenarios', value: 'task', description: 'Test coding agent functionality' },
        { label: '🏁 Compare Models', value: 'models', description: 'Compare performance across AI models' },
        { label: '📋 List Scenarios & Models', value: 'list', description: 'Browse available test scenarios and models' },
        { label: '❌ Exit', value: 'exit', description: 'Exit the test harness' }
      ]));

      if (choice === 'exit') {
        await Effect.runPromise(tui.display('👋 Goodbye!', 'success'));
        return;
      }

      if (choice === 'list') {
        await handleList();
      } else if (choice === 'chat') {
        const scenarioName = await Effect.runPromise(tui.selectOption('Select a chat scenario:', CHAT_SCENARIOS.map(s => ({ label: s.name, value: s.name, description: s.description }))));
        const modelId = await Effect.runPromise(tui.selectOption('Select a model:', chatModels.map(m => ({ label: `${m.name} (${m.id})`, value: m.id, description: m.description }))));
        await handleChat(scenarioName, modelId);
      } else if (choice === 'task') {
        const scenarioName = await Effect.runPromise(tui.selectOption('Select a task scenario:', TASK_SCENARIOS.map(s => ({ label: s.name, value: s.name, description: s.description }))));
        const modelId = await Effect.runPromise(tui.selectOption('Select a model:', chatModels.map(m => ({ label: `${m.name} (${m.id})`, value: m.id, description: m.description }))));
        await handleTask(scenarioName, modelId);
      } else if (choice === 'models') {
        const scenarioName = await Effect.runPromise(tui.selectOption('Select a scenario to compare models:', CHAT_SCENARIOS.map(s => ({ label: s.name, value: s.name, description: s.description }))));
        await handleModels(scenarioName);
      } else {
        console.log('Invalid choice:', choice);
        continueTesting = false;
      }

      if (continueTesting) {
        continueTesting = await Effect.runPromise(tui.confirm('Would you like to do something else?'));
      }

    } catch (error) {
      console.error('Test harness failed:', error);
      continueTesting = false; // Stop on error
    }
  }

  await Effect.runPromise(tui.display('👋 Goodbye!', 'success'));
}

main();




