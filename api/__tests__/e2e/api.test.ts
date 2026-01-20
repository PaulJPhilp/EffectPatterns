/**
 * E2E tests for the API endpoints
 */

import { describe, expect, it } from "vitest";
import {
    API_HEALTH,
    API_NAME,
    API_RULES_BY_ID,
    API_RULES_LIST,
    API_VERSION,
    DEFAULT_API_BASE_URL,
    ERROR_NOT_FOUND,
    ERROR_RULE_NOT_FOUND,
    PERFORMANCE_TIMEOUT_MS,
} from "api/constants.js";
import {
    ApiDocumentation,
    ApiRule,
    ErrorResponse,
    HealthCheck,
} from "api/types.js";

describe("API E2E Tests", () => {
    const baseUrl = process.env.API_BASE_URL || DEFAULT_API_BASE_URL;

    describe("GET /", () => {
        it("should return API documentation", async () => {
            const response = await fetch(`${baseUrl}/`);
            const data = (await response.json()) as ApiDocumentation;

            expect(response.status).toBe(200);
            expect(data.name).toBe(API_NAME);
            expect(data.version).toBe(API_VERSION);
            expect(data.description).toBeDefined();
            expect(data.repository).toBeDefined();
            expect(data.endpoints).toBeDefined();
            expect(data.endpoints.health).toBe(API_HEALTH);
            expect(data.endpoints.rules.list).toBe(API_RULES_LIST);
            expect(data.endpoints.rules.get).toBe(API_RULES_BY_ID);
        });
    });

    describe("GET /health", () => {
        it("should return health status", async () => {
            const response = await fetch(`${baseUrl}/health`);
            const data = (await response.json()) as HealthCheck;

            expect(response.status).toBe(200);
            expect(data.status).toBe("ok");
        });
    });

    describe("GET /api/v1/rules", () => {
        it("should return list of all rules", async () => {
            const response = await fetch(`${baseUrl}/api/v1/rules`);
            const data = (await response.json()) as ApiRule[];

            expect(response.status).toBe(200);
            expect(Array.isArray(data)).toBe(true);

            if (data.length > 0) {
                const firstRule = data[0];
                expect(firstRule.id).toBeDefined();
                expect(firstRule.title).toBeDefined();
                expect(firstRule.description).toBeDefined();
                expect(firstRule.content).toBeDefined();
                expect(typeof firstRule.id).toBe("string");
                expect(typeof firstRule.title).toBe("string");
                expect(typeof firstRule.description).toBe("string");
                expect(typeof firstRule.content).toBe("string");
            }
        });

        it("should return rules with valid structure", async () => {
            const response = await fetch(`${baseUrl}/api/v1/rules`);
            const data = (await response.json()) as ApiRule[];

            expect(response.status).toBe(200);
            expect(Array.isArray(data)).toBe(true);

            data.forEach((rule: ApiRule) => {
                expect(rule.id).toBeDefined();
                expect(rule.title).toBeDefined();
                expect(rule.description).toBeDefined();
                expect(rule.content).toBeDefined();

                // Optional fields should be either undefined or valid types
                if (rule.skillLevel !== undefined) {
                    expect(typeof rule.skillLevel).toBe("string");
                }

                if (rule.useCase !== undefined) {
                    expect(Array.isArray(rule.useCase)).toBe(true);
                    rule.useCase.forEach((useCase: string) => {
                        expect(typeof useCase).toBe("string");
                    });
                }
            });
        });
    });

    describe("GET /api/v1/rules/{id}", () => {
        it("should return a specific rule when valid ID is provided", async () => {
            // First get all rules to find a valid ID
            const listResponse = await fetch(`${baseUrl}/api/v1/rules`);
            const rules = (await listResponse.json()) as ApiRule[];

            if (rules.length > 0) {
                const firstRuleId = rules[0].id;
                const response = await fetch(`${baseUrl}/api/v1/rules/${firstRuleId}`);
                const data = (await response.json()) as ApiRule;

                expect(response.status).toBe(200);
                expect(data.id).toBe(firstRuleId);
                expect(data.title).toBeDefined();
                expect(data.description).toBeDefined();
                expect(data.content).toBeDefined();
                expect(typeof data.title).toBe("string");
                expect(typeof data.description).toBe("string");
                expect(typeof data.content).toBe("string");
            }
        });

        it("should return 404 for non-existent rule ID", async () => {
            const response = await fetch(`${baseUrl}/api/v1/rules/non-existent-rule`);
            const data = (await response.json()) as ErrorResponse;

            expect(response.status).toBe(404);
            expect(data.error).toBe(ERROR_RULE_NOT_FOUND);
        });

        it("should return 404 for empty rule ID", async () => {
            const response = await fetch(`${baseUrl}/api/v1/rules/`);
            const data = (await response.json()) as ErrorResponse;

            expect(response.status).toBe(404);
        });

        it("should return 404 for malformed rule ID", async () => {
            const response = await fetch(`${baseUrl}/api/v1/rules/invalid/id`);
            const data = (await response.json()) as ErrorResponse;

            expect(response.status).toBe(404);
        });
    });

    describe("Error Handling", () => {
        it("should handle invalid routes gracefully", async () => {
            const response = await fetch(`${baseUrl}/invalid-route`);
            const data = (await response.json()) as ErrorResponse;

            expect(response.status).toBe(404);
            expect(data.error).toBe(ERROR_NOT_FOUND);
        });

        it("should handle HTTP methods not allowed", async () => {
            const response = await fetch(`${baseUrl}/api/v1/rules`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ test: "data" }),
            });

            expect(response.status).toBe(404);
        });
    });

    describe("Performance", () => {
        it("should respond within reasonable time", async () => {
            const startTime = Date.now();
            const response = await fetch(`${baseUrl}/api/v1/rules`);
            const endTime = Date.now();

            expect(response.status).toBe(200);
            expect(endTime - startTime).toBeLessThan(PERFORMANCE_TIMEOUT_MS); // 5 seconds max
        });

        it("should handle concurrent requests", async () => {
            const requests = Array.from({ length: 10 }, () =>
                fetch(`${baseUrl}/api/v1/rules`),
            );

            const responses = await Promise.all(requests);

            responses.forEach((response) => {
                expect(response.status).toBe(200);
            });
        });
    });
});
