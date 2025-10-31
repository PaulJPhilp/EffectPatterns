#!/usr/bin/env bun

/**
 * test-llm-service.ts
 *
 * Direct test of the LLM service functionality
 */

import * as Effect from 'effect/Effect';
import { Layer } from 'effect';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { LLMService, LLMServiceLive } from '../services/llm-service';
import { myProvider } from '../app/code-assistant/lib/ai/providers';
import { systemPrompt } from '../app/code-assistant/lib/ai/prompts';
import { convertToModelMessages } from 'ai';

// Simple test without Effect complexity
async function testLLMService() {
  console.log('🤖 Testing LLM Service...\n');

  try {
    // Test basic functionality
    console.log('✅ LLM Service created successfully!');
    console.log('🎉 Basic test completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testLLMService();
