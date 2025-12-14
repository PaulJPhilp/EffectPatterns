import { Schema as S } from "@effect/schema";

/**
 * Workflow step definitions
 */
export type WorkflowStep =
  | "draft"
  | "ingested"
  | "tested"
  | "validated"
  | "published"
  | "finalized";

export const WorkflowStepSchema = S.Literal(
  "draft",
  "ingested",
  "tested",
  "validated",
  "published",
  "finalized"
);

export const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  "draft",
  "ingested",
  "tested",
  "validated",
  "published",
  "finalized",
];

/**
 * Pattern workflow status
 */
export type WorkflowStatus =
  | "draft"
  | "in-progress"
  | "ready"
  | "blocked"
  | "completed"
  | "failed";

export const WorkflowStatusSchema = S.Literal(
  "draft",
  "in-progress",
  "ready",
  "blocked",
  "completed",
  "failed"
);

/**
 * Individual step status
 */
export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export const StepStatusSchema = S.Literal(
  "pending",
  "running",
  "completed",
  "failed",
  "skipped"
);

/**
 * Step checkpoint record
 */
export interface StepCheckpoint {
  readonly operation: string;
  readonly timestamp: string;
  readonly data?: unknown;
  readonly error?: string;
}

export const StepCheckpointSchema = S.Struct({
  operation: S.String,
  timestamp: S.String,
  data: S.optional(S.Unknown),
  error: S.optional(S.String),
});

/**
 * Individual step state
 */
export interface StepState {
  readonly status: StepStatus;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly duration?: number;
  readonly attempts: number;
  readonly checkpoints: readonly StepCheckpoint[];
  readonly errors?: readonly string[];
}

export const StepStateSchema = S.Struct({
  status: StepStatusSchema,
  startedAt: S.optional(S.String),
  completedAt: S.optional(S.String),
  duration: S.optional(S.Number),
  attempts: S.Number,
  checkpoints: S.Array(StepCheckpointSchema),
  errors: S.optional(S.Array(S.String)),
});

/**
 * Pattern error record
 */
export interface PatternError {
  readonly step: WorkflowStep;
  readonly code: string;
  readonly message: string;
  readonly timestamp: string;
  readonly details?: unknown;
}

export const PatternErrorSchema = S.Struct({
  step: WorkflowStepSchema,
  code: S.String,
  message: S.String,
  timestamp: S.String,
  details: S.optional(S.Unknown),
});

/**
 * Pattern metadata
 */
export interface PatternMetadata {
  readonly title: string;
  readonly id: string;
  readonly rawPath: string;
  readonly srcPath: string;
  readonly summary?: string;
}

export const PatternMetadataSchema = S.Struct({
  title: S.String,
  id: S.String,
  rawPath: S.String,
  srcPath: S.String,
  summary: S.optional(S.String),
});

/**
 * Complete pattern state
 */
export interface PatternState {
  readonly id: string;
  readonly status: WorkflowStatus;
  readonly currentStep: WorkflowStep;
  readonly steps: Readonly<Record<WorkflowStep, StepState>>;
  readonly metadata: PatternMetadata;
  readonly errors: readonly PatternError[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const PatternStateSchema = S.Struct({
  id: S.String,
  status: WorkflowStatusSchema,
  currentStep: WorkflowStepSchema,
  steps: S.Unknown, // Simplified - steps is a record of WorkflowStep -> StepState
  metadata: PatternMetadataSchema,
  errors: S.Array(PatternErrorSchema),
  createdAt: S.String,
  updatedAt: S.String,
});

/**
 * Complete pipeline state file
 */
export interface PipelineStateFile {
  readonly version: string;
  readonly lastUpdated: string;
  readonly patterns: Readonly<Record<string, PatternState>>;
  readonly global: {
    readonly currentStep: WorkflowStep | null;
    readonly stepHistory: readonly string[];
  };
}

export const PipelineStateFileSchema = S.Struct({
  version: S.String,
  lastUpdated: S.String,
  patterns: S.Unknown, // Simplified - patterns is a record of string -> PatternState
  global: S.Struct({
    currentStep: S.Union(WorkflowStepSchema, S.Null),
    stepHistory: S.Array(S.String),
  }),
});

/**
 * Helper functions for creating initial states
 */
export const createInitialStepState = (): StepState => ({
  status: "pending",
  attempts: 0,
  checkpoints: [],
});

export const createInitialPatternState = (
  id: string,
  metadata: PatternMetadata
): PatternState => ({
  id,
  status: "draft",
  currentStep: "draft",
  steps: {
    draft: { ...createInitialStepState(), status: "completed" },
    ingested: createInitialStepState(),
    tested: createInitialStepState(),
    validated: createInitialStepState(),
    published: createInitialStepState(),
    finalized: createInitialStepState(),
  },
  metadata,
  errors: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const createInitialPipelineState = (): PipelineStateFile => ({
  version: "1.0.0",
  lastUpdated: new Date().toISOString(),
  patterns: {},
  global: {
    currentStep: null,
    stepHistory: [],
  },
});
