#!/usr/bin/env tsx

import { config } from "dotenv";
import { myProvider } from "../app/code-assistant/lib/ai/providers";
import { chatModels } from "../app/code-assistant/lib/ai/models";
import { generateText } from "ai";

// Load environment variables
config({ path: "../app/code-assistant/.env.local" });

const TEST_PROMPT = "Where is Paris?";

async function testModel(modelId: string) {
  console.log(`\n🔍 Testing model: ${modelId}`);

  const startTime = Date.now();

  try {
    const result = await generateText({
      model: myProvider.languageModel(modelId),
      system: "You are a helpful assistant.",
      messages: [
        {
          role: "user",
          content: TEST_PROMPT,
        },
      ],
    });

    const fullResponse = result.text;

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ ${modelId} (${duration}ms)`);
    console.log(`📝 Response: ${fullResponse.slice(0, 200)}${fullResponse.length > 200 ? '...' : ''}`);

    return {
      success: true,
      modelId,
      response: fullResponse,
      duration,
    };

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`❌ ${modelId} (${duration}ms)`);
    console.log(`🚨 Error: ${error instanceof Error ? error.message : String(error)}`);

    return {
      success: false,
      modelId,
      error: error instanceof Error ? error.message : String(error),
      duration,
    };
  }
}

async function testAllModels() {
  console.log("🚀 Starting Model Tester");
  console.log(`📝 Test prompt: "${TEST_PROMPT}"`);
  console.log(`📊 Testing ${chatModels.length} models...`);

  const results = [];

  for (const model of chatModels) {
    const result = await testModel(model.id);
    results.push(result);

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n📊 SUMMARY");
  console.log("=".repeat(50));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (successful.length > 0) {
    console.log("\n🎯 Successful models:");
    successful.forEach(result => {
      console.log(`  • ${result.modelId} (${result.duration}ms)`);
    });
  }

  if (failed.length > 0) {
    console.log("\n💥 Failed models:");
    failed.forEach(result => {
      console.log(`  • ${result.modelId}: ${result.error}`);
    });
  }

  console.log("\n🏁 Model testing complete!");
}

// Run the test
testAllModels().catch(console.error);
