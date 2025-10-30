#!/usr/bin/env bun

/**
 * test-chat-app-core.ts
 *
 * CLI test for the Code Assistant core logic:
 * - Basic chat prompting
 * - Effect Patterns toolkit integration
 * - Supermemory integration
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment from code-assistant
config({ path: resolve(__dirname, '../app/code-assistant/.env.local') });

import { myProvider } from '../app/code-assistant/lib/ai/providers';
import { generateText } from 'ai';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

function logSection(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✨ ${title}`);
  console.log(`${'='.repeat(60)}\n`);
}

async function runTest(name: string, testFn: () => Promise<void>) {
  const startTime = Date.now();
  try {
    console.log(`🧪 Running: ${name}...`);
    await testFn();
    const duration = Date.now() - startTime;
    results.push({ name, passed: true, message: 'Passed', duration });
    console.log(`✅ ${name} (${duration}ms)\n`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, message, duration });
    console.log(`❌ ${name} (${duration}ms)`);
    console.log(`   Error: ${message}\n`);
  }
}

// Test 1: Basic Chat Prompting
async function testBasicPrompting() {
  // Use the raw Anthropic model ID for testing
  const model = myProvider.languageModel('chat-model-reasoning');

  const response = await generateText({
    model,
    prompt: 'Say hello and briefly introduce yourself as an AI assistant.',
    maxTokens: 100,
  });

  if (!response.text || response.text.length === 0) {
    throw new Error('No response from model');
  }

  console.log(`   Response: "${response.text.substring(0, 100)}..."`);
}

// Test 2: Effect-TS Pattern Knowledge
async function testEffectPatternKnowledge() {
  const model = myProvider.languageModel('chat-model-reasoning');

  const response = await generateText({
    model,
    prompt: 'Briefly explain what Effect-TS is and one key pattern it provides.',
    maxTokens: 150,
  });

  if (!response.text || response.text.length === 0) {
    throw new Error('No response from model');
  }

  const lowerResponse = response.text.toLowerCase();
  if (!lowerResponse.includes('effect') && !lowerResponse.includes('typescript')) {
    throw new Error('Response does not mention Effect-TS or TypeScript');
  }

  console.log(`   Response: "${response.text.substring(0, 100)}..."`);
}

// Test 3: Supermemory Integration
async function testSupermemoryIntegration() {
  try {
    // Only test if supermemory is available
    const Supermemory = await import('supermemory').then(m => m.default).catch(() => null);

    if (!Supermemory) {
      throw new Error('Supermemory package not available (this is OK for basic testing)');
    }

    const apiKey = process.env.SUPERMEMORY_API_KEY;
    if (!apiKey) {
      throw new Error('SUPERMEMORY_API_KEY not set');
    }

    const client = new Supermemory({ apiKey });

    // Test adding a memory
    const testData = {
      userId: 'test-user',
      preferences: { theme: 'dark', selectedModel: 'chat-model' },
      timestamp: new Date().toISOString(),
    };

    await client.memories.add({
      content: JSON.stringify(testData),
      metadata: {
        type: 'test_memory',
        userId: 'test-user',
      },
    });

    // Test searching
    const searchResult = await client.search.memories({
      q: 'test_memory',
      limit: 1,
    });

    if (!searchResult.results || searchResult.results.length === 0) {
      throw new Error('Memory not found after adding');
    }

    console.log(`   ✓ Memory added and retrieved successfully`);
    console.log(`   ✓ Found ${searchResult.results.length} memory result(s)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not available')) {
      console.log(`   ⚠️  Supermemory test skipped: ${message}`);
    } else {
      throw error;
    }
  }
}

// Test 4: Model Availability
async function testModelAvailability() {
  const modelIds = ['chat-model', 'chat-model-reasoning', 'gpt-5'];
  const availableModels: string[] = [];

  for (const modelId of modelIds) {
    try {
      const model = myProvider.languageModel(modelId);
      availableModels.push(modelId);
      console.log(`   ✓ ${modelId}`);
    } catch (error) {
      console.log(`   ✗ ${modelId} (unavailable)`);
    }
  }

  if (availableModels.length === 0) {
    throw new Error('No models available');
  }

  console.log(`\n   Available: ${availableModels.join(', ')}`);
}

// Test 5: Error Handling
async function testErrorHandling() {
  const model = myProvider.languageModel('chat-model-reasoning');

  // Test with a very short max tokens to trigger truncation
  const response = await generateText({
    model,
    prompt: 'Tell me a long story about...',
    maxTokens: 10,
  });

  if (!response.text) {
    throw new Error('No response from model');
  }

  console.log(`   Response (truncated): "${response.text}"`);
}

// Main execution
async function main() {
  logSection('Chat App Core Logic Tests');

  console.log('📋 Environment Check:');
  console.log(`   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓' : '✗'}`);
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✓' : '✗'}`);
  console.log(`   GOOGLE_GEMINI_API_KEY: ${process.env.GOOGLE_GEMINI_API_KEY ? '✓' : '✗'}`);
  console.log(`   SUPERMEMORY_API_KEY: ${process.env.SUPERMEMORY_API_KEY ? '✓' : '✗'}`);

  logSection('Running Tests');

  await runTest('Basic Prompting', testBasicPrompting);
  await runTest('Effect-TS Pattern Knowledge', testEffectPatternKnowledge);
  await runTest('Model Availability', testModelAvailability);
  await runTest('Error Handling', testErrorHandling);
  await runTest('Supermemory Integration', testSupermemoryIntegration);

  logSection('Test Results Summary');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name.padEnd(40)} ${result.duration}ms`);
    if (!result.passed) {
      console.log(`   └─ ${result.message}`);
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Passed: ${passed}/${results.length}`);
  console.log(`   Failed: ${failed}/${results.length}`);
  console.log(`   Total Duration: ${totalDuration}ms`);

  if (failed === 0) {
    console.log(`\n🎉 All tests passed!`);
    process.exit(0);
  } else {
    console.log(`\n⚠️  Some tests failed. Please check the errors above.`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
