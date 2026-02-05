/**
 * MCP Server Environment Configuration
 *
 * Provides configuration for testing the MCP server against different environments:
 * - local: Local development server (http://localhost:3000)
 * - staging: Staging deployment (https://effect-patterns-mcp-staging.vercel.app)
 * - production: Production deployment (https://effect-patterns-mcp.vercel.app)
 */

export interface MCPEnvironmentConfig {
  name: string;
  apiUrl: string;
  apiKey: string | undefined;
  description: string;
}

/**
 * Get MCP environment configuration
 */
export function getMCPEnvironmentConfig(
  env: "local" | "staging" | "production" = "local",
): MCPEnvironmentConfig {
  switch (env) {
    case "local":
      return {
        name: "local",
        apiUrl: process.env.EFFECT_PATTERNS_API_URL || "http://localhost:3000",
        apiKey: process.env.LOCAL_API_KEY || process.env.PATTERN_API_KEY,
        description: "Local development server",
      };

    case "staging":
      return {
        name: "staging",
        apiUrl: "https://effect-patterns-mcp-staging.vercel.app",
        apiKey: process.env.STAGING_API_KEY || process.env.PATTERN_API_KEY,
        description: "Staging deployment",
      };

    case "production":
      return {
        name: "production",
        apiUrl: "https://effect-patterns-mcp.vercel.app",
        apiKey: process.env.PRODUCTION_API_KEY || process.env.PATTERN_API_KEY,
        description: "Production deployment",
      };

    default:
      throw new Error(`Unknown environment: ${env}`);
  }
}

/**
 * True when the debug-only MCP tool (get_mcp_config) should be registered.
 * Used to gate get_mcp_config so it does not appear in production/staging by default.
 */
export function isMcpDebugOrLocal(): boolean {
  return process.env.MCP_DEBUG === "true" || process.env.MCP_ENV === "local";
}

/**
 * Get active environment from environment variable
 */
export function getActiveMCPEnvironment(): "local" | "staging" | "production" {
  const env = process.env.MCP_ENV || process.env.DEPLOYMENT_ENV || "local";
  if (env === "local" || env === "staging" || env === "production") {
    return env;
  }
  return "local";
}

/**
 * Get configuration for active environment
 */
export function getActiveMCPConfig(): MCPEnvironmentConfig {
  const env = getActiveMCPEnvironment();
  return getMCPEnvironmentConfig(env);
}

/**
 * List all available environments
 */
export function listMCPEnvironments(): Array<{
  name: string;
  description: string;
  apiUrl: string;
}> {
  return [
    {
      name: "local",
      description: "Local development server",
      apiUrl: "http://localhost:3000",
    },
    {
      name: "staging",
      description: "Staging deployment",
      apiUrl: "https://effect-patterns-mcp-staging.vercel.app",
    },
    {
      name: "production",
      description: "Production deployment",
      apiUrl: "https://effect-patterns-mcp.vercel.app",
    },
  ];
}
