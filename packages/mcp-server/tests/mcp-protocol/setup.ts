/**
 * MCP Protocol Test Setup
 *
 * Configures environment for MCP protocol tests:
 * - Sets up test API key for localhost testing
 * - Configures database URL for tests
 * - Disables Vercel KV to avoid network timeouts
 */

const testApiKey = "test-api-key-mcp-protocol";

// Set test API key for MCP server to use
if (!process.env.PATTERN_API_KEY) {
  process.env.PATTERN_API_KEY = testApiKey;
}

// Configure MCP API URL for tests (localhost)
if (!process.env.EFFECT_PATTERNS_API_URL) {
  process.env.EFFECT_PATTERNS_API_URL = "http://localhost:3000";
}

// Enable debug logging for MCP tests
if (!process.env.MCP_DEBUG) {
  process.env.MCP_DEBUG = process.env.DEBUG_MCP_TESTS === "true" ? "true" : "false";
}

// Database configuration (from parent setup)
const defaultDbUrl = "postgresql://postgres:postgres@127.0.0.1:5432/effect_patterns";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = defaultDbUrl;
}

// Disable Vercel KV in test environment
if (!process.env.KV_REST_API_URL) {
  process.env.KV_REST_API_URL = "";
}

if (!process.env.KV_REST_API_TOKEN) {
  process.env.KV_REST_API_TOKEN = "";
}
