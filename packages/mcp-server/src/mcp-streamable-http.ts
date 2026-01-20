#!/usr/bin/env node
/**
 * Effect Patterns MCP Server - Streamable HTTP Transport (MCP 2.0)
 *
 * Provides Model Context Protocol (MCP) 2.0 interface for the Effect Patterns API.
 * Supports the new Streamable HTTP transport for remote connections.
 *
 * Usage:
 *   PATTERN_API_KEY=xxx node dist/mcp-streamable-http.js
 *
 * Environment Variables:
 *   - PATTERN_API_KEY: Required. API key for accessing the patterns API
 *   - EFFECT_PATTERNS_API_URL: Optional. Base URL for patterns API (default: https://api.effect-patterns.com)
 *   - MCP_DEBUG: Optional. Enable debug logging (default: false)
 *   - PORT: Optional. Port for the HTTP server (default: 3001)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import { createServer } from "http";
import { OAuthConfig } from "./auth/oauth-config.js";
import { OAuth2Server } from "./auth/oauth-server.js";
import { ToolSchemas } from "./schemas/tool-schemas.js";

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL =
    process.env.EFFECT_PATTERNS_API_URL ||
    "https://effect-patterns-mcp.vercel.app";
const API_KEY = process.env.PATTERN_API_KEY;
const DEBUG = process.env.MCP_DEBUG === "true";
const PORT = parseInt(process.env.PORT || "3001", 10);

// OAuth 2.1 Configuration
const oauthConfig: OAuthConfig = {
    authorizationEndpoint: `http://localhost:${PORT}/auth`,
    tokenEndpoint: `http://localhost:${PORT}/token`,
    clientId: "effect-patterns-mcp",
    redirectUris: [
        "http://localhost:3000/callback",
        "http://localhost:3001/callback",
        "https://effect-patterns.com/callback",
    ],
    defaultScopes: ["mcp:access", "patterns:read"],
    supportedScopes: [
        "mcp:access",
        "patterns:read",
        "patterns:write",
        "analysis:run",
    ],
    requirePKCE: true, // OAuth 2.1 requirement
    tokenEndpointAuthMethod: "client_secret_basic",
    accessTokenLifetime: 3600, // 1 hour
    refreshTokenLifetime: 86400, // 24 hours
};

// ============================================================================
// Logging
// ============================================================================

function log(message: string, data?: unknown) {
    if (DEBUG) {
        console.error(
            `[MCP-HTTP] ${message}`,
            data ? JSON.stringify(data, null, 2) : "",
        );
    }
}

// ============================================================================
// Security Validation
// ============================================================================

function validateOrigin(origin: string | undefined): boolean {
    // For local development, allow localhost origins
    if (!origin) return true;

    const allowedOrigins = [
        "http://localhost:3000",
        "https://localhost:3000",
        "http://localhost:3001",
        "https://localhost:3001",
        "http://127.0.0.1:3000",
        "https://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://127.0.0.1:3001",
    ];

    // In production, you should restrict this to your actual domain
    if (process.env.NODE_ENV === "production") {
        allowedOrigins.push("https://effect-patterns.com");
        allowedOrigins.push("https://effect-patterns-mcp.vercel.app");
    }

    return allowedOrigins.includes(origin);
}

// ============================================================================
// API Client
// ============================================================================

async function callApi(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    data?: unknown,
) {
    if (!API_KEY) {
        throw new Error("PATTERN_API_KEY environment variable is required");
    }

    const url = `${API_BASE_URL}/api${endpoint}`;
    const options: RequestInit = {
        method,
        headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
            "MCP-Protocol-Version": "2025-11-25", // MCP 2.0 protocol version
        },
    };

    if (data && method === "POST") {
        options.body = JSON.stringify(data);
    }

    log(`API ${method} ${endpoint}`, data);

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `HTTP ${response.status}: ${errorText || response.statusText}`,
            );
        }

        const result = await response.json();
        log(`API Response`, result);
        return result;
    } catch (error) {
        log(`API Error`, error);
        throw error;
    }
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new McpServer(
    {
        name: "effect-patterns",
        version: "2.0.0",
    },
    {
        capabilities: {
            tools: {
                listChanged: true,
            },
        },
    },
);

// ============================================================================
// Tool Registrations (using same pattern as stdio version)
// ============================================================================

// Search Patterns Tool
server.registerTool(
    "search_patterns",
    {
        description: ToolSchemas.searchPatterns.description,
        // Skip input validation to avoid Zod compatibility issues
        // inputSchema: ToolSchemas.
    },
    async (args: any) => {
        const startTime = Date.now();
        log("Tool called: search_patterns", args);
        try {
            const searchParams = new URLSearchParams();
            if (args.q) searchParams.append("q", args.q);
            if (args.category) searchParams.append("category", args.category);
            if (args.difficulty) searchParams.append("difficulty", args.difficulty);
            if (args.limit) searchParams.append("limit", String(args.limit));

            const result = await callApi(`/patterns?${searchParams}`);
            const executionTime = Date.now() - startTime;

            // Build enhanced MCP 2.0 response
            const markdownContent = `# Pattern Search Results

**Query**: ${args.q}
**Category**: ${args.category || "any"}
**Difficulty**: ${args.difficulty || "any"}
**Limit**: ${args.limit || 50}
**Results Found**: ${result.results?.length || 0}
**Execution Time**: ${executionTime}ms

## Search Results

${result.results
                    ?.map(
                        (pattern: any, index: number) =>
                            `### ${index + 1}. ${pattern.title}
**ID**: \`${pattern.id}\`
**Category**: ${pattern.category}
**Difficulty**: ${pattern.difficulty}
**Tags**: ${pattern.tags?.join(", ") || "None"}

${pattern.description}

\`\`\`typescript
${pattern.codeSnippet}
\`\`\``,
                    )
                    .join("\n\n") || "No patterns found."
                }

## Related Tools
- \`get_pattern\` - Get detailed pattern information
- \`list_analysis_rules\` - See available analysis rules
- \`generate_pattern_code\` - Generate code from patterns

## Next Steps
1. Review the pattern details above
2. Use \`get_pattern\` for full documentation
3. Apply patterns to your codebase
4. Generate code with \`generate_pattern_code\``;

            return {
                content: [
                    {
                        type: "text" as const,
                        text: markdownContent,
                    },
                    {
                        type: "text" as const,
                        text: JSON.stringify(
                            {
                                query: args.q,
                                category: args.category,
                                difficulty: args.difficulty,
                                limit: args.limit,
                                resultsCount: result.results?.length || 0,
                                executionTime: `${executionTime}ms`,
                                relatedTools: [
                                    "get_pattern",
                                    "list_analysis_rules",
                                    "generate_pattern_code",
                                ],
                                nextSteps: [
                                    "Review pattern details",
                                    "Get full documentation",
                                    "Apply to codebase",
                                    "Generate code",
                                ],
                            },
                            null,
                            2,
                        ),
                    },
                ],
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const executionTime = Date.now() - startTime;
            log("Tool error: search_patterns", msg);

            const errorContent = `# Search Error

**Error**: Pattern search failed
**Execution Time**: ${executionTime}ms

## Error Details
${msg}

## Suggestions
- Check if the search query is valid
- Try with different search terms
- Use \`list_analysis_rules\` to see available patterns
- Verify API key is correct

## Related Tools
- \`list_analysis_rules\` - See available analysis rules
- \`get_pattern\` - Get pattern by ID if known

## Next Steps
1. Check your search parameters
2. Try broader search terms
3. Contact support if issue persists`;

            return {
                content: [
                    {
                        type: "text" as const,
                        text: errorContent,
                    },
                ],
                isError: true,
            };
        }
    },
);

// Get Pattern Tool
server.registerTool(
    "get_pattern",
    {
        description: ToolSchemas.getPattern.description,
        // Skip input validation to avoid Zod compatibility issues
        // inputSchema: ToolSchemas.
    },
    async (args: any) => {
        const startTime = Date.now();
        log("Tool called: get_pattern", args);
        try {
            const result = await callApi(`/patterns/${encodeURIComponent(args.id)}`);
            const executionTime = Date.now() - startTime;

            // Enhanced MCP 2.0 response with structured content
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `# ${result.title}\n\n**Category**: ${result.category}\n**Difficulty**: ${result.difficulty}\n**Tags**: ${result.tags?.join(", ") || "None"}\n\n## Description\n${result.description}\n\n## Code Example\n\`\`\`typescript\n${result.codeSnippet}\n\`\`\`\n\n## Usage Notes\n${result.usageNotes || "No specific usage notes available."}\n\n## Best Practices\n${result.bestPractices || "Follow general Effect-TS best practices."}`,
                    },
                    {
                        type: "text" as const,
                        text: JSON.stringify(
                            {
                                id: result.id,
                                title: result.title,
                                category: result.category,
                                difficulty: result.difficulty,
                                tags: result.tags,
                                executionTime: `${executionTime}ms`,
                                relatedTools: ["search_patterns", "generate_pattern_code"],
                                nextSteps: [
                                    "Review pattern documentation",
                                    "Apply pattern to your code",
                                    "Explore related patterns",
                                ],
                            },
                            null,
                            2,
                        ),
                    },
                ],
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const executionTime = Date.now() - startTime;
            log("Tool error: get_pattern", {
                error: msg,
                patternId: args.id,
                executionTime,
            });

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Error: Unable to retrieve pattern "${args.id}"\n\n${msg}\n\nSuggestions:\n- Check if the pattern ID is correct\n- Use search_patterns to find available patterns\n- Try a different pattern ID`,
                    },
                ],
                isError: true,
            };
        }
    },
);

// List Analysis Rules Tool
server.registerTool(
    "list_analysis_rules",
    {
        description: ToolSchemas.listAnalysisRules.description,
        // Skip input validation to avoid Zod compatibility issues
        // inputSchema: ToolSchemas.
    },
    async (_args: any) => {
        const startTime = Date.now();
        log("Tool called: list_analysis_rules");
        try {
            const result = await callApi("/list-rules", "POST", {});
            const executionTime = Date.now() - startTime;

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `# Available Analysis Rules\n\nFound ${result.rules?.length || 0} analysis rules for Effect-TS code validation.\n\n## Rules Overview\n\n${result.rules
                                ?.map(
                                    (rule: any, index: number) =>
                                        `### ${index + 1}. ${rule.name}\n**Category**: ${rule.category}\n**Severity**: ${rule.severity}\n**Description**: ${rule.description}\n**Pattern**: \`\`\`${rule.pattern}\`\`\``,
                                )
                                .join("\n\n") || "No rules available."
                            }\n\n## Usage\n\nUse the \`analyze_code\` tool with these rules to validate your Effect-TS code.`,
                    },
                    {
                        type: "text" as const,
                        text: JSON.stringify(
                            {
                                totalRules: result.rules?.length || 0,
                                executionTime: `${executionTime}ms`,
                                categories: [
                                    ...new Set(result.rules?.map((r: any) => r.category)),
                                ],
                                severityLevels: [
                                    ...new Set(result.rules?.map((r: any) => r.severity)),
                                ],
                                relatedTools: ["analyze_code", "review_code"],
                                nextSteps: [
                                    "Run analyze_code on your TypeScript files",
                                    "Try review_code for AI-powered suggestions",
                                    "Check patterns for best practices",
                                ],
                            },
                            null,
                            2,
                        ),
                    },
                ],
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const executionTime = Date.now() - startTime;
            log("Tool error: list_analysis_rules", { error: msg, executionTime });

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Error: Unable to retrieve analysis rules\n\n${msg}\n\nSuggestions:\n- Check if the analysis service is available\n- Try again in a few moments\n- Contact support if the issue persists`,
                    },
                ],
                isError: true,
            };
        }
    },
);

// Analyze Code Tool
server.registerTool(
    "analyze_code",
    {
        description: ToolSchemas.analyzeCode.description,
        // Skip input validation to avoid Zod compatibility issues
        // inputSchema: ToolSchemas.
    },
    async (args: any) => {
        const startTime = Date.now();
        log("Tool called: analyze_code", args);
        try {
            const result = await callApi("/analyze-code", "POST", {
                source: args.source,
                filename: args.filename,
                analysisType: args.analysisType || "all",
            });
            const executionTime = Date.now() - startTime;

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `# Code Analysis Results\n\n**File**: ${args.filename || "unnamed"}\n**Analysis Type**: ${args.analysisType || "all"}\n**Issues Found**: ${result.issues?.length || 0}\n**Execution Time**: ${executionTime}ms\n\n## Summary\n\n${result.summary || "No summary provided."}\n\n## Issues\n\n${result.issues
                                ?.map(
                                    (issue: any, index: number) =>
                                        `### ${index + 1}. ${issue.title}\n**Severity**: ${issue.severity}\n**Line**: ${issue.line}\n**Type**: ${issue.type}\n\n${issue.description}\n\n**Suggestion**: ${issue.suggestion}`,
                                )
                                .join("\n\n") || "No issues found. Great job!"
                            }\n\n## Recommendations\n\n${result.recommendations?.join("\n- ") || "No specific recommendations."}`,
                    },
                    {
                        type: "text" as const,
                        text: JSON.stringify(
                            {
                                filename: args.filename,
                                analysisType: args.analysisType || "all",
                                issuesCount: result.issues?.length || 0,
                                executionTime: `${executionTime}ms`,
                                severityBreakdown: result.issues?.reduce(
                                    (acc: any, issue: any) => {
                                        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
                                        return acc;
                                    },
                                    {},
                                ),
                                relatedTools: ["review_code", "analyze_consistency"],
                                nextSteps: [
                                    "Fix identified issues",
                                    "Run review_code for AI suggestions",
                                    "Apply refactoring patterns",
                                    "Check consistency across files",
                                ],
                            },
                            null,
                            2,
                        ),
                    },
                ],
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const executionTime = Date.now() - startTime;
            log("Tool error: analyze_code", {
                error: msg,
                filename: args.filename,
                executionTime,
            });

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Error: Unable to analyze code\n\n${msg}\n\nSuggestions:\n- Check if the source code is valid TypeScript\n- Ensure the filename is provided if specified\n- Try with a different analysis type\n- Verify the code is not too large for analysis`,
                    },
                ],
                isError: true,
            };
        }
    },
);

// Review Code Tool
server.registerTool(
    "review_code",
    {
        description: ToolSchemas.reviewCode.description,
        // Skip input validation to avoid Zod compatibility issues
        // inputSchema: ToolSchemas.
    },
    async (args: any) => {
        const startTime = Date.now();
        log("Tool called: review_code", args);
        try {
            const result = await callApi("/review-code", "POST", {
                code: args.code,
                filePath: args.filePath,
            });
            const executionTime = Date.now() - startTime;

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `# AI-Powered Code Review\n\n**File**: ${args.filePath || "unnamed"}\n**Review Type**: Architectural Analysis\n**Execution Time**: ${executionTime}ms\n\n## Overview\n\n${result.overview || "No overview provided."}\n\n## Top Recommendations\n\n${result.suggestions
                                ?.map(
                                    (suggestion: any, index: number) =>
                                        `### ${index + 1}. ${suggestion.title}\n**Priority**: ${suggestion.priority}\n**Impact**: ${suggestion.impact}\n\n${suggestion.description}\n\n**Example**: \`\`\`${suggestion.example || "N/A"}\`\`\``,
                                )
                                .join("\n\n") || "No suggestions available."
                            }\n\n## Key Insights\n\n${result.insights?.map((insight: string) => `• ${insight}`).join("\n") || "No specific insights."}`,
                    },
                    {
                        type: "text" as const,
                        text: JSON.stringify(
                            {
                                filePath: args.filePath,
                                suggestionsCount: result.suggestions?.length || 0,
                                executionTime: `${executionTime}ms`,
                                priorityBreakdown: result.suggestions?.reduce(
                                    (acc: any, s: any) => {
                                        acc[s.priority] = (acc[s.priority] || 0) + 1;
                                        return acc;
                                    },
                                    {},
                                ),
                                relatedTools: ["analyze_code", "apply_refactoring"],
                                nextSteps: [
                                    "Implement high-priority suggestions",
                                    "Run analyze_code for detailed issues",
                                    "Apply refactoring patterns",
                                    "Test changes thoroughly",
                                ],
                            },
                            null,
                            2,
                        ),
                    },
                ],
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const executionTime = Date.now() - startTime;
            log("Tool error: review_code", {
                error: msg,
                filePath: args.filePath,
                executionTime,
            });

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Error: Unable to review code\n\n${msg}\n\nSuggestions:\n- Check if the code is valid TypeScript/JavaScript\n- Ensure the file path is provided if specified\n- Try with a smaller code snippet\n- Verify the code follows Effect-TS patterns`,
                    },
                ],
                isError: true,
            };
        }
    },
);

// Generate Pattern Code Tool
server.registerTool(
    "generate_pattern_code",
    {
        description: ToolSchemas.generatePatternCode.description,
        // Skip input validation to avoid Zod compatibility issues
        // inputSchema: ToolSchemas.
    },
    async (args: any) => {
        const startTime = Date.now();
        log("Tool called: generate_pattern_code", args);
        try {
            const result = await callApi("/generate-pattern", "POST", {
                patternId: args.patternId,
                variables: args.variables || {},
            });
            const executionTime = Date.now() - startTime;

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `# Generated Pattern Code\n\n**Pattern**: ${args.patternId}\n**Variables**: ${Object.keys(args.variables || {}).join(", ") || "None"}\n**Execution Time**: ${executionTime}ms\n\n## Generated Code\n\n\`\`\`typescript\n${result.generatedCode}\n\`\`\`\n\n## Usage Instructions\n\n${result.usageInstructions || "Follow the pattern documentation for proper usage."}\n\n## Customization Notes\n\n${result.customizationNotes || "You can customize this pattern by adjusting the variables."}\n\n## Dependencies\n\n${result.dependencies?.map((dep: string) => `- \`${dep}\``).join("\n") || "No additional dependencies required."}`,
                    },
                    {
                        type: "text" as const,
                        text: JSON.stringify(
                            {
                                patternId: args.patternId,
                                variables: args.variables || {},
                                codeLength: result.generatedCode?.length || 0,
                                executionTime: `${executionTime}ms`,
                                dependencies: result.dependencies || [],
                                relatedTools: ["get_pattern", "search_patterns"],
                                nextSteps: [
                                    "Review the generated code",
                                    "Test the implementation",
                                    "Customize variables as needed",
                                    "Check pattern documentation",
                                ],
                            },
                            null,
                            2,
                        ),
                    },
                ],
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const executionTime = Date.now() - startTime;
            log("Tool error: generate_pattern_code", {
                error: msg,
                patternId: args.patternId,
                executionTime,
            });

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Error: Unable to generate pattern code\n\n${msg}\n\nSuggestions:\n- Check if the pattern ID is valid\n- Verify all required variables are provided\n- Try with different variable values\n- Use search_patterns to find available patterns`,
                    },
                ],
                isError: true,
            };
        }
    },
);

// Analyze Consistency Tool
server.registerTool(
    "analyze_consistency",
    {
        description: ToolSchemas.analyzeConsistency.description,
        // Skip input validation to avoid Zod compatibility issues
        // inputSchema: ToolSchemas.
    },
    async (args: any) => {
        const startTime = Date.now();
        log("Tool called: analyze_consistency", { fileCount: args.files.length });
        try {
            const result = await callApi("/analyze-consistency", "POST", {
                files: args.files,
            });
            const executionTime = Date.now() - startTime;

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `# Cross-File Consistency Analysis\n\n**Files Analyzed**: ${args.files.length}\n**Execution Time**: ${executionTime}ms\n**Issues Found**: ${result.issues?.length || 0}\n\n## Analysis Summary\n\n${result.summary || "No summary provided."}\n\n## Consistency Issues\n\n${result.issues
                                ?.map(
                                    (issue: any, index: number) =>
                                        `### ${index + 1}. ${issue.title}\n**Severity**: ${issue.severity}\n**Files Affected**: ${issue.files?.join(", ") || "Unknown"}\n**Type**: ${issue.type}\n\n${issue.description}\n\n**Recommendation**: ${issue.recommendation}`,
                                )
                                .join("\n\n") || "No consistency issues found. Great job!"
                            }\n\n## Patterns Detected\n\n${result.patterns
                                ?.map(
                                    (pattern: any) =>
                                        `**${pattern.name}**: Found in ${pattern.fileCount} files (${pattern.files?.join(", ") || "Unknown"})`,
                                )
                                .join("\n") || "No specific patterns detected."
                            }`,
                    },
                    {
                        type: "text" as const,
                        text: JSON.stringify(
                            {
                                filesAnalyzed: args.files.length,
                                issuesCount: result.issues?.length || 0,
                                patternsCount: result.patterns?.length || 0,
                                executionTime: `${executionTime}ms`,
                                severityBreakdown: result.issues?.reduce(
                                    (acc: any, issue: any) => {
                                        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
                                        return acc;
                                    },
                                    {},
                                ),
                                relatedTools: ["analyze_code", "apply_refactoring"],
                                nextSteps: [
                                    "Address consistency issues",
                                    "Apply refactoring patterns",
                                    "Standardize code patterns",
                                    "Review architectural decisions",
                                ],
                            },
                            null,
                            2,
                        ),
                    },
                ],
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const executionTime = Date.now() - startTime;
            log("Tool error: analyze_consistency", {
                error: msg,
                fileCount: args.files.length,
                executionTime,
            });

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Error: Unable to analyze consistency\n\n${msg}\n\nSuggestions:\n- Check if all files are valid TypeScript\n- Ensure file paths are correct\n- Try with fewer files (max 50)\n- Verify files are not too large`,
                    },
                ],
                isError: true,
            };
        }
    },
);

// Apply Refactoring Tool
server.registerTool(
    "apply_refactoring",
    {
        description: ToolSchemas.applyRefactoring.description,
        // Skip input validation to avoid Zod compatibility issues
        // inputSchema: ToolSchemas.
    },
    async (args: any) => {
        const startTime = Date.now();
        log("Tool called: apply_refactoring", {
            refactoringCount: args.refactoringIds.length,
            fileCount: args.files.length,
            preview: args.preview,
        });
        try {
            const result = await callApi("/apply-refactoring", "POST", {
                refactoringIds: args.refactoringIds,
                files: args.files,
                preview: args.preview !== false,
            });
            const executionTime = Date.now() - startTime;

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `# Refactoring ${args.preview ? "Preview" : "Application"}\n\n**Refactorings**: ${args.refactoringIds.join(", ")}\n**Files**: ${args.files.length}\n**Mode**: ${args.preview ? "Preview" : "Apply"}\n**Execution Time**: ${executionTime}ms\n\n## Summary\n\n${result.summary || "No summary provided."}\n\n## Changes${args.preview ? " Preview" : ""}\n\n${result.changes
                                ?.map(
                                    (change: any, index: number) =>
                                        `### ${index + 1}. ${change.file}\n**Type**: ${change.type}\n**Lines**: ${change.lines?.changed || 0} changed\n\n${change.description}\n\n**Preview**:\n\n\`\`\`typescript\n${change.preview || "No preview available"}\n\`\`\``,
                                )
                                .join("\n\n") || "No changes detected."
                            }\n\n## Impact Assessment\n\n${result.impact?.description || "No impact assessment available."}\n\n**Risk Level**: ${result.impact?.riskLevel || "Unknown"}\n**Estimated Effort**: ${result.impact?.estimatedEffort || "Unknown"}`,
                    },
                    {
                        type: "text" as const,
                        text: JSON.stringify(
                            {
                                refactoringIds: args.refactoringIds,
                                fileCount: args.files.length,
                                mode: args.preview ? "preview" : "apply",
                                changesCount: result.changes?.length || 0,
                                executionTime: `${executionTime}ms`,
                                riskLevel: result.impact?.riskLevel,
                                relatedTools: ["analyze_code", "analyze_consistency"],
                                nextSteps: args.preview
                                    ? [
                                        "Review the preview changes",
                                        "Apply the refactoring if satisfied",
                                        "Test the changes thoroughly",
                                        "Commit the changes",
                                    ]
                                    : [
                                        "Test the refactored code",
                                        "Run tests to ensure functionality",
                                        "Review changes with team",
                                        "Commit the improvements",
                                    ],
                            },
                            null,
                            2,
                        ),
                    },
                ],
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const executionTime = Date.now() - startTime;
            log("Tool error: apply_refactoring", {
                error: msg,
                refactoringCount: args.refactoringIds.length,
                fileCount: args.files.length,
                executionTime,
            });

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Error: Unable to ${args.preview ? "preview" : "apply"} refactoring\n\n${msg}\n\nSuggestions:\n- Check if refactoring IDs are valid\n- Ensure files are accessible\n- Try with preview mode first\n- Verify files are not too large\n- Check for conflicting changes`,
                    },
                ],
                isError: true,
            };
        }
    },
);

// Server Startup
// ============================================================================

async function main() {
    // Validate environment
    if (!API_KEY) {
        console.error("Error: PATTERN_API_KEY environment variable is required");
        console.error("Usage: PATTERN_API_KEY=xxx npm run mcp:http");
        process.exit(1);
    }

    log("Starting MCP 2.0 Streamable HTTP server with OAuth 2.1", {
        apiUrl: API_BASE_URL,
        port: PORT,
        debug: DEBUG,
        oauthEnabled: true,
    });

    try {
        // Initialize OAuth 2.1 server
        const oauthServer = new OAuth2Server(oauthConfig);

        // Create Streamable HTTP transport with session management
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(), // Enable stateful mode
            enableJsonResponse: false, // Use SSE streaming for better MCP 2.0 support
            onsessioninitialized: (sessionId) => {
                log("Session initialized", { sessionId });
            },
            onsessionclosed: (sessionId) => {
                log("Session closed", { sessionId });
            },
        });

        // Connect MCP server to transport
        await server.connect(transport);

        // Create HTTP server with OAuth and MCP request handling
        const httpServer = createServer(async (req, res) => {
            log("HTTP request", {
                method: req.method,
                url: req.url,
                origin: req.headers.origin,
                userAgent: req.headers["user-agent"],
            });

            // Route handling
            const url = req.url || "/";

            // OAuth endpoints
            if (url.startsWith("/auth")) {
                await oauthServer.handleAuthorizationRequest(req, res);
                return;
            }

            if (url.startsWith("/token")) {
                await oauthServer.handleTokenRequest(req, res);
                return;
            }

            // MCP endpoint with OAuth protection
            if (url === "/mcp" && (req.method === "POST" || req.method === "GET")) {
                // Validate OAuth token
                const session = await oauthServer.validateBearerToken(req);
                if (!session) {
                    log("Unauthorized MCP request - missing or invalid token");
                    res.writeHead(401, {
                        "Content-Type": "application/json",
                        "WWW-Authenticate":
                            'Bearer realm="MCP Server", error="invalid_token"',
                    });
                    res.end(
                        JSON.stringify({
                            jsonrpc: "2.0",
                            error: {
                                code: -32001,
                                message: "Unauthorized - valid OAuth token required",
                            },
                        }),
                    );
                    return;
                }

                // Validate Origin header to prevent DNS rebinding attacks
                const origin = req.headers.origin;
                if (!validateOrigin(origin)) {
                    log("Invalid origin rejected", {
                        origin,
                        sessionId: session.clientId,
                    });
                    res.writeHead(403, { "Content-Type": "application/json" });
                    res.end(
                        JSON.stringify({
                            jsonrpc: "2.0",
                            error: {
                                code: -32600,
                                message: "Invalid Origin header",
                            },
                        }),
                    );
                    return;
                }

                // Add MCP protocol version and OAuth info to headers
                res.setHeader("MCP-Protocol-Version", "2025-11-25");
                res.setHeader("X-OAuth-Client-ID", session.clientId);
                res.setHeader("X-OAuth-Scopes", session.scopes.join(" "));

                try {
                    // Parse body for POST requests
                    let parsedBody;
                    if (req.method === "POST") {
                        const chunks: any[] = [];
                        for await (const chunk of req) {
                            chunks.push(chunk);
                        }
                        const body = Buffer.concat(chunks).toString();
                        parsedBody = body ? JSON.parse(body) : undefined;
                    }

                    // Handle the MCP request
                    await transport.handleRequest(req, res, parsedBody);
                } catch (error) {
                    log("Request handling error", { error, sessionId: session.clientId });
                    if (!res.headersSent) {
                        res.writeHead(500, { "Content-Type": "application/json" });
                        res.end(
                            JSON.stringify({
                                jsonrpc: "2.0",
                                error: {
                                    code: -32603,
                                    message: "Internal server error",
                                },
                            }),
                        );
                    }
                }
                return;
            }

            // OAuth discovery endpoint
            if (url === "/.well-known/oauth-authorization-server") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                    JSON.stringify({
                        issuer: `http://localhost:${PORT}`,
                        authorization_endpoint: oauthConfig.authorizationEndpoint,
                        token_endpoint: oauthConfig.tokenEndpoint,
                        response_types_supported: ["code"],
                        grant_types_supported: ["authorization_code", "refresh_token"],
                        scopes_supported: oauthConfig.supportedScopes,
                        token_endpoint_auth_methods_supported: ["client_secret_basic"],
                        code_challenge_methods_supported: ["S256"],
                        require_pkce: oauthConfig.requirePKCE,
                    }),
                );
                return;
            }

            // Server info endpoint
            if (url === "/info") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                    JSON.stringify({
                        name: "Effect Patterns MCP Server",
                        version: "2.0.0",
                        protocol: "MCP 2.0",
                        transport: "Streamable HTTP",
                        oauth: {
                            enabled: true,
                            flows: ["authorization_code", "refresh_token"],
                            pkce_required: true,
                            scopes: oauthConfig.supportedScopes,
                        },
                        endpoints: {
                            authorization: oauthConfig.authorizationEndpoint,
                            token: oauthConfig.tokenEndpoint,
                            mcp: `http://localhost:${PORT}/mcp`,
                            discovery: `http://localhost:${PORT}/.well-known/oauth-authorization-server`,
                        },
                    }),
                );
                return;
            }

            // Return 404 for other endpoints
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(
                JSON.stringify({
                    error: "Not Found",
                    message: "The requested endpoint does not exist",
                    available_endpoints: [
                        "/auth - OAuth authorization endpoint",
                        "/token - OAuth token endpoint",
                        "/mcp - MCP protocol endpoint",
                        "/.well-known/oauth-authorization-server - OAuth discovery",
                        "/info - Server information",
                    ],
                }),
            );
        });

        // Start HTTP server
        httpServer.listen(PORT, () => {
            log("MCP 2.0 Streamable HTTP server started with OAuth 2.1", {
                port: PORT,
                endpoint: `http://localhost:${PORT}/mcp`,
                protocolVersion: "2025-11-25",
                oauthEnabled: true,
                authorizationEndpoint: oauthConfig.authorizationEndpoint,
                tokenEndpoint: oauthConfig.tokenEndpoint,
            });
            console.error(
                `[Effect Patterns MCP] HTTP server started on port ${PORT}`,
            );
            console.error(
                `[Effect Patterns MCP] MCP endpoint: http://localhost:${PORT}/mcp`,
            );
            console.error(
                `[Effect Patterns MCP] OAuth authorization: http://localhost:${PORT}/auth`,
            );
            console.error(
                `[Effect Patterns MCP] OAuth token: http://localhost:${PORT}/token`,
            );
            console.error(
                `[Effect Patterns MCP] Server info: http://localhost:${PORT}/info`,
            );
        });
    } catch (error) {
        console.error("[Effect Patterns MCP] Failed to start:", error);
        process.exit(1);
    }
}

// Handle signals gracefully
process.on("SIGINT", () => {
    log("Received SIGINT, shutting down");
    process.exit(0);
});

process.on("SIGTERM", () => {
    log("Received SIGTERM, shutting down");
    process.exit(0);
});

main().catch((error) => {
    console.error("[Effect Patterns MCP] Fatal error:", error);
    process.exit(1);
});
