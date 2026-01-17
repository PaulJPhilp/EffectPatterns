import { Layer } from "effect";
import { BlockService } from "./BlockService";
import { CommandExecutor } from "./CommandExecutor";
import { ErrorRecoveryService } from "./ErrorRecoveryService";
import { LoggerService } from "./LoggerService";
import { PersistenceService } from "./PersistenceService";
import { ProcessService } from "./ProcessService";
import { ResourceManagement } from "./ResourceManagement";
import { StructuredLoggingService } from "./StructuredLoggingService";
import { ConfigService, SessionStore } from "./SessionStore";

export { BlockService } from "./BlockService";
export { CommandExecutor } from "./CommandExecutor";
export { ErrorRecoveryService } from "./ErrorRecoveryService";
export { LoggerService } from "./LoggerService";
export { PersistenceService } from "./PersistenceService";
export { ProcessService, type ProcessHandle } from "./ProcessService";
export { ResourceManagement } from "./ResourceManagement";
export { StructuredLoggingService } from "./StructuredLoggingService";
export { createEffectRunner } from "./ReactIntegrationService";
export { ConfigService, SessionStore } from "./SessionStore";

/**
 * Main EffectTalkLayer composed from all service dependencies
 */
export const EffectTalkLayer = Layer.mergeAll(
    BlockService.Default,
    CommandExecutor.Default,
    ErrorRecoveryService,
    PersistenceService.Default,
    ProcessService.Default,
    SessionStore.Default,
    ConfigService.Default,
    LoggerService.Default,
);
