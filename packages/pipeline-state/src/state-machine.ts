import { Effect } from "effect";
import { PatternMetadata, PatternState, WorkflowStep } from "./schemas.js";
import { StateStore, StateStoreService } from "./state-store.js";
import {
  canRetryStep,
  getNextStep,
  isFinalStep,
  validatePatternState,
  validateTransition,
} from "./validators.js";

/**
 * PipelineStateMachine service interface
 */
export interface PipelineStateMachineService {
  readonly initializePattern: (
    patternId: string,
    metadata: PatternMetadata
  ) => Effect.Effect<PatternState, any>;
  readonly getPatternState: (
    patternId: string
  ) => Effect.Effect<PatternState, any>;
  readonly canTransition: (
    patternId: string,
    toStep: WorkflowStep
  ) => Effect.Effect<boolean, any>;
  readonly transitionToStep: (
    patternId: string,
    toStep: WorkflowStep
  ) => Effect.Effect<void, any>;
  readonly startStep: (
    patternId: string,
    step: WorkflowStep
  ) => Effect.Effect<void, any>;
  readonly completeStep: (
    patternId: string,
    step: WorkflowStep
  ) => Effect.Effect<void, any>;
  readonly failStep: (
    patternId: string,
    step: WorkflowStep,
    error: string
  ) => Effect.Effect<void, any>;
  readonly retryStep: (
    patternId: string,
    step: WorkflowStep
  ) => Effect.Effect<void, any>;
  readonly addCheckpoint: (
    patternId: string,
    step: WorkflowStep,
    operation: string,
    data?: unknown
  ) => Effect.Effect<void, any>;
  readonly getAllPatterns: () => Effect.Effect<
    Record<string, PatternState>,
    any
  >;
  readonly getPatternsByStatus: (
    status: PatternState["status"]
  ) => Effect.Effect<PatternState[], any>;
}

/**
 * Make PipelineStateMachine service
 */
const makePipelineStateMachine = (
  store: StateStoreService
): PipelineStateMachineService => {
  return {
    initializePattern: (patternId, metadata) =>
      store.initializePattern(patternId, metadata),

    getPatternState: (patternId) => store.getPatternState(patternId),

    canTransition: (patternId, toStep) =>
      Effect.gen(function* () {
        const state = yield* store.getPatternState(patternId);
        yield* validatePatternState(state);
        return yield* validateTransition(
          patternId,
          state.currentStep,
          toStep
        ).pipe(
          Effect.map(() => true),
          Effect.catchAll(() => Effect.succeed(false))
        );
      }),

    transitionToStep: (patternId, toStep) =>
      Effect.gen(function* () {
        const state = yield* store.getPatternState(patternId);
        yield* validatePatternState(state);
        yield* validateTransition(patternId, state.currentStep, toStep);

        if (state.steps[state.currentStep].status !== "completed") {
          yield* store.markStepCompleted(patternId, state.currentStep);
        }
        yield* store.updatePatternStatus(patternId, toStep, "in-progress");
      }),

    startStep: (patternId, step) =>
      Effect.gen(function* () {
        const state = yield* store.getPatternState(patternId);
        yield* validatePatternState(state);
        yield* store.markStepRunning(patternId, step);
      }),

    completeStep: (patternId, step) =>
      Effect.gen(function* () {
        const state = yield* store.getPatternState(patternId);
        yield* validatePatternState(state);
        yield* store.markStepCompleted(patternId, step);

        const nextStep = getNextStep(step);
        if (nextStep) {
          yield* store.updatePatternStatus(patternId, nextStep, "ready");
        } else if (isFinalStep(step)) {
          yield* store.updatePatternStatus(patternId, step, "completed");
        }
      }),

    failStep: (patternId, step, error) =>
      Effect.gen(function* () {
        const state = yield* store.getPatternState(patternId);
        yield* validatePatternState(state);
        yield* store.markStepFailed(patternId, step, error);
      }),

    retryStep: (patternId, step) =>
      Effect.gen(function* () {
        const state = yield* store.getPatternState(patternId);
        yield* validatePatternState(state);
        const stepState = state.steps[step];
        yield* canRetryStep(patternId, stepState);
        yield* store.markStepRunning(patternId, step);
      }),

    addCheckpoint: (patternId, step, operation, data) =>
      Effect.gen(function* () {
        const state = yield* store.getPatternState(patternId);
        yield* validatePatternState(state);
        yield* store.addCheckpoint(patternId, step, {
          operation,
          timestamp: new Date().toISOString(),
          data,
        });
      }),

    getAllPatterns: () => store.getAllPatterns(),

    getPatternsByStatus: (status) => store.getPatternsByStatus(status),
  };
};

/**
 * PipelineStateMachine service using Effect.Service pattern
 */
export class PipelineStateMachine extends Effect.Service<PipelineStateMachine>()(
  "PipelineStateMachine",
  {
    effect: Effect.gen(function* () {
      const store = yield* StateStore;
      return makePipelineStateMachine(store);
    }),
  }
) {}
