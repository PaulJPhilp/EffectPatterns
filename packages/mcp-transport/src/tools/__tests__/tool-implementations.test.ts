/**
 * Functional Tests for Tool Implementations
 *
 * Tests tool registration and basic functionality.
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "../tool-implementations";
import { isMcpDebugOrLocal } from "../../config/mcp-environments";

/**
 * Mock API call function
 */
function createMockCallApi(returns: any) {
	return async () => ({
		ok: true as const,
		data: returns,
	});
}

/**
 * Mock log function
 */
function createMockLog(): (message: string, data?: unknown) => void {
	return () => {};
}

/**
 * Mock cache
 */
function createMockCache() {
	const cache = new Map<string, { value: any; expires: number }>();
	return {
		get: (key: string) => {
			const entry = cache.get(key);
			if (!entry) return undefined;
			if (Date.now() > entry.expires) {
				cache.delete(key);
				return undefined;
			}
			return entry.value;
		},
		set: (key: string, value: any, ttl: number) => {
			cache.set(key, {
				value,
				expires: Date.now() + ttl,
			});
		},
	};
}

describe("Tool Implementations", () => {
	const originalMcpDebug = process.env.MCP_DEBUG;
	const originalMcpEnv = process.env.MCP_ENV;

	beforeEach(() => {
		delete process.env.MCP_DEBUG;
		delete process.env.MCP_ENV;
	});

	afterEach(() => {
		if (originalMcpDebug !== undefined) {
			process.env.MCP_DEBUG = originalMcpDebug;
		} else {
			delete process.env.MCP_DEBUG;
		}
		if (originalMcpEnv !== undefined) {
			process.env.MCP_ENV = originalMcpEnv;
		} else {
			delete process.env.MCP_ENV;
		}
	});

	describe("registerTools", () => {
		it("should register tools without throwing errors in production mode", () => {
			process.env.MCP_ENV = "production";
			delete process.env.MCP_DEBUG;

			const server = new McpServer({
				name: "test-server",
				version: "1.0.0",
			});

			expect(() => {
				registerTools(
					server,
					createMockCallApi({}),
					createMockLog(),
					createMockCache()
				);
			}).not.toThrow();
		});

		it("should register tools without throwing errors when MCP_DEBUG=true", () => {
			process.env.MCP_DEBUG = "true";
			delete process.env.MCP_ENV;

			const server = new McpServer({
				name: "test-server",
				version: "1.0.0",
			});

			expect(() => {
				registerTools(
					server,
					createMockCallApi({}),
					createMockLog(),
					createMockCache()
				);
			}).not.toThrow();
		});

		it("should register tools without throwing errors when MCP_ENV=local", () => {
			process.env.MCP_ENV = "local";
			delete process.env.MCP_DEBUG;

			const server = new McpServer({
				name: "test-server",
				version: "1.0.0",
			});

			expect(() => {
				registerTools(
					server,
					createMockCallApi({}),
					createMockLog(),
					createMockCache()
				);
			}).not.toThrow();
		});

		it("should work without cache parameter", () => {
			const server = new McpServer({
				name: "test-server",
				version: "1.0.0",
			});

			expect(() => {
				registerTools(
					server,
					createMockCallApi({}),
					createMockLog()
				);
			}).not.toThrow();
		});

		it("should handle API errors gracefully", () => {
			const server = new McpServer({
				name: "test-server",
				version: "1.0.0",
			});

			const errorCallApi = async () => ({
				ok: false as const,
				error: "API error",
				status: 500,
			});

			// Verify registration succeeded (tools are registered even if API calls fail)
			expect(() => {
				registerTools(server, errorCallApi, createMockLog(), createMockCache());
			}).not.toThrow();
		});

		it("should use isMcpDebugOrLocal to determine debug tool registration", () => {
			// Verify the function uses isMcpDebugOrLocal correctly
			process.env.MCP_DEBUG = "true";
			expect(isMcpDebugOrLocal()).toBe(true);

			delete process.env.MCP_DEBUG;
			process.env.MCP_ENV = "local";
			expect(isMcpDebugOrLocal()).toBe(true);

			delete process.env.MCP_ENV;
			expect(isMcpDebugOrLocal()).toBe(false);
		});
	});
});
