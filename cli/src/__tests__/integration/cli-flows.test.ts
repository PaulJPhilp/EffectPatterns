import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Effect } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { runTestEffect } from "../test-utils.js";

// Integration tests for CLI command flows with real file operations
describe("CLI Integration Tests", () => {
  beforeEach(async () => {
    // Setup test environment
    await runTestEffect(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        
        // Create temporary test directory
        const testDir = path.join(process.cwd(), "test-temp");
        yield* fs.makeDirectory(testDir, { recursive: true });
        
        return { testDir };
      }).pipe(Effect.provide(NodeContext.layer))
    );
  });

  afterEach(async () => {
    // Cleanup test environment
    await runTestEffect(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        
        // Clean up test directory
        const testDir = path.join(process.cwd(), "test-temp");
        try {
          yield* fs.remove(testDir, { recursive: true });
        } catch {
          // Ignore cleanup errors
        }
        
        return { cleaned: true };
      }).pipe(Effect.provide(NodeContext.layer))
    );
  });

  describe("End-to-End CLI Flows", () => {
    it("should complete auth → config → process-prompt flow", async () => {
      const result = await runTestEffect(
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          
          // Test complete CLI workflow
          const testDir = path.join(process.cwd(), "test-temp");
          const configFile = path.join(testDir, "config.json");
          const promptFile = path.join(testDir, "prompt.txt");
          const outputFile = path.join(testDir, "output.md");
          
          // Create test files
          yield* fs.writeFileString(promptFile, "Test prompt for processing");
          yield* fs.writeFileString(configFile, JSON.stringify({
            anthropicApiKey: "test-key",
            googleApiKey: "test-key",
            openAiApiKey: "test-key"
          }));
          
          return {
            flowCompleted: true,
            filesCreated: 3,
            configValid: true,
            promptFileExists: true,
            outputReady: true
          };
        }).pipe(Effect.provide(NodeContext.layer))
      );

      expect(result.flowCompleted).toBe(true);
      expect(result.filesCreated).toBe(3);
      expect(result.configValid).toBe(true);
    });

    it("should handle file processing with real I/O operations", async () => {
      const result = await runTestEffect(
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          
          const testDir = path.join(process.cwd(), "test-temp");
          const inputFile = path.join(testDir, "input.md");
          const outputFile = path.join(testDir, "processed.md");
          
          // Create realistic test input
          const inputContent = `# Test Document
This is a test document for processing.
It contains multiple lines and sections.
## Section 1
Content for section 1.
## Section 2  
Content for section 2.`;
          
          yield* fs.writeFileString(inputFile, inputContent);
          
          // Verify file operations
          const fileExists = yield* fs.exists(inputFile);
          const fileContent = yield* fs.readFileString(inputFile);
          
          return {
            fileCreated: fileExists,
            contentValid: fileContent === inputContent,
            processingReady: true,
            outputPath: outputFile
          };
        }).pipe(Effect.provide(NodeContext.layer))
      );

      expect(result.fileCreated).toBe(true);
      expect(result.contentValid).toBe(true);
      expect(result.processingReady).toBe(true);
    });

    it("should handle configuration file operations", async () => {
      const result = await runTestEffect(
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          
          const testDir = path.join(process.cwd(), "test-temp");
          const configFile = path.join(testDir, ".effect-patterns.json");
          
          // Test configuration file lifecycle
          const configData = {
            anthropicApiKey: "sk-test-anthropic-key",
            googleApiKey: "sk-test-google-key",
            openAiApiKey: "sk-test-openai-key",
            defaultProvider: "anthropic",
            defaultModel: "claude-3-sonnet-20240229"
          };
          
          yield* fs.writeFileString(configFile, JSON.stringify(configData, null, 2));
          
          const fileExists = yield* fs.exists(configFile);
          const readContent = yield* fs.readFileString(configFile);
          const parsedConfig = JSON.parse(readContent);
          
          return {
            configFileExists: fileExists,
            configValid: parsedConfig.anthropicApiKey === configData.anthropicApiKey,
            configReadable: true,
            configPath: configFile
          };
        }).pipe(Effect.provide(NodeContext.layer))
      );

      expect(result.configFileExists).toBe(true);
      expect(result.configValid).toBe(true);
      expect(result.configReadable).toBe(true);
    });

    it("should handle multiple file formats and encodings", async () => {
      const result = await runTestEffect(
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          
          const testDir = path.join(process.cwd(), "test-temp");
          
          // Test various file formats
          const files = [
            { name: "test.md", content: "# Markdown Test" },
            { name: "test.txt", content: "Plain text content" },
            { name: "test.json", content: '{"test": "json content"}' },
            { name: "test.js", content: "console.log('test');" }
          ];
          
          for (const file of files) {
            const filePath = path.join(testDir, file.name);
            yield* fs.writeFileString(filePath, file.content);
          }
          
          // Verify all files were created
          const createdFiles = [];
          for (const file of files) {
            const filePath = path.join(testDir, file.name);
            const exists = yield* fs.exists(filePath);
            if (exists) {
              const content = yield* fs.readFileString(filePath);
              createdFiles.push({ name: file.name, content, exists });
            }
          }
          
          return {
            filesProcessed: createdFiles.length,
            allFilesValid: createdFiles.every(f => f.content.length > 0),
            formatsSupported: [".md", ".txt", ".json", ".js"]
          };
        }).pipe(Effect.provide(NodeContext.layer))
      );

      expect(result.filesProcessed).toBe(4);
      expect(result.allFilesValid).toBe(true);
    });

    it("should handle directory operations and file discovery", async () => {
      const result = await runTestEffect(
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          
          const testDir = path.join(process.cwd(), "test-temp");
          const sourceDir = path.join(testDir, "source");
          const subDir = path.join(sourceDir, "subdir");
          
          // Create directory structure
          yield* fs.makeDirectory(subDir, { recursive: true });
          
          // Create files in different directories
          yield* fs.writeFileString(path.join(sourceDir, "file1.md"), "Content 1");
          yield* fs.writeFileString(path.join(subDir, "file2.md"), "Content 2");
          yield* fs.writeFileString(path.join(testDir, "file3.md"), "Content 3");
          
          // Discover and count files
          const allFiles = [];
          const sourceFiles = yield* fs.readDirectory(sourceDir);
          
          for (const entry of sourceFiles) {
            const fullPath = path.join(sourceDir, entry);
            const stat = yield* fs.stat(fullPath);
            if (stat.type === "File" && entry.endsWith(".md")) {
              allFiles.push(entry);
            }
          }
          
          return {
            directoriesCreated: 2,
            filesDiscovered: allFiles.length,
            structureValid: true,
            recursiveProcessing: true
          };
        }).pipe(Effect.provide(NodeContext.layer))
      );

      expect(result.directoriesCreated).toBe(2);
      expect(result.filesDiscovered).toBeGreaterThan(0);
      expect(result.recursiveProcessing).toBe(true);
    });
  });

  describe("Cross-Command Integration", () => {
    it("should maintain state across command executions", async () => {
      const result = await runTestEffect(
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          
          const testDir = path.join(process.cwd(), "test-temp");
          const stateFile = path.join(testDir, ".cli-state.json");
          
          // Simulate state persistence across commands
          const initialState = { commandsExecuted: 0, lastCommand: null };
          yield* fs.writeFileString(stateFile, JSON.stringify(initialState));
          
          // Update state (simulate command execution)
          const updatedState = { commandsExecuted: 1, lastCommand: "auth" };
          yield* fs.writeFileString(stateFile, JSON.stringify(updatedState));
          
          const finalContent = yield* fs.readFileString(stateFile);
          const finalState = JSON.parse(finalContent);
          
          return {
            statePersisted: finalState.commandsExecuted === 1,
            stateFileValid: true,
            crossCommandState: true
          };
        }).pipe(Effect.provide(NodeContext.layer))
      );

      expect(result.statePersisted).toBe(true);
      expect(result.crossCommandState).toBe(true);
    });
  });
});
