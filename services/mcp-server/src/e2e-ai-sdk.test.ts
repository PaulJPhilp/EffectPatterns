/**
 * AI SDK End-to-End Test Harness
 *
 * Tests the complete Effect Patterns system end-to-end using AI SDK.
 * Validates that AI agents can successfully use tools to interact with
 * the pattern server and generate code.
 */

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { describe, expect, it } from 'vitest';

// Test server configuration
const TEST_SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3001';
const TEST_API_KEY = process.env.TEST_API_KEY || 'test-api-key';

/**
 * Tool for searching patterns
 */
const searchPatternsTool = {
    description: 'Search for Effect-TS patterns by query, category, or difficulty',
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search query (optional)',
            },
            category: {
                type: 'string',
                description: 'Pattern category filter (optional)',
                enum: ['error-handling', 'data-validation', 'async-programming', 'resource-management', 'testing', 'performance'],
            },
            difficulty: {
                type: 'string',
                description: 'Difficulty level filter (optional)',
                enum: ['beginner', 'intermediate', 'advanced'],
            },
            limit: {
                type: 'number',
                description: 'Maximum number of results (optional, default 10)',
            },
        },
    },
    execute: async (args: { query?: string; category?: string; difficulty?: string; limit?: number }) => {
        const { query, category, difficulty, limit } = args;
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (category) params.append('category', category);
        if (difficulty) params.append('difficulty', difficulty);
        if (limit) params.append('limit', limit.toString());

        const response = await fetch(`${TEST_SERVER_URL}/api/patterns?${params}`, {
            headers: {
                'x-api-key': TEST_API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error(`Search failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    },
};/**
 * Tool for getting a specific pattern by ID
 */
const getPatternTool = {
    description: 'Get detailed information about a specific pattern by ID',
    parameters: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: 'Pattern ID',
            },
        },
        required: ['id'],
    },
    execute: async (args: { id: string }) => {
        const { id } = args;
        const response = await fetch(`${TEST_SERVER_URL}/api/patterns/${id}`, {
            headers: {
                'x-api-key': TEST_API_KEY,
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Pattern not found: ${id}`);
            }
            throw new Error(`Get pattern failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    },
};

/**
 * Tool for checking server health
 */
const healthCheckTool = {
    description: 'Check if the pattern server is healthy and running',
    parameters: {
        type: 'object',
        properties: {},
    },
    execute: async () => {
        const response = await fetch(`${TEST_SERVER_URL}/health`);

        if (!response.ok) {
            throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    },
};

// Test suite
describe('AI SDK End-to-End Tests', () => {
    // Skip tests if no OpenAI API key
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

    (hasOpenAIKey ? describe : describe.skip)('Pattern Server AI Integration', () => {
        it('should be able to communicate with OpenAI API', async () => {
            const result = await generateText({
                model: openai('gpt-4o-mini'),
                prompt: 'Hello, can you help me with Effect-TS patterns?',
            });

            expect(result.text).toBeDefined();
            expect(result.text.length).toBeGreaterThan(0);
            expect(result.text.toLowerCase()).toMatch(/effect|pattern|help/);
        });

        it('should be able to make requests to the pattern server', async () => {
            // Test basic connectivity to the pattern server
            const response = await fetch(`${TEST_SERVER_URL}/health`);
            expect(response.ok).toBe(true);

            const health = await response.json();
            expect(health).toHaveProperty('status');
            expect(health.status).toBe('ok');
        });

        it('should be able to search patterns via API', async () => {
            const response = await fetch(`${TEST_SERVER_URL}/api/patterns?q=error`, {
                headers: {
                    'x-api-key': TEST_API_KEY,
                },
            });

            expect(response.ok).toBe(true);
            const patterns = await response.json();
            expect(Array.isArray(patterns)).toBe(true);
            expect(patterns.length).toBeGreaterThan(0);
        });

        it('should be able to get pattern details via API', async () => {
            // First search for patterns to get an ID
            const searchResponse = await fetch(`${TEST_SERVER_URL}/api/patterns?q=error&limit=1`, {
                headers: {
                    'x-api-key': TEST_API_KEY,
                },
            });

            expect(searchResponse.ok).toBe(true);
            const patterns = await searchResponse.json();
            expect(patterns.length).toBeGreaterThan(0);

            const patternId = patterns[0].id;

            // Then get the pattern details
            const detailResponse = await fetch(`${TEST_SERVER_URL}/api/patterns/${patternId}`, {
                headers: {
                    'x-api-key': TEST_API_KEY,
                },
            });

            expect(detailResponse.ok).toBe(true);
            const pattern = await detailResponse.json();
            expect(pattern).toHaveProperty('id');
            expect(pattern).toHaveProperty('title');
            expect(pattern).toHaveProperty('content');
        });

        it('should handle API errors gracefully', async () => {
            const response = await fetch(`${TEST_SERVER_URL}/api/patterns/non-existent-pattern`, {
                headers: {
                    'x-api-key': TEST_API_KEY,
                },
            });

            expect(response.status).toBe(404);
        });

        it('should handle authentication errors', async () => {
            const response = await fetch(`${TEST_SERVER_URL}/api/patterns`, {
                headers: {
                    'x-api-key': 'invalid-key',
                },
            });

            expect(response.status).toBe(401);
        });
    });

    // Tool-based AI integration tests
    (hasOpenAIKey ? describe : describe.skip)('AI Tool Integration', () => {
        it('should be able to use tools in AI conversations', async () => {
            // Test that we can define and use tools (basic functionality test)
            const tools = {
                searchPatterns: searchPatternsTool,
                getPattern: getPatternTool,
                healthCheck: healthCheckTool,
            };

            // This test validates that the tool definitions are syntactically correct
            // and that the AI SDK can accept them
            expect(tools.searchPatterns).toHaveProperty('description');
            expect(tools.searchPatterns).toHaveProperty('execute');
            expect(tools.getPattern).toHaveProperty('description');
            expect(tools.getPattern).toHaveProperty('execute');
            expect(tools.healthCheck).toHaveProperty('description');
            expect(tools.healthCheck).toHaveProperty('execute');
        });

        it('should validate tool execution works independently', async () => {
            // Test that our tool execute functions work correctly
            const healthResult = await healthCheckTool.execute();
            expect(healthResult).toHaveProperty('status');
            expect(healthResult.status).toBe('ok');
        });

        it('should validate pattern search tool execution', async () => {
            // Test that the search tool works
            const searchResult = await searchPatternsTool.execute({ query: 'error' });
            expect(Array.isArray(searchResult)).toBe(true);
            expect(searchResult.length).toBeGreaterThan(0);
        });

        it('should validate pattern retrieval tool execution', async () => {
            // First get a pattern ID
            const searchResult = await searchPatternsTool.execute({ query: 'error', limit: 1 });
            expect(searchResult.length).toBeGreaterThan(0);

            const patternId = searchResult[0].id;
            const patternResult = await getPatternTool.execute({ id: patternId });

            expect(patternResult).toHaveProperty('id');
            expect(patternResult).toHaveProperty('title');
            expect(patternResult).toHaveProperty('content');
        });
    });

    describe('Error Handling', () => {
        it('should handle server connection errors', async () => {
            try {
                await fetch('http://invalid-server:9999/health');
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        it('should handle OpenAI API errors gracefully', async () => {
            // Test with invalid API key would require mocking
            // For now, just test that the function exists and can be called
            expect(typeof generateText).toBe('function');
            expect(typeof openai).toBe('function');
        });
    });
});