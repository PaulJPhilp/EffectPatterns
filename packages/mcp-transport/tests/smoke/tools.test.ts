/**
 * Smoke Tests: MCP Tool Surface
 *
 * Verifies that all 5 MCP tools are accessible and return valid responses
 * from the target environment's API.
 */

import { describe, it, expect } from "vitest"
import { getActiveMCPConfig } from "../../src/config/mcp-environments.js"

const config = getActiveMCPConfig()
const baseUrl = config.apiUrl
const apiKey = config.apiKey

const hasApiKey = !!apiKey && apiKey.trim() !== ""

async function callApi(
  path: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>,
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (apiKey) {
    headers["x-api-key"] = apiKey
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  })
  const data = await res.json()
  return { status: res.status, data }
}

describe.skipIf(!hasApiKey)(`Tool Surface — ${config.name}`, () => {
  it("search_patterns: returns results for 'Effect.gen'", async () => {
    const { status, data } = await callApi("/search", "POST", {
      query: "Effect.gen",
      limit: 3,
    })
    expect(status).toBe(200)
    expect(data).toBeDefined()
    const d = data as { results?: unknown[] }
    expect(Array.isArray(d.results)).toBe(true)
  })

  it("get_pattern: retrieves a pattern by slug", async () => {
    // First search to get a valid slug
    const search = await callApi("/search", "POST", {
      query: "Effect",
      limit: 1,
    })
    const searchData = search.data as { results?: Array<{ slug?: string }> }
    const slug = searchData.results?.[0]?.slug

    if (!slug) {
      // Skip if no patterns in DB (empty staging)
      console.warn("No patterns found — skipping get_pattern test")
      return
    }

    const { status, data } = await callApi(`/patterns/${encodeURIComponent(slug)}`)
    expect(status).toBe(200)
    expect(data).toBeDefined()
  })

  it("list_analysis_rules: returns rules array", async () => {
    const { status, data } = await callApi("/list-rules", "POST", {})
    expect(status).toBe(200)
    expect(data).toBeDefined()
  })

  it("list_skills: returns skills array", async () => {
    const { status, data } = await callApi("/skills")
    expect(status).toBe(200)
    const d = data as { skills?: unknown[]; count?: number }
    expect(Array.isArray(d.skills)).toBe(true)
    expect(typeof d.count).toBe("number")
  })

  it("get_skill: retrieves a skill by slug", async () => {
    // First list to get a valid slug
    const list = await callApi("/skills")
    const listData = list.data as { skills?: Array<{ slug?: string }> }
    const slug = listData.skills?.[0]?.slug

    if (!slug) {
      console.warn("No skills found — skipping get_skill test")
      return
    }

    const { status, data } = await callApi(`/skills/${encodeURIComponent(slug)}`)
    expect(status).toBe(200)
    expect(data).toBeDefined()
  })
})
