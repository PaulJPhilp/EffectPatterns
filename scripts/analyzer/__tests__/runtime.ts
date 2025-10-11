import { Effect, Layer } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";
import {
  NodeContext,
  NodeFileSystem,
  NodePath,
} from "@effect/platform-node";
import { LLMServiceLive } from "../services.js";

export const LiveLayer = Layer.mergeAll(
  NodeContext.layer,
  NodeFileSystem.layer,
  NodePath.layer,
  LLMServiceLive,
);

export const withLiveRuntime = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.runPromise(
    Effect.scoped(
      Effect.provide(effect, LiveLayer) as Effect.Effect<A, E, never>,
    ),
  );
