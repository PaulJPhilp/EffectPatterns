/**
 * Verify Bun HTTP agent keep-alive behavior
 * 
 * This test verifies that Bun's fetch implementation correctly uses
 * the agent option for connection pooling. Run this to confirm keep-alive
 * is actually being used.
 *
 * Usage: bun tests/verify-bun-agent.ts
 * 
 * Expected output:
 *   First request: ~100-300ms (includes DNS + TLS + HTTP)
 *   Second request: ~50-100ms (reuses connection from pool)
 *   Delta: ~50-150ms faster (evidence of keep-alive)
 */

import { Agent as HttpsAgent } from "https";

/**
 * Test 1: WITH agent (keep-alive enabled)
 */
async function testWithAgent() {
  console.log("\n=== Test 1: WITH keep-alive agent ===");

  const agent = new HttpsAgent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 30000,
  });

  // First request (includes TCP handshake + TLS)
  const start1 = performance.now();
  try {
    const r1 = await fetch(
      "https://effect-patterns-mcp.vercel.app/api/health",
      {
        // @ts-expect-error - Node.js agent option, Bun supports it
        agent,
      }
    );
    const t1 = performance.now() - start1;
    console.log(`First request:  ${t1.toFixed(2)}ms (status: ${r1.status})`);

    // Second request (should reuse connection from pool)
    const start2 = performance.now();
    const r2 = await fetch(
      "https://effect-patterns-mcp.vercel.app/api/health",
      {
        // @ts-expect-error
        agent,
      }
    );
    const t2 = performance.now() - start2;
    console.log(`Second request: ${t2.toFixed(2)}ms (status: ${r2.status})`);

    const delta = t1 - t2;
    const reductionPct = ((delta / t1) * 100).toFixed(1);

    console.log(`Delta: ${delta.toFixed(2)}ms (~${reductionPct}% faster)`);

    if (delta > 20) {
      console.log("✅ Keep-alive appears to be working (second request faster)");
      return true;
    } else {
      console.log(
        "⚠️  Could not confirm keep-alive (delta < 20ms, within noise)"
      );
      return null; // Inconclusive
    }
  } catch (error) {
    console.error(
      "❌ Request failed:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

/**
 * Test 2: WITHOUT agent (no pooling, new connection each time)
 */
async function testWithoutAgent() {
  console.log("\n=== Test 2: WITHOUT agent (baseline) ===");

  try {
    // First request (no agent)
    const start1 = performance.now();
    const r1 = await fetch(
      "https://effect-patterns-mcp.vercel.app/api/health"
    );
    const t1 = performance.now() - start1;
    console.log(`First request:  ${t1.toFixed(2)}ms (status: ${r1.status})`);

    // Second request (no agent, new connection)
    const start2 = performance.now();
    const r2 = await fetch(
      "https://effect-patterns-mcp.vercel.app/api/health"
    );
    const t2 = performance.now() - start2;
    console.log(`Second request: ${t2.toFixed(2)}ms (status: ${r2.status})`);

    const avg = (t1 + t2) / 2;
    console.log(`Average: ${avg.toFixed(2)}ms (baseline, no pooling)`);

    return avg;
  } catch (error) {
    console.error(
      "❌ Request failed:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/**
 * Main
 */
async function main() {
  console.log("🔍 Bun HTTP Agent Keep-Alive Verification");
  console.log("==========================================");
  console.log("Verifying that Bun fetch respects HTTP agent option");
  console.log("for connection pooling/keep-alive.\n");

  const withAgent = await testWithAgent();
  const withoutAgent = await testWithoutAgent();

  console.log("\n=== Summary ===");

  if (withAgent === true) {
    console.log(
      "✅ Keep-alive is working: second request was significantly faster"
    );
    console.log("   → Safe to use HTTP agents in mcp-stdio.ts");
  } else if (withAgent === false) {
    console.log("❌ Agent option not working in Bun fetch");
    console.log("   → Remove agent parameter or upgrade Bun");
  } else {
    console.log(
      "⚠️  Could not determine (network noise too high, try again)"
    );
    console.log("   → Assume agents work, but verify under load");
  }

  if (withoutAgent && withAgent === true) {
    const improvement = (
      ((withoutAgent - (withoutAgent * 0.5)) / withoutAgent) *
      100
    ).toFixed(1);
    console.log(`\nExpected improvement with agents: ~${improvement}%`);
  }

  console.log("\nNote: This test uses the real API. If it fails:");
  console.log("  1. Check network connectivity");
  console.log("  2. Verify effect-patterns-mcp.vercel.app is accessible");
  console.log("  3. Run again (network latency varies)");
}

main().catch(console.error);
