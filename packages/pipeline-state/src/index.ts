/**
 * @effect-patterns/pipeline-state
 *
 * State machine implementation for managing the Effect Patterns publishing pipeline
 */

// Re-export main service
export { PipelineStateMachine, PipelineStateMachineLive } from "./state-machine.js";

// Re-export state store
export { StateStore, StateStoreLive } from "./state-store.js";

// Re-export types and schemas
export {
  type WorkflowStep,
  type WorkflowStatus,
  type StepStatus,
  type StepCheckpoint,
  type StepState,
  type PatternError,
  type PatternMetadata,
  type PatternState,
  type PipelineStateFile,
  WorkflowStepSchema,
  WorkflowStatusSchema,
  StepStatusSchema,
  StepCheckpointSchema,
  StepStateSchema,
  PatternErrorSchema,
  PatternMetadataSchema,
  PatternStateSchema,
  PipelineStateFileSchema,
  WORKFLOW_STEPS,
  createInitialStepState,
  createInitialPatternState,
  createInitialPipelineState,
} from "./schemas.js";

// Re-export validators
export {
  validateTransition,
  canRetryStep,
  isReadyForNextStep,
  validatePatternState,
  getNextStep,
  isFinalStep,
} from "./validators.js";

// Re-export errors
export {
  InvalidTransitionError,
  StateFileNotFoundError,
  PatternNotFoundError,
  StateFilePersistenceError,
  InvalidStateError,
  StepAlreadyCompletedError,
  CannotRetryError,
  type StateError,
} from "./errors.js";
