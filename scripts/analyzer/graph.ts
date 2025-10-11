import { Effect, Layer, Runtime } from "effect";
import { END, START, StateGraph } from "langgraph";
import { z } from "zod";
import { FileSystem } from "@effect/platform/FileSystem";
import { NodeContext } from "@effect/platform-node";
import { LLMService, LLMServiceLive } from "./services.js";

const GraphStateSchema = z.object({
  inputFile: z.string(),
  outputFile: z.string(),
  chunks: z.array(z.array(z.any())).optional(),
  partialAnalyses: z.array(z.string()).optional(),
  finalReport: z.string().optional(),
});
export type GraphState = z.infer<typeof GraphStateSchema>;

const AnalysisLayer = LLMServiceLive.pipe(Layer.provide(NodeContext.layer));
const runEffect = Runtime.runPromise(Layer.toRuntime(AnalysisLayer));

const nodes = {
  loadAndChunkData: async (state: GraphState) => {
    const program = Effect.gen(function* () {
      const fs = yield* FileSystem;
      const content = yield* fs.readFileString(state.inputFile);
      const messages = JSON.parse(content).messages;
      const chunkSize = 200;
      const chunks = [] as unknown[][];
      for (let i = 0; i < messages.length; i += chunkSize) {
        chunks.push(messages.slice(i, i + chunkSize));
      }
      yield* Effect.log(`Split data into ${chunks.length} chunks.`);
      return { chunks } satisfies Partial<GraphState>;
    });
    return await runEffect(program);
  },

  analyzeSingleChunk: async (
    _state: GraphState,
    _config: { recursionLimit?: number },
    chunk: unknown[],
  ) => {
    const program = Effect.flatMap(LLMService, (llm) => llm.analyzeChunk(chunk));
    const partialAnalysis = await runEffect(program);
    return { partialAnalyses: [partialAnalysis] } satisfies Partial<GraphState>;
  },

  aggregateResults: async (state: GraphState) => {
    const program = Effect.gen(function* () {
      const llm = yield* LLMService;
      yield* Effect.log("Aggregating partial analyses...");
      const finalReport = yield* llm.aggregateAnalyses(
        state.partialAnalyses ?? [],
      );
      const fs = yield* FileSystem;
      yield* fs.writeFileString(state.outputFile, finalReport);
      yield* Effect.log(`Final report saved to ${state.outputFile}`);
      return { finalReport } satisfies Partial<GraphState>;
    });
    return await runEffect(program);
  },
};

const workflow = new StateGraph({
  channels: GraphStateSchema,
});

workflow.addNode("loadAndChunkData", nodes.loadAndChunkData);
workflow.addNode("analyzeSingleChunk", nodes.analyzeSingleChunk);
workflow.addNode("aggregateResults", nodes.aggregateResults);

workflow.addEdge(START, "loadAndChunkData");
workflow.addEdge("loadAndChunkData", "analyzeSingleChunk", {
  mapper: (state) => state.chunks ?? [],
});
workflow.addEdge("analyzeSingleChunk", "aggregateResults");
workflow.addEdge("aggregateResults", END);

export const app = workflow.compile();
