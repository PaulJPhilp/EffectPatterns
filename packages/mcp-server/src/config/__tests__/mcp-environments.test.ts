/**
 * MCP Environment Configuration Tests
 *
 * Tests for MCP environment configuration functions.
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
	getMCPEnvironmentConfig,
	isMcpDebugOrLocal,
	getActiveMCPEnvironment,
	getActiveMCPConfig,
	listMCPEnvironments,
} from "../mcp-environments";

describe("MCP Environment Configuration", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		// Reset environment variables
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		// Restore original environment
		process.env = { ...originalEnv };
	});

	describe("getMCPEnvironmentConfig", () => {
		it("should return local config with default URL", () => {
			delete process.env.EFFECT_PATTERNS_API_URL;
			const config = getMCPEnvironmentConfig("local");

			expect(config.name).toBe("local");
			expect(config.apiUrl).toBe("http://localhost:3000");
			expect(config.description).toBe("Local development server");
		});

		it("should return local config with custom URL from env", () => {
			process.env.EFFECT_PATTERNS_API_URL = "http://localhost:4000";
			const config = getMCPEnvironmentConfig("local");

			expect(config.name).toBe("local");
			expect(config.apiUrl).toBe("http://localhost:4000");
		});

		it("should return staging config", () => {
			const config = getMCPEnvironmentConfig("staging");

			expect(config.name).toBe("staging");
			expect(config.apiUrl).toBe(
				"https://effect-patterns-mcp-staging.vercel.app"
			);
			expect(config.description).toBe("Staging deployment");
		});

		it("should return production config", () => {
			const config = getMCPEnvironmentConfig("production");

			expect(config.name).toBe("production");
			expect(config.apiUrl).toBe("https://effect-patterns-mcp.vercel.app");
			expect(config.description).toBe("Production deployment");
		});

		it("should throw error for invalid environment", () => {
			expect(() => {
				getMCPEnvironmentConfig("invalid" as any);
			}).toThrow("Unknown environment");
		});

		it("should use LOCAL_API_KEY for local config if available", () => {
			process.env.LOCAL_API_KEY = "local-key";
			process.env.PATTERN_API_KEY = "pattern-key";
			const config = getMCPEnvironmentConfig("local");

			expect(config.apiKey).toBe("local-key");
		});

		it("should fall back to PATTERN_API_KEY for local config if LOCAL_API_KEY not set", () => {
			delete process.env.LOCAL_API_KEY;
			process.env.PATTERN_API_KEY = "pattern-key";
			const config = getMCPEnvironmentConfig("local");

			expect(config.apiKey).toBe("pattern-key");
		});

		it("should use STAGING_API_KEY for staging config if available", () => {
			process.env.STAGING_API_KEY = "staging-key";
			process.env.PATTERN_API_KEY = "pattern-key";
			const config = getMCPEnvironmentConfig("staging");

			expect(config.apiKey).toBe("staging-key");
		});

		it("should use PRODUCTION_API_KEY for production config if available", () => {
			process.env.PRODUCTION_API_KEY = "prod-key";
			process.env.PATTERN_API_KEY = "pattern-key";
			const config = getMCPEnvironmentConfig("production");

			expect(config.apiKey).toBe("prod-key");
		});
	});

	describe("isMcpDebugOrLocal", () => {
		it("should return true when MCP_DEBUG=true", () => {
			process.env.MCP_DEBUG = "true";
			delete process.env.MCP_ENV;

			expect(isMcpDebugOrLocal()).toBe(true);
		});

		it("should return true when MCP_ENV=local", () => {
			delete process.env.MCP_DEBUG;
			process.env.MCP_ENV = "local";

			expect(isMcpDebugOrLocal()).toBe(true);
		});

		it("should return true when both MCP_DEBUG=true and MCP_ENV=local", () => {
			process.env.MCP_DEBUG = "true";
			process.env.MCP_ENV = "local";

			expect(isMcpDebugOrLocal()).toBe(true);
		});

		it("should return false when neither condition is met", () => {
			delete process.env.MCP_DEBUG;
			delete process.env.MCP_ENV;

			expect(isMcpDebugOrLocal()).toBe(false);
		});

		it("should return false when MCP_ENV=production", () => {
			delete process.env.MCP_DEBUG;
			process.env.MCP_ENV = "production";

			expect(isMcpDebugOrLocal()).toBe(false);
		});

		it("should return false when MCP_DEBUG=false", () => {
			process.env.MCP_DEBUG = "false";
			delete process.env.MCP_ENV;

			expect(isMcpDebugOrLocal()).toBe(false);
		});
	});

	describe("getActiveMCPEnvironment", () => {
		it("should default to local when no env vars set", () => {
			delete process.env.MCP_ENV;
			delete process.env.DEPLOYMENT_ENV;

			expect(getActiveMCPEnvironment()).toBe("local");
		});

		it("should read MCP_ENV when set", () => {
			process.env.MCP_ENV = "staging";
			delete process.env.DEPLOYMENT_ENV;

			expect(getActiveMCPEnvironment()).toBe("staging");
		});

		it("should prefer MCP_ENV over DEPLOYMENT_ENV", () => {
			process.env.MCP_ENV = "production";
			process.env.DEPLOYMENT_ENV = "staging";

			expect(getActiveMCPEnvironment()).toBe("production");
		});

		it("should use DEPLOYMENT_ENV when MCP_ENV not set", () => {
			delete process.env.MCP_ENV;
			process.env.DEPLOYMENT_ENV = "staging";

			expect(getActiveMCPEnvironment()).toBe("staging");
		});

		it("should default to local for invalid env values", () => {
			process.env.MCP_ENV = "invalid";
			delete process.env.DEPLOYMENT_ENV;

			expect(getActiveMCPEnvironment()).toBe("local");
		});
	});

	describe("getActiveMCPConfig", () => {
		it("should return config for active environment", () => {
			process.env.MCP_ENV = "staging";

			const config = getActiveMCPConfig();

			expect(config.name).toBe("staging");
			expect(config.apiUrl).toBe(
				"https://effect-patterns-mcp-staging.vercel.app"
			);
		});

		it("should return local config by default", () => {
			delete process.env.MCP_ENV;
			delete process.env.DEPLOYMENT_ENV;

			const config = getActiveMCPConfig();

			expect(config.name).toBe("local");
			expect(config.apiUrl).toBe("http://localhost:3000");
		});
	});

	describe("listMCPEnvironments", () => {
		it("should return all 3 environments", () => {
			const environments = listMCPEnvironments();

			expect(environments).toHaveLength(3);
			expect(environments.map((e) => e.name)).toEqual([
				"local",
				"staging",
				"production",
			]);
		});

		it("should include correct URLs for each environment", () => {
			const environments = listMCPEnvironments();

			const local = environments.find((e) => e.name === "local");
			expect(local?.apiUrl).toBe("http://localhost:3000");

			const staging = environments.find((e) => e.name === "staging");
			expect(staging?.apiUrl).toBe(
				"https://effect-patterns-mcp-staging.vercel.app"
			);

			const production = environments.find((e) => e.name === "production");
			expect(production?.apiUrl).toBe("https://effect-patterns-mcp.vercel.app");
		});

		it("should include descriptions for each environment", () => {
			const environments = listMCPEnvironments();

			for (const env of environments) {
				expect(env.description).toBeDefined();
				expect(typeof env.description).toBe("string");
			}
		});
	});
});
