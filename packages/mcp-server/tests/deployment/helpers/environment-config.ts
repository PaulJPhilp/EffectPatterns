/**
 * Deployment Environment Configuration
 *
 * Provides configuration for testing against staging and production deployments.
 */

export interface DeploymentConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  timeout: number;
}

/**
 * Get configuration for specified deployment environment
 */
export function getDeploymentConfig(env: string): DeploymentConfig {
  const stagingApiKey = process.env.STAGING_API_KEY;
  const productionApiKey = process.env.PRODUCTION_API_KEY;

  switch (env.toLowerCase()) {
    case "staging":
      return {
        name: "Staging",
        baseUrl: "https://effect-patterns-mcp-staging.vercel.app",
        apiKey: stagingApiKey,
        timeout: 10000,
      };

    case "production":
      return {
        name: "Production",
        baseUrl: "https://effect-patterns-mcp.vercel.app",
        apiKey: productionApiKey,
        timeout: 10000,
      };

    case "local":
      return {
        name: "Local",
        baseUrl: "http://localhost:3000",
        apiKey: "test-api-key",
        timeout: 5000,
      };

    default:
      throw new Error(`Unknown deployment environment: ${env}`);
  }
}

/**
 * Get environment to test against
 * Respects DEPLOYMENT_ENV env var, defaults to staging
 */
export function getActiveEnvironment(): string {
  return process.env.DEPLOYMENT_ENV || "staging";
}

/**
 * Get configuration for active environment
 */
export function getActiveConfig(): DeploymentConfig {
  const env = getActiveEnvironment();
  const config = getDeploymentConfig(env);

  // Validate API key is available
  if (!config.apiKey) {
    throw new Error(
      `API key not configured for ${config.name} environment. ` +
        `Set ${env.toUpperCase()}_API_KEY environment variable.`
    );
  }

  return config;
}

/**
 * Common endpoints to test
 */
export const endpoints = {
  health: "/api/health",
  patterns: "/api/patterns",
  patternById: (id: string) => `/api/patterns/${id}`,
  analyzeCode: "/api/analyze-code",
  reviewCode: "/api/review-code",
  listRules: "/api/list-rules",
  generatePattern: "/api/generate-pattern",
  analyzeConsistency: "/api/analyze-consistency",
  applyRefactoring: "/api/apply-refactoring",
};

/**
 * API SLA definitions (in milliseconds)
 */
export const sla = {
  healthCheck: 2000,
  search: 3000,
  analysis: 5000,
  generation: 8000,
  averageResponse: 3000,
};

/**
 * Test data fixtures
 */
export const testData = {
  searchQuery: "retry",
  patternId: "effect-service",
  sampleCode: `
export const handler = (input: any) => {
  return input * 2;
};
  `.trim(),
};
