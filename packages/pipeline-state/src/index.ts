/**
 * @effect-patterns/pipeline-state
 *
 * State machine implementation for managing the Effect Patterns publishing pipeline
 */

// Re-export main service
export { PipelineStateMachine } from "./state-machine.js";

// Re-export state store
export { StateStore } from "./state-store.js";

// Re-export types and schemas
export {
  PatternErrorSchema,
  PatternMetadataSchema,
  PatternStateSchema,
  PipelineStateFileSchema,
  StepCheckpointSchema,
  StepStateSchema,
  StepStatusSchema,
  WORKFLOW_STEPS,
  WorkflowStatusSchema,
  WorkflowStepSchema,
  createInitialPatternState,
  createInitialPipelineState,
  createInitialStepState,
  type PatternError,
  type PatternMetadata,
  type PatternState,
  type PipelineStateFile,
  type StepCheckpoint,
  type StepState,
  type StepStatus,
  type WorkflowStatus,
  type WorkflowStep,
} from "./schemas.js";

// Re-export validators
export {
  canRetryStep,
  getNextStep,
  isFinalStep,
  isReadyForNextStep,
  validatePatternState,
  validateTransition,
} from "./validators.js";

// Re-export errors
export {
  CannotRetryError,
  InvalidStateError,
  InvalidTransitionError,
  PatternNotFoundError,
  StateFileNotFoundError,
  StateFilePersistenceError,
  StepAlreadyCompletedError,
  type StateError,
} from "./errors.js";
