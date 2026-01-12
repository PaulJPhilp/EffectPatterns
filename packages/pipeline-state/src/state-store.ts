import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import { PatternNotFoundError, StateFilePersistenceError } from "./errors.js";
import {
  PatternMetadata,
  PatternState,
  PipelineStateFile,
  StepCheckpoint,
  WorkflowStep,
  createInitialPatternState,
  createInitialPipelineState,
} from "./schemas.js";

const STATE_FILE_NAME = ".pipeline-state.json";

/**
 * StateStore service implementation using @effect/platform FileSystem
 */
const makeStateStore = () => {
  const getStateFilePath = () =>
    Effect.gen(function* () {
      return `${process.cwd()}/${STATE_FILE_NAME}`;
    });

  const loadState = () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const filePath = yield* getStateFilePath();

      const exists = yield* fs.exists(filePath);
      if (!exists) {
        return createInitialPipelineState();
      }

      const content = yield* fs.readFileString(filePath).pipe(
        Effect.catchAll((error) => {
          const message = error instanceof Error ? error.message : String(error);
          return Effect.fail(
            new StateFilePersistenceError({
              filePath,
              operation: "read",
              reason: `Failed to read state file: ${message}`,
            })
          );
        })
      );

      const parsed = JSON.parse(content) as PipelineStateFile;
      return parsed;
    });

  const saveState = (state: PipelineStateFile) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const filePath = yield* getStateFilePath();

      const updated = {
        ...state,
        lastUpdated: new Date().toISOString(),
      };
      const content = JSON.stringify(updated, null, 2);

      yield* fs.writeFileString(filePath, content).pipe(
        Effect.catchAll((error) => {
          const message = error instanceof Error ? error.message : String(error);
          return Effect.fail(
            new StateFilePersistenceError({
              filePath,
              operation: "write",
              reason: `Failed to write state file: ${message}`,
            })
          );
        })
      );
    });

  const getPatternState = (patternId: string) =>
    Effect.gen(function* () {
      const state = yield* loadState();
      const pattern = state.patterns[patternId];
      if (!pattern) {
        return yield* Effect.fail(
          new PatternNotFoundError({
            patternId,
            reason: `Pattern "${patternId}" not found in state`,
          })
        );
      }
      return pattern;
    });

  const initializePattern = (patternId: string, metadata: PatternMetadata) =>
    Effect.gen(function* () {
      const state = yield* loadState();
      const patternState = createInitialPatternState(patternId, metadata);
      const updated = {
        ...state,
        patterns: {
          ...state.patterns,
          [patternId]: patternState,
        },
      };
      yield* saveState(updated);
      return patternState;
    });

  const updatePatternStatus = (
    patternId: string,
    currentStep: WorkflowStep,
    status: PatternState["status"]
  ) =>
    Effect.gen(function* () {
      const state = yield* loadState();
      const pattern = state.patterns[patternId];
      if (!pattern) {
        return yield* Effect.fail(
          new PatternNotFoundError({
            patternId,
            reason: `Pattern "${patternId}" not found`,
          })
        );
      }

      const updated = {
        ...state,
        patterns: {
          ...state.patterns,
          [patternId]: {
            ...pattern,
            currentStep,
            status,
            updatedAt: new Date().toISOString(),
          },
        },
      };
      yield* saveState(updated);
    });

  const markStepRunning = (patternId: string, step: WorkflowStep) =>
    Effect.gen(function* () {
      const state = yield* loadState();
      const pattern = state.patterns[patternId];
      if (!pattern) {
        return yield* Effect.fail(
          new PatternNotFoundError({
            patternId,
            reason: `Pattern "${patternId}" not found`,
          })
        );
      }

      const stepState = pattern.steps[step];
      const updated = {
        ...state,
        patterns: {
          ...state.patterns,
          [patternId]: {
            ...pattern,
            currentStep: step,
            status: "in-progress" as const,
            steps: {
              ...pattern.steps,
              [step]: {
                ...stepState,
                status: "running" as const,
                startedAt: new Date().toISOString(),
                attempts: stepState.attempts + 1,
              },
            },
            updatedAt: new Date().toISOString(),
          },
        },
      };
      yield* saveState(updated);
    });

  const markStepCompleted = (patternId: string, step: WorkflowStep) =>
    Effect.gen(function* () {
      const state = yield* loadState();
      const pattern = state.patterns[patternId];
      if (!pattern) {
        return yield* Effect.fail(
          new PatternNotFoundError({
            patternId,
            reason: `Pattern "${patternId}" not found`,
          })
        );
      }

      const stepState = pattern.steps[step];
      const startedAt = stepState.startedAt
        ? new Date(stepState.startedAt)
        : new Date();
      const completedAt = new Date();
      const duration = (completedAt.getTime() - startedAt.getTime()) / 1000;

      const updated = {
        ...state,
        patterns: {
          ...state.patterns,
          [patternId]: {
            ...pattern,
            steps: {
              ...pattern.steps,
              [step]: {
                ...stepState,
                status: "completed" as const,
                completedAt: completedAt.toISOString(),
                duration,
              },
            },
            updatedAt: new Date().toISOString(),
          },
        },
      };
      yield* saveState(updated);
    });

  const markStepFailed = (
    patternId: string,
    step: WorkflowStep,
    error: string
  ) =>
    Effect.gen(function* () {
      const state = yield* loadState();
      const pattern = state.patterns[patternId];
      if (!pattern) {
        return yield* Effect.fail(
          new PatternNotFoundError({
            patternId,
            reason: `Pattern "${patternId}" not found`,
          })
        );
      }

      const stepState = pattern.steps[step];
      const updated = {
        ...state,
        patterns: {
          ...state.patterns,
          [patternId]: {
            ...pattern,
            currentStep: step,
            status: "failed" as const,
            steps: {
              ...pattern.steps,
              [step]: {
                ...stepState,
                status: "failed" as const,
                completedAt: new Date().toISOString(),
                errors: [...(stepState.errors ?? []), error],
              },
            },
            updatedAt: new Date().toISOString(),
          },
        },
      };
      yield* saveState(updated);
    });

  const addCheckpoint = (
    patternId: string,
    step: WorkflowStep,
    checkpoint: StepCheckpoint
  ) =>
    Effect.gen(function* () {
      const state = yield* loadState();
      const pattern = state.patterns[patternId];
      if (!pattern) {
        return yield* Effect.fail(
          new PatternNotFoundError({
            patternId,
            reason: `Pattern "${patternId}" not found`,
          })
        );
      }

      const stepState = pattern.steps[step];
      const updated = {
        ...state,
        patterns: {
          ...state.patterns,
          [patternId]: {
            ...pattern,
            steps: {
              ...pattern.steps,
              [step]: {
                ...stepState,
                checkpoints: [...stepState.checkpoints, checkpoint],
              },
            },
            updatedAt: new Date().toISOString(),
          },
        },
      };
      yield* saveState(updated);
    });

  const getAllPatterns = () =>
    Effect.gen(function* () {
      const state = yield* loadState();
      return state.patterns;
    });

  const getPatternsByStatus = (status: PatternState["status"]) =>
    Effect.gen(function* () {
      const patterns = yield* getAllPatterns();
      return Object.values(patterns).filter((p) => p.status === status);
    });

  return {
    loadState,
    saveState,
    getPatternState,
    initializePattern,
    updatePatternStatus,
    markStepRunning,
    markStepCompleted,
    markStepFailed,
    addCheckpoint,
    getAllPatterns,
    getPatternsByStatus,
  };
};

/**
 * StateStore service using Effect.Service pattern
 */
export class StateStore extends Effect.Service<StateStore>()("StateStore", {
  sync: () => makeStateStore(),
}) { }
