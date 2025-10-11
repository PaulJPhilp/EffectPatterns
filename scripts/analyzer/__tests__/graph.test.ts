import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";
import { app, type GraphState } from "../graph.js";
import { withLiveRuntime } from "./runtime.js";

const describeLive = process.env.OPENAI_API_KEY ? describe : describe.skip;

describeLive("Analyzer graph (live)", () => {
  it("processes the mock export end to end", async () => {
    const { finalState, reportText } = await withLiveRuntime(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        const path = yield* Path;
        const fixturePath = path.resolve(
          process.cwd(),
          "scripts",
          "analyzer",
          "test-data",
          "mock-export.json",
        );
        const tempDir = yield* fs.makeTempDirectoryScoped();
        const outputPath = path.join(tempDir, "report.txt");
        const graphState = (yield* Effect.promise(() =>
          app.invoke({
            inputFile: fixturePath,
            outputFile: outputPath,
          }),
        )) as GraphState;
        const reportText = yield* fs.readFileString(outputPath);
        return {
          finalState: graphState,
          reportText,
        };
      }),
    );

    expect(finalState.chunks?.length ?? 0).toBeGreaterThan(0);
    expect(finalState.partialAnalyses?.length ?? 0).toBeGreaterThan(0);
    expect(finalState.finalReport?.trim().length ?? 0).toBeGreaterThan(0);
    expect(reportText.trim().length).toBeGreaterThan(0);
  });
});
