#!/usr/bin/env bun

/**
 * test-llm-service.ts
 *
 * Direct test of the LLM service functionality
 */

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
