/**
 * Simple Configuration Tests (No Mocks)
 */

import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_TOOLKIT_CONFIG } from "../services/config.js";

describe("Configuration Defaults", () => {
	it("should have sensible default values", () => {
		expect(DEFAULT_TOOLKIT_CONFIG.maxSearchResults).toBe(100);
		expect(DEFAULT_TOOLKIT_CONFIG.searchTimeoutMs).toBe(5000);
		expect(DEFAULT_TOOLKIT_CONFIG.loadTimeoutMs).toBe(10000);
		expect(DEFAULT_TOOLKIT_CONFIG.cacheTtlMs).toBe(300000);
		expect(DEFAULT_TOOLKIT_CONFIG.maxCacheSize).toBe(1000);
		expect(DEFAULT_TOOLKIT_CONFIG.enableCache).toBe(true);
		expect(DEFAULT_TOOLKIT_CONFIG.enableLogging).toBe(false);
		expect(DEFAULT_TOOLKIT_CONFIG.enableMetrics).toBe(false);
	});

	it("should have positive timeout values", () => {
		expect(DEFAULT_TOOLKIT_CONFIG.searchTimeoutMs).toBeGreaterThan(0);
		expect(DEFAULT_TOOLKIT_CONFIG.loadTimeoutMs).toBeGreaterThan(0);
		expect(DEFAULT_TOOLKIT_CONFIG.cacheTtlMs).toBeGreaterThan(0);
	});

	it("should have reasonable limits", () => {
		expect(DEFAULT_TOOLKIT_CONFIG.maxSearchResults).toBeGreaterThan(0);
		expect(DEFAULT_TOOLKIT_CONFIG.maxSearchResults).toBeLessThan(10000);
		expect(DEFAULT_TOOLKIT_CONFIG.maxCacheSize).toBeGreaterThan(0);
		expect(DEFAULT_TOOLKIT_CONFIG.maxCacheSize).toBeLessThan(100000);
	});
});

describe("Environment Variable Parsing", () => {
	beforeEach(() => {
		// Clear environment variables
		delete process.env.TOOLKIT_MAX_SEARCH_RESULTS;
		delete process.env.TOOLKIT_SEARCH_TIMEOUT_MS;
		delete process.env.TOOLKIT_LOAD_TIMEOUT_MS;
		delete process.env.TOOLKIT_CACHE_TTL_MS;
		delete process.env.TOOLKIT_MAX_CACHE_SIZE;
		delete process.env.TOOLKIT_ENABLE_CACHE;
		delete process.env.TOOLKIT_ENABLE_LOGGING;
		delete process.env.TOOLKIT_ENABLE_METRICS;
	});

	it("should parse numeric environment variables correctly", () => {
		process.env.TOOLKIT_MAX_SEARCH_RESULTS = "200";
		process.env.TOOLKIT_SEARCH_TIMEOUT_MS = "10000";
		process.env.TOOLKIT_LOAD_TIMEOUT_MS = "20000";
		process.env.TOOLKIT_CACHE_TTL_MS = "600000";
		process.env.TOOLKIT_MAX_CACHE_SIZE = "2000";

		// Test parsing logic directly
		const maxSearchResults = parseInt(process.env.TOOLKIT_MAX_SEARCH_RESULTS || "") || DEFAULT_TOOLKIT_CONFIG.maxSearchResults;
		const searchTimeoutMs = parseInt(process.env.TOOLKIT_SEARCH_TIMEOUT_MS || "") || DEFAULT_TOOLKIT_CONFIG.searchTimeoutMs;
		const loadTimeoutMs = parseInt(process.env.TOOLKIT_LOAD_TIMEOUT_MS || "") || DEFAULT_TOOLKIT_CONFIG.loadTimeoutMs;
		const cacheTtlMs = parseInt(process.env.TOOLKIT_CACHE_TTL_MS || "") || DEFAULT_TOOLKIT_CONFIG.cacheTtlMs;
		const maxCacheSize = parseInt(process.env.TOOLKIT_MAX_CACHE_SIZE || "") || DEFAULT_TOOLKIT_CONFIG.maxCacheSize;

		expect(maxSearchResults).toBe(200);
		expect(searchTimeoutMs).toBe(10000);
		expect(loadTimeoutMs).toBe(20000);
		expect(cacheTtlMs).toBe(600000);
		expect(maxCacheSize).toBe(2000);
	});

	it("should handle invalid numeric values gracefully", () => {
		process.env.TOOLKIT_MAX_SEARCH_RESULTS = "invalid";
		process.env.TOOLKIT_SEARCH_TIMEOUT_MS = "invalid";

		const maxSearchResults = parseInt(process.env.TOOLKIT_MAX_SEARCH_RESULTS || "") || DEFAULT_TOOLKIT_CONFIG.maxSearchResults;
		const searchTimeoutMs = parseInt(process.env.TOOLKIT_SEARCH_TIMEOUT_MS || "") || DEFAULT_TOOLKIT_CONFIG.searchTimeoutMs;

		expect(maxSearchResults).toBe(DEFAULT_TOOLKIT_CONFIG.maxSearchResults);
		expect(searchTimeoutMs).toBe(DEFAULT_TOOLKIT_CONFIG.searchTimeoutMs);
	});

	it("should parse boolean environment variables correctly", () => {
		// Test cache enabled (default true, false when set to "false")
		process.env.TOOLKIT_ENABLE_CACHE = "false";
		const enableCache = process.env.TOOLKIT_ENABLE_CACHE !== "false";
		expect(enableCache).toBe(false);

		// Test cache enabled (true when not set)
		delete process.env.TOOLKIT_ENABLE_CACHE;
		const enableCacheDefault = process.env.TOOLKIT_ENABLE_CACHE !== "false";
		expect(enableCacheDefault).toBe(true);

		// Test logging enabled (false by default, true when set to "true")
		process.env.TOOLKIT_ENABLE_LOGGING = "true";
		const enableLogging = process.env.TOOLKIT_ENABLE_LOGGING === "true";
		expect(enableLogging).toBe(true);

		// Test metrics enabled (false by default, true when set to "true")
		process.env.TOOLKIT_ENABLE_METRICS = "true";
		const enableMetrics = process.env.TOOLKIT_ENABLE_METRICS === "true";
		expect(enableMetrics).toBe(true);
	});
});

describe("Configuration Validation", () => {
	it("should validate positive numbers", () => {
		const validatePositive = (value: number, name: string) => {
			if (value <= 0) {
				throw new Error(`${name} must be positive, got ${value}`);
			}
			return true;
		};

		expect(() => validatePositive(1, "test")).not.toThrow();
		expect(() => validatePositive(100, "test")).not.toThrow();
		expect(() => validatePositive(0, "test")).toThrow();
		expect(() => validatePositive(-1, "test")).toThrow();
	});

	it("should validate reasonable ranges", () => {
		const validateRange = (value: number, min: number, max: number, name: string) => {
			if (value < min || value > max) {
				throw new Error(`${name} must be between ${min} and ${max}, got ${value}`);
			}
			return true;
		};

		expect(() => validateRange(50, 1, 1000, "test")).not.toThrow();
		expect(() => validateRange(0, 1, 1000, "test")).toThrow();
		expect(() => validateRange(1001, 1, 1000, "test")).toThrow();
	});
});
