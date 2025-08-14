/**
 * @fileoverview Minimal runtime for CLI commands that don't require AI services
 *
 * This module provides a lightweight runtime for commands that only need
 * basic platform services and don't require AI client integrations.
 * This prevents startup failures when AI services have issues.
 *
 * Use this runtime for:
 * - Debug commands (echo, health, trace)
 * - Utility commands (list, config)
 * - Commands that don't interact with AI providers
 */

import {
  NodeContext,
  NodeFileSystem,
  NodeHttpClient,
  NodePath,
  NodeTerminal,
} from "@effect/platform-node";
import {
  ConfigProvider,
  Layer,
  ManagedRuntime,
  type Effect,
  type Exit,
} from "effect";
import { HttpClient } from "@effect/platform";
import { ConfigService } from "../services/config-service/service.js";
import { MdxService } from "../services/mdx-service/service.js";
import { TemplateService } from "../services/prompt-template/service.js";
import { MetricsService } from "../services/metrics-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
import { OutputHandlerService } from "../services/output-handler/service.js";
import { RunService } from "../services/run-service/service.js";

/**
 * Minimal configuration provider using environment variables.
 * Only includes basic configuration without AI-specific settings.
 */
const MinimalConfigProvider = ConfigProvider.fromEnv();

/**
 * Platform services layer providing essential Node.js capabilities.
 * Includes only the core services needed for basic CLI operations.
 */
const MinimalPlatformLayer = Layer.mergeAll(
  NodeContext.layer,
  NodeHttpClient.layer,
  NodeFileSystem.layer,
  NodePath.layer,
  NodeTerminal.layer
);

/**
 * Minimal application service layer containing only essential services.
 * Excludes AI-related services to prevent startup dependencies.
 */
const MinimalAppLayer = Layer.mergeAll(
  ConfigService.Default,
  MetricsService.Default,
  MdxService.Default,
  TemplateService.Default,
  OtelService.Default,
  OutputHandlerService.Default,
  RunService.Default
);

/**
 * Live environment layer with minimal configuration.
 */
const MinimalLiveEnv = Layer.setConfigProvider(MinimalConfigProvider).pipe(
  Layer.provide(MinimalPlatformLayer)
);

/**
 * Complete minimal layer providing essential services only.
 *
 * This layer combines:
 * - Core platform services (FileSystem, HttpClient, Terminal)
 * - Essential application services (Config, Metrics, Otel)
 * - Environment-based configuration
 *
 * Excludes AI client integrations to prevent startup failures.
 */
export const MinimalLayers = Layer.provide(
  MinimalAppLayer,
  MinimalLiveEnv
).pipe(Layer.merge(MinimalLiveEnv));

/**
 * Minimal runtime for commands that don't require AI services.
 *
 * This managed runtime provides a lightweight environment with:
 * - Core platform services (FileSystem, Path, HttpClient, Terminal)
 * - Essential application services (Config, Metrics, Otel)
 * - Environment-based configuration from process.env
 *
 * Usage:
 * ```typescript
 * import { MinimalRuntime } from './runtime/minimal-runtime';
 *
 * // Run an effect with minimal service provision
 * const result = yield* MinimalRuntime.runPromise(myEffect);
 * ```
 */
export const MinimalRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    Layer.provideMerge(MinimalAppLayer, MinimalPlatformLayer),
    Layer.setConfigProvider(MinimalConfigProvider)
  )
);

// Environment provided by MinimalRuntime
export type MinimalEnv =
  | NodeContext.NodeContext
  | HttpClient.HttpClient
  | ConfigService
  | MetricsService
  | MdxService
  | TemplateService
  | OtelService
  | OutputHandlerService
  | RunService;

/**
 * Helper function to run effects in the minimal runtime.
 */
export const runMinimalEffect = <A, E>(
  effect: Effect.Effect<A, E, MinimalEnv>
): Promise<A> => MinimalRuntime.runPromise(effect);

/**
 * Helper function to run effects and get the Exit result in minimal runtime.
 */
export const runMinimalExit = <A, E>(
  effect: Effect.Effect<A, E, MinimalEnv>
): Promise<Exit.Exit<A, E>> =>
  MinimalRuntime.runPromiseExit(effect) as Promise<Exit.Exit<A, E>>;
