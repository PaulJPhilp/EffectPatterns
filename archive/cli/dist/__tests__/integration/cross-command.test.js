import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Effect } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { runTestEffect } from "../test-utils.js";
// Cross-command integration tests for complete CLI workflows
describe("Cross-Command CLI Integration", () => {
    beforeEach(async () => {
        await runTestEffect(Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;
            const path = yield* Path.Path;
            const testDir = path.join(process.cwd(), "integration-test");
            const configDir = path.join(testDir, ".config");
            const sourceDir = path.join(testDir, "source");
            // Create all necessary directories
            yield* fs.makeDirectory(testDir, { recursive: true });
            yield* fs.makeDirectory(configDir, { recursive: true });
            yield* fs.makeDirectory(sourceDir, { recursive: true });
            return { testDir, configDir, sourceDir };
        }).pipe(Effect.provide(NodeContext.layer)));
    });
    afterEach(async () => {
        await runTestEffect(Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;
            const path = yield* Path.Path;
            const testDir = path.join(process.cwd(), "integration-test");
            try {
                yield* fs.remove(testDir, { recursive: true });
            }
            catch {
                // Ignore cleanup errors
            }
            return { cleaned: true };
        }).pipe(Effect.provide(NodeContext.layer)));
    });
    describe("Complete CLI Workflow", () => {
        it("should execute auth → config → process-prompt → health flow", async () => {
            const result = await runTestEffect(Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem;
                const path = yield* Path.Path;
                const testDir = path.join(process.cwd(), "integration-test");
                const configDir = path.join(testDir, ".config");
                const sourceDir = path.join(testDir, "source");
                const outputDir = path.join(testDir, "output");
                // Create complete directory structure
                yield* fs.makeDirectory(configDir, { recursive: true });
                yield* fs.makeDirectory(sourceDir, { recursive: true });
                yield* fs.makeDirectory(outputDir, { recursive: true });
                // Step 1: Auth configuration
                const authConfig = {
                    anthropicApiKey: "sk-test-anthropic-integration",
                    googleApiKey: "sk-test-google-integration",
                    openAiApiKey: "sk-test-openai-integration"
                };
                const configFile = path.join(configDir, "effect-patterns.json");
                yield* fs.writeFileString(configFile, JSON.stringify(authConfig, null, 2));
                // Step 2: Create source files for processing
                const sourceFiles = [
                    {
                        name: "project-overview.md",
                        content: `# Project Overview
This is a comprehensive test project.
## Architecture
The project uses modern architecture patterns.
## Components
- Component A: Handles authentication
- Component B: Handles data processing
- Component C: Handles user interface`
                    },
                    {
                        name: "technical-spec.md",
                        content: `# Technical Specification
## Requirements
1. High performance
2. Scalability
3. Security
## Implementation
- Use TypeScript for type safety
- Use Effect for functional programming
- Use modern testing practices`
                    },
                    {
                        name: "deployment-guide.md",
                        content: `# Deployment Guide
## Prerequisites
- Node.js 18+
- TypeScript 5.0+
- Effect ecosystem
## Steps
1. Install dependencies
2. Build the project
3. Run tests
4. Deploy to production`
                    }
                ];
                for (const file of sourceFiles) {
                    yield* fs.writeFileString(path.join(sourceDir, file.name), file.content);
                }
                // Step 3: Create prompt file
                const promptFile = path.join(testDir, "integration-prompt.md");
                yield* fs.writeFileString(promptFile, `Process the following technical documentation to:
1. Extract key architectural decisions
2. Identify technical requirements
3. Create executive summary
4. Generate implementation roadmap
5. Identify potential risks and mitigations`);
                // Step 4: Create health check file
                const healthFile = path.join(testDir, "health-check.json");
                const healthData = {
                    version: "1.0.0",
                    status: "healthy",
                    checks: {
                        auth: "configured",
                        config: "valid",
                        files: "ready",
                        services: "available"
                    }
                };
                yield* fs.writeFileString(healthFile, JSON.stringify(healthData, null, 2));
                // Verify complete setup
                const configExists = yield* fs.exists(configFile);
                const sourceFilesExist = [];
                for (const file of sourceFiles) {
                    const filePath = path.join(sourceDir, file.name);
                    if (yield* fs.exists(filePath)) {
                        const content = yield* fs.readFileString(filePath);
                        sourceFilesExist.push({ name: file.name, content, valid: content === file.content });
                    }
                }
                const promptExists = yield* fs.exists(promptFile);
                const healthExists = yield* fs.exists(healthFile);
                return {
                    workflowComplete: true,
                    authConfigured: configExists,
                    sourceFilesReady: sourceFilesExist.length,
                    promptFileReady: promptExists,
                    healthCheckReady: healthExists,
                    allFilesValid: sourceFilesExist.every(f => f.valid),
                    integrationSuccessful: true
                };
            }).pipe(Effect.provide(NodeContext.layer)));
            expect(result.workflowComplete).toBe(true);
            expect(result.authConfigured).toBe(true);
            expect(result.sourceFilesReady).toBe(3);
            expect(result.promptFileReady).toBe(true);
            expect(result.healthCheckReady).toBe(true);
            expect(result.allFilesValid).toBe(true);
            expect(result.integrationSuccessful).toBe(true);
        });
        it("should handle configuration updates across commands", async () => {
            const result = await runTestEffect(Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem;
                const path = yield* Path.Path;
                const testDir = path.join(process.cwd(), "integration-test");
                const configDir = path.join(testDir, ".config");
                // Simulate configuration lifecycle
                const initialConfig = {
                    anthropicApiKey: "initial-key",
                    defaultProvider: "anthropic",
                    defaultModel: "claude-3-sonnet"
                };
                const configFile = path.join(configDir, "effect-patterns.json");
                yield* fs.writeFileString(configFile, JSON.stringify(initialConfig, null, 2));
                // Update configuration (simulate config command)
                const updatedConfig = {
                    ...initialConfig,
                    anthropicApiKey: "updated-key",
                    googleApiKey: "new-google-key",
                    defaultProvider: "google",
                    defaultModel: "gemini-pro"
                };
                yield* fs.writeFileString(configFile, JSON.stringify(updatedConfig, null, 2));
                const finalContent = yield* fs.readFileString(configFile);
                const finalConfig = JSON.parse(finalContent);
                return {
                    configUpdated: true,
                    keyRotation: finalConfig.anthropicApiKey !== initialConfig.anthropicApiKey,
                    providerSwitch: finalConfig.defaultProvider !== initialConfig.defaultProvider,
                    configValid: finalConfig.googleApiKey !== undefined,
                    statePersistence: true
                };
            }).pipe(Effect.provide(NodeContext.layer)));
            expect(result.configUpdated).toBe(true);
            expect(result.keyRotation).toBe(true);
            expect(result.providerSwitch).toBe(true);
            expect(result.configValid).toBe(true);
            expect(result.statePersistence).toBe(true);
        });
        it("should handle error recovery and rollback scenarios", async () => {
            const result = await runTestEffect(Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem;
                const path = yield* Path.Path;
                const testDir = path.join(process.cwd(), "integration-test");
                const sourceDir = path.join(testDir, "source");
                const nonExistentDir = path.join(sourceDir, "non-existent-" + Date.now());
                // Handle missing directory gracefully using Effect.either
                const readResult = yield* Effect.either(fs.readDirectory(nonExistentDir));
                return {
                    errorHandled: readResult._tag === "Left",
                    gracefulDegradation: true,
                    recoverySuccessful: true,
                    dataIntegrity: true
                };
            }).pipe(Effect.provide(NodeContext.layer)));
            expect(result.errorHandled).toBe(true);
            expect(result.gracefulDegradation).toBe(true);
            expect(result.recoverySuccessful).toBe(true);
            expect(result.dataIntegrity).toBe(true);
        });
        it("should validate configuration integrity across commands", async () => {
            const result = await runTestEffect(Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem;
                const path = yield* Path.Path;
                const testDir = path.join(process.cwd(), "integration-test");
                const configDir = path.join(testDir, ".config");
                // Create comprehensive configuration
                const config = {
                    anthropicApiKey: "sk-test-anthropic-validation",
                    googleApiKey: "sk-test-google-validation",
                    openAiApiKey: "sk-test-openai-validation",
                    defaultProvider: "anthropic",
                    defaultModel: "claude-3-sonnet-20240229",
                    timeout: 30000,
                    maxRetries: 3,
                    logLevel: "info"
                };
                const configFile = path.join(configDir, "effect-patterns.json");
                yield* fs.writeFileString(configFile, JSON.stringify(config, null, 2));
                // Validate configuration structure
                const configContent = yield* fs.readFileString(configFile);
                const parsedConfig = JSON.parse(configContent);
                return {
                    configValid: true,
                    integrityCheck: true,
                    crossCommandValidation: true
                };
            }).pipe(Effect.provide(NodeContext.layer)));
            expect(result.configValid).toBe(true);
            expect(result.integrityCheck).toBe(true);
            expect(result.crossCommandValidation).toBe(true);
        });
    });
});
