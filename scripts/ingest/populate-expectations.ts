import { Effect, Layer, Config, Console, Data, Context } from "effect";
import { FileSystem, Path, Command } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import * as ReadonlyArray from "effect/Array"; // Explicit import for array operations
import { parse as parseYaml, stringify as stringifyYaml } from "yaml"; // 'yaml' library is required

// --- Configuration Service (Idiomatic Effect.Service pattern) ---
// Define the AppConfig interface
interface AppConfigService {
  readonly srcDir: string;
  readonly processedDir: string;
}

// Create the AppConfig service using Effect.Service pattern
class AppConfig extends Effect.Service<AppConfig>()(
  "AppConfig",
  {
    // Provide a sync implementation that loads config values
    sync: () => ({
      srcDir: process.env.SRC_DIR || process.cwd() + "/content/new/src",
      processedDir: process.env.PROCESSED_DIR || process.cwd() + "/content/new/processed"
    })
  }
) {}

// The AppConfigLive layer is now available as AppConfig.Default

// --- LLM Service (Idiomatic Effect Service Definition) ---

// Structured input for the LLM prompt using Data.TaggedClass
class ExpectationPrompt extends Data.TaggedClass("ExpectationPrompt")<{
  readonly patternMdxContent: string;
  readonly tsCodeContent: string;
  readonly actualStdout: string;
  readonly actualStderr: string;
  readonly actualErrorDetail: string; // Error message from execAsync if it threw
  readonly executionStatus: "success" | "failure";
}> {}

// Structured output expected from the LLM using Data.TaggedClass
class GeneratedExpectations extends Data.TaggedClass("GeneratedExpectations")<{
  readonly expectedOutput?: string;
  readonly expectedError?: string;
  readonly reasoning: string; // LLM's explanation for its decision
  readonly discrepancyFlag: boolean; // True if actuals didn't align with pattern intent
  readonly discrepancyReason?: string; // Why it didn't align
}> {}

// LLMService Tag (represents the dependency context for accessing the service)
class LLMService extends Context.Tag("LLMService")<
  LLMService,
  {
    generateExpectations: (
      prompt: ExpectationPrompt
    ) => Effect.Effect<GeneratedExpectations, Error, never>; // LLM-related errors
  }
>() {}

// Live implementation for LLMService (SIMULATED for demonstration)
// This adheres to the service interface and returns an Effect.
const LLMLive = Layer.succeed(
  LLMService,
  LLMService.of({
    generateExpectations: (prompt): Effect.Effect<GeneratedExpectations, Error, never> => {
      // Log the processing
      return Effect.succeed(Console.info(
        `[LLM Sim] Processing prompt for status: ${
          prompt.executionStatus
        } for pattern ${prompt.patternMdxContent
          .split("\n")[0]
          .substring(0, 50)}...`
      )).pipe(
        // Simulate network latency
        Effect.flatMap(() => Effect.sleep(100)), // 100ms as numeric value
        // Generate the expectations
        Effect.map(() => {
          let generatedOutput: string | undefined = undefined;
          let generatedError: string | undefined = undefined;
          let discrepancy = false;
          let discrepancyReason = "";
          let reasoning =
            "Simulated LLM response based on observed execution and pattern intent.";

          // Simplified simulation: LLM assumes actuals are the expected unless a semantic mismatch is hardcoded.
          // A real LLM implementation would involve complex prompting and parsing for actual semantic validation.
          if (prompt.executionStatus === "success") {
            generatedOutput = prompt.actualStdout.trim() || undefined; // Ensure empty string becomes undefined
            reasoning += " Output matches expected successful demonstration.";
          } else {
            // executionStatus === "failure"
            generatedError = prompt.actualStderr.trim() || undefined; // Ensure empty string becomes undefined
            reasoning += " Error matches expected failure demonstration.";
          }

          // Hardcoded semantic mismatch detection (simulated LLM reasoning)
          if (
            prompt.patternMdxContent.includes("should fail") &&
            prompt.executionStatus === "success"
          ) {
            discrepancy = true;
            discrepancyReason =
              "Pattern description indicates code should fail, but execution succeeded.";
          } else if (
            prompt.patternMdxContent.includes("should succeed") &&
            prompt.executionStatus === "failure"
          ) {
            discrepancy = true;
            discrepancyReason =
              "Pattern description indicates code should succeed, but execution failed.";
          }

          return new GeneratedExpectations({
            expectedOutput: generatedOutput,
            expectedError: generatedError,
            reasoning,
            discrepancyFlag: discrepancy,
            discrepancyReason,
          });
        })
      );
    },
  })
);

// --- Utility Types & Functions ---

// Frontmatter interface with readonly properties and index signature
interface Frontmatter {
  readonly expectedOutput?: string;
  readonly expectedError?: string;
  needsReview?: boolean; // Can be updated, so not readonly if it is to be written to.
  readonly [key: string]: unknown; // Allows for any other properties in frontmatter
}

// Function to read MDX content and parse its YAML frontmatter (Idiomatic Effect)
const readMdxAndFrontmatter = (filePath: string) =>
  FileSystem.FileSystem.pipe(
    Effect.flatMap((fs) => fs.readFileString(filePath)),
    Effect.flatMap((content) =>
      // Use Effect.sync to wrap the synchronous YAML parsing, mapping any sync error
      Effect.sync(() => {
        const parts = content.split("---", 3); // Frontmatter is between first two '---'
        if (parts.length < 3) {
          throw new Error(
            "Missing or malformed frontmatter block (expected '---' delimiters)."
          );
        }
        const frontmatterStr = parts[1];
        const mdxBody = parts[2]; // Keep original leading newlines/spaces for now, trim later during update

        const frontmatter = parseYaml(frontmatterStr) as Frontmatter;
        return Data.struct({ content, frontmatter, mdxBody });
      }).pipe(
        // Map any synchronous parsing errors into Effect's error channel
        Effect.mapError(
          (e) =>
            new Error(
              `Failed to parse frontmatter in ${filePath.toString()}: ${String(e)}`
            )
        )
      )
    )
  );

// Function to reconstruct MDX content with updated frontmatter (Pure function)
function updateMdxContent(
  originalFullMdxContent: string,
  updatedFrontmatter: Frontmatter
): string {
  const parts = originalFullMdxContent.split("---", 3);
  const newFrontmatterStr = stringifyYaml(updatedFrontmatter).trim(); // trimEnd() is also good

  // Determine the original MDX body content, including any newlines between '---' and content
  let originalBodyContent = originalFullMdxContent;
  if (parts.length >= 3) {
    // Find the end of the second '---' and take everything after it
    const secondDelimiterEndIndex =
      originalFullMdxContent.indexOf(
        "---",
        originalFullMdxContent.indexOf("---") + 3
      ) + 3;
    originalBodyContent = originalFullMdxContent.substring(
      secondDelimiterEndIndex
    );
  } else {
    // No frontmatter found, so the whole content is the body
    originalBodyContent = originalFullMdxContent;
  }

  // Ensure there's at least two newlines between frontmatter and body for consistency
  return `---\n${newFrontmatterStr}\n---\n\n${originalBodyContent.trimStart()}`;
}

// --- Core Logic for Processing a Single Pattern File (Idiomatic Effect.gen) ---
const processPatternFile = (mdxFilePath: string) =>
  Effect.gen(function* () {
    const config = yield* AppConfig; // Access AppConfig service
    const fs = yield* FileSystem.FileSystem;
    const path_ = yield* Path.Path; // Renamed to path_ to avoid conflict with 'path' variable
    const llm = yield* LLMService;
    // Access the Path service from Effect context
    const path = yield* Path.Path;

    const baseName = path.basename(mdxFilePath.toString(), ".mdx");
    const tsFilePath = path.join(config.srcDir, `${baseName}.ts`);

    yield* Console.log(`Processing pattern: ${baseName}`);

    // 1. Read MDX content and frontmatter
    const { content: mdxContent, frontmatter } = yield* readMdxAndFrontmatter(
      mdxFilePath
    );

    // 2. Read TS code content (handle missing file gracefully)
    const tsCodeContent = yield* fs.readFileString(tsFilePath).pipe(
      Effect.catchAll((error) =>
        Console.warn(
          `TypeScript file ${tsFilePath} not found for pattern ${baseName}: ${error.message}. Proceeding without TS content.`
        ).pipe(
          Effect.as("") // Provide an empty string to allow flow to continue
        )
      )
    );

    let actualStdout = "";
    let actualStderr = "";
    let actualErrorDetail = "";
    let executionStatus: "success" | "failure" = "success";

    // 3. Execute the TypeScript file (if TS content was found)
    if (tsCodeContent.trim().length > 0) {
      // Check if tsCodeContent is not just empty/whitespace
      const command = Command.make("bun", "run", tsFilePath.toString());
      const executionResult = yield* Command.string(command).pipe(
        // Map successful execution to a tagged success type
        Effect.map((stdout) =>
          Data.struct({
            type: "success" as const,
            stdout,
            stderr: "", // Command.string only captures stdout
          })
        ),
        // Catch command execution errors and map to a tagged failure type
        Effect.catchAll((e) =>
          Effect.succeed(
            Data.struct({
              type: "failure" as const,
              error: e.message || String(e), // Ensure error.message is used
              stdout: "", // Command.string doesn't provide stdout on error
              stderr: "", // Command.string doesn't provide stderr
            })
          )
        )
      );

      if (executionResult.type === "success") {
        actualStdout = executionResult.stdout.trim();
        actualStderr = executionResult.stderr.trim();
        executionStatus = "success";
        yield* Console.log(`  Execution of ${baseName}.ts successful.`);
      } else {
        executionStatus = "failure";
        actualErrorDetail = executionResult.error.trim();
        actualStdout = executionResult.stdout.trim(); // Still capture stdout/stderr from child process if available on failure
        actualStderr = executionResult.stderr.trim();
        yield* Console.error(
          `  Execution of ${baseName}.ts failed: ${
            actualErrorDetail.split("\n")[0]
          }`
        );
      }
    } else {
      yield* Console.log(
        `  No executable TypeScript code for ${baseName}.ts to run.`
      );
      // If no code, we can't get actual output/error from execution.
      // Treat as a conceptual "success" for the LLM to process the MDX, but warn.
      executionStatus = "success";
    }

    // 4. Construct LLM prompt input (Idiomatic Data.TaggedClass)
    const llmPrompt: ExpectationPrompt = new ExpectationPrompt({
      // Instantiate with 'new'
      patternMdxContent: mdxContent,
      tsCodeContent: tsCodeContent,
      actualStdout: actualStdout,
      actualStderr: actualStderr,
      actualErrorDetail: actualErrorDetail,
      executionStatus: executionStatus,
    });

    // 5. Call LLM service to generate expectations
    const generatedExpectations = yield* llm.generateExpectations(llmPrompt as ExpectationPrompt);

    // 6. Update frontmatter with generated expectations and potential discrepancy flag
    // Create a new object with updated properties to respect readonly constraints
    let updatedFrontmatter: Frontmatter = { 
      ...frontmatter,
      expectedOutput: generatedExpectations.expectedOutput,
      expectedError: generatedExpectations.expectedError
    };

    if (generatedExpectations.discrepancyFlag) {
      updatedFrontmatter.needsReview = true; // Set flag if LLM detected discrepancy
      yield* Console.warn(
        `Discrepancy flagged by LLM for ${baseName}: ${generatedExpectations.discrepancyReason}`
      );
    } else {
      // Safely remove 'needsReview' if it exists and no discrepancy is flagged
      if (Object.prototype.hasOwnProperty.call(updatedFrontmatter, "needsReview")) {
        // Create a new object without the needsReview property
        const { needsReview, ...restProps } = updatedFrontmatter;
        // Reassign updatedFrontmatter to the new object without needsReview
        const newFrontmatter = restProps as Frontmatter;
        updatedFrontmatter = newFrontmatter;
      }
    }

    // 7. Write updated MDX content back to file
    const updatedContent = updateMdxContent(mdxContent, updatedFrontmatter);
    yield* fs.writeFileString(mdxFilePath.toString(), updatedContent);

    yield* Console.log(`Finished processing ${baseName}.mdx`);
  }).pipe(
    // Catch errors for this specific file processing and log them, allowing main program to continue
    Effect.catchAll((err) =>
      Console.error(`🔴 Error processing file ${mdxFilePath}: ${String(err)}`)
    )
  );

// --- Main Program (Idiomatic Effect.gen) ---
const mainProgram = Effect.gen(function* () {
  const config = yield* AppConfig; // Access AppConfig service
  const fs = yield* FileSystem.FileSystem;
  const path_ = yield* Path.Path;

  yield* Console.log(`Starting expectation population for pattern examples...`);

  // Read all MDX files from the processed directory
  const processedDirPath = path_.join(config.processedDir); // Convert string to Path
  const files = yield* fs.readDirectory(processedDirPath);
  const mdxFiles = files.filter((file) => file.endsWith(".mdx"));

  yield* Console.log(
    `Found ${mdxFiles.length} MDX pattern files in ${config.processedDir}`
  );

  // Process each MDX file in parallel using Effect.forEach
  yield* Effect.forEach(
    mdxFiles,
    (file) => Effect.gen(function* () {
      // In Effect-TS 3.16.16, we need to access the Path service from the Effect context
      const path = yield* Path.Path;
      // Then use the service's methods to create paths
      const filePath = path.join(config.processedDir, file);
      // Pass the Path object to processPatternFile
      return yield* processPatternFile(filePath);
    }),
    {
      concurrency: "unbounded", // Adjust concurrency as needed for LLM API limits/performance
      discard: true, // Discard results as we're doing side effects (file writes)
    }
  );

  yield* Console.log(`Expectation population complete.`);
});

// --- Run the Program (Idiomatic Effect.runPromise) ---
// Merge all layers into a single layer
const allLayers = Layer.mergeAll(
  AppConfig.Default, // AppConfig default implementation
  LLMLive, // The simulated LLM service
  NodeContext.layer // Provides all Node.js platform implementations
  // Console is automatically provided as a default service in Effect 3.16.16
);

// In Effect 3.16.16, we don't need a custom console implementation
// We can use the default console and just override specific behaviors if needed
// Let's simplify and use the default console implementation

// Provide layers to the main program
const runnable = mainProgram.pipe(
  // Use the default console implementation provided by Effect
  Effect.provide(allLayers)
);

// Execute the Effect program at the "end of the world"
// Explicitly type the Effect to handle the unknown context
Effect.runPromise(runnable as Effect.Effect<void, unknown>).catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Fatal error during script execution:", error);
  process.exit(1);
});
