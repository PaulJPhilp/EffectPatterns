/**
 * Smoke Tests: Health Endpoint
 *
 * Validates that the target environment's /api/health endpoint responds
 * correctly and within SLA bounds.
 */

import { describe, it, expect } from "vitest"
import { getActiveMCPConfig } from "../../src/config/mcp-environments.js"

const config = getActiveMCPConfig()
const baseUrl = config.apiUrl

describe(`Health — ${config.name}`, () => {
  it("responds with 200", async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(10_000),
    })
    expect(res.status).toBe(200)
  })

  it("returns valid JSON body", async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(10_000),
    })
    const body = await res.json()
    expect(body).toBeDefined()
    expect(typeof body).toBe("object")
  })

  it("responds within 3s SLA", async () => {
    const start = performance.now()
    await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(10_000),
    })
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(3_000)
  })
})
