/**
 * Production Runtime for ep-admin CLI
 * 
 * Runtime with essential dependencies:
 * - FetchHttpClient for HTTP requests
 * - FileSystem for file operations
 * - StateStore for pipeline state management
 * - Logger for structured logging
 * - Display for output formatting
 * - Execution for script execution
 */

import { StateStore } from "@effect-patterns/pipeline-state";
import { FetchHttpClient } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { layer as NodeFileSystemLayer } from "@effect/platform-node/NodeFileSystem";
import { Layer } from "effect";
import { envLayer } from "../config/env.js";
import { Auth } from "../services/auth/index.js";
import { AutofixService } from "../services/autofix/index.js";
import { Display } from "../services/display/index.js";
import { Execution } from "../services/execution/index.js";
import { EnhancedFileSystem } from "../services/filesystem/index.js";
import { Logger } from "../services/logger/index.js";
import { McpService } from "../services/mcp/service.js";
import { TUIService } from "../services/tui/service.js";
import { ValidationService } from "../services/validation/index.js";

/**
 * Production layer combining all required services
 */
const McpLayer = Layer.provide(
        McpService.Default,
        FetchHttpClient.layer
) as Layer.Layer<McpService, never, never>;

const AutofixLayer = Layer.provide(
        AutofixService.Default,
        Layer.mergeAll(
            NodeFileSystemLayer,
            Layer.provide(Display.Default, Logger.Default),
            FetchHttpClient.layer
        )
);

export const ProductionLayer = Layer.mergeAll(
        NodeContext.layer,
        envLayer,  // Environment configuration (must be early)
        NodeFileSystemLayer,
        Auth.Default,
        Logger.Default,
        Layer.provide(Display.Default, Logger.Default),
        TUIService.Default,
        Layer.provide(Execution.Default, Layer.mergeAll(Logger.Default, TUIService.Default)),
        Layer.provide(EnhancedFileSystem.Default, NodeFileSystemLayer),
        Layer.provide(ValidationService.Default, NodeFileSystemLayer),
        McpLayer,
        AutofixLayer,
        // Use Layer.provide to properly type the StateStore layer
        Layer.provide(StateStore.Default, Layer.mergeAll(Logger.Default))
);

