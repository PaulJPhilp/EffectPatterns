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
import { NodeContext } from "@effect/platform-node";
import { Layer, ManagedRuntime, type Effect, type Exit } from "effect";
import { HttpClient } from "@effect/platform";
import { ConfigService } from "../services/config-service/service.js";
import { MdxService } from "../services/mdx-service/service.js";
import { TemplateService } from "../services/prompt-template/service.js";
import { MetricsService } from "../services/metrics-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
import { OutputHandlerService } from "../services/output-handler/service.js";
import { RunService } from "../services/run-service/service.js";
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
export declare const MinimalLayers: Layer.Layer<ConfigService | MetricsService | MdxService | TemplateService | OutputHandlerService | OtelService | RunService, import("../services/config-service/errors.js").ConfigError, import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path>;
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
export declare const MinimalRuntime: ManagedRuntime.ManagedRuntime<ConfigService | NodeContext.NodeContext | MetricsService | MdxService | TemplateService | HttpClient.HttpClient | OutputHandlerService | OtelService | RunService, import("../services/config-service/errors.js").ConfigError>;
export type MinimalEnv = NodeContext.NodeContext | HttpClient.HttpClient | ConfigService | MetricsService | MdxService | TemplateService | OtelService | OutputHandlerService | RunService;
/**
 * Helper function to run effects in the minimal runtime.
 */
export declare const runMinimalEffect: <A, E>(effect: Effect.Effect<A, E, MinimalEnv>) => Promise<A>;
/**
 * Helper function to run effects and get the Exit result in minimal runtime.
 */
export declare const runMinimalExit: <A, E>(effect: Effect.Effect<A, E, MinimalEnv>) => Promise<Exit.Exit<A, E>>;
//# sourceMappingURL=minimal-runtime.d.ts.map