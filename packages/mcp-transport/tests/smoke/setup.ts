/**
 * Smoke Test Setup
 *
 * Configures environment for smoke tests based on MCP_ENV.
 * Sets API key and URL from environment-specific variables.
 */

import { getActiveMCPConfig } from "../../src/config/mcp-environments.js"

const config = getActiveMCPConfig()

// Propagate resolved config into env for downstream fetch calls
if (!process.env.EFFECT_PATTERNS_API_URL) {
  process.env.EFFECT_PATTERNS_API_URL = config.apiUrl
}

if (!process.env.PATTERN_API_KEY && config.apiKey) {
  process.env.PATTERN_API_KEY = config.apiKey
}

export { config }
