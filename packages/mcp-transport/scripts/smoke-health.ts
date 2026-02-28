#!/usr/bin/env bun
/**
 * MCP Server Health Check — TypeScript smoke test.
 *
 * Hits the /api/health endpoint for a given environment and validates the response.
 * Replaces duplicated curl-based health checks from shell scripts.
 *
 * Usage:
 *   bun run scripts/smoke-health.ts               # defaults to MCP_ENV or local
 *   bun run scripts/smoke-health.ts staging
 *   bun run scripts/smoke-health.ts production
 */

import { getMCPEnvironmentConfig } from "../src/config/mcp-environments.js"

type Env = "local" | "staging" | "production"

const arg = process.argv[2] as Env | undefined
const env: Env = arg || (process.env.MCP_ENV as Env) || "local"

if (!["local", "staging", "production"].includes(env)) {
  console.error(`Unknown environment: ${env}`)
  console.error("Usage: bun run scripts/smoke-health.ts [local|staging|production]")
  process.exit(1)
}

const config = getMCPEnvironmentConfig(env)
const healthUrl = `${config.apiUrl}/api/health`

console.log(`Checking ${env} health at ${healthUrl}...`)

const start = performance.now()

try {
  const response = await fetch(healthUrl, {
    signal: AbortSignal.timeout(10_000),
  })
  const elapsed = (performance.now() - start).toFixed(0)

  if (!response.ok) {
    console.error(`✗ Health check failed: HTTP ${response.status} (${elapsed}ms)`)
    process.exit(1)
  }

  const body = await response.json()
  console.log(`✓ Health check passed (${elapsed}ms)`)
  console.log(`  Status: ${response.status}`)
  console.log(`  Response: ${JSON.stringify(body)}`)

  // Warn if response time exceeds SLA (3 seconds)
  if (Number(elapsed) > 3000) {
    console.log(`  ⚠ Response time ${elapsed}ms exceeds 3s SLA`)
  }

  process.exit(0)
} catch (error) {
  const elapsed = (performance.now() - start).toFixed(0)
  const message = error instanceof Error ? error.message : String(error)
  console.error(`✗ Health check failed after ${elapsed}ms: ${message}`)
  process.exit(1)
}
