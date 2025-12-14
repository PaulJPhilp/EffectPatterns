import { Effect } from "effect";
import {
  WORKFLOW_STEPS,
  WorkflowStep,
  PatternState,
  StepState,
} from "./schemas.js";
import {
  InvalidTransitionError,
  StepAlreadyCompletedError,
  CannotRetryError,
} from "./errors.js";

/**
 * Validate that a transition is allowed
 */
export const validateTransition = (
  patternId: string,
  fromStep: WorkflowStep,
  toStep: WorkflowStep
): Effect.Effect<void, InvalidTransitionError> => {
  return Effect.sync(() => {
    const fromIndex = WORKFLOW_STEPS.indexOf(fromStep);
    const toIndex = WORKFLOW_STEPS.indexOf(toStep);

    // Can only transition forward or stay at same step
    if (toIndex < fromIndex) {
      return new InvalidTransitionError({
        patternId,
        fromStep,
        toStep,
        reason: `Cannot go backwards from ${fromStep} to ${toStep}. Only forward transitions allowed.`,
      });
    }

    // Can only skip at most one step (for recovery)
    if (toIndex - fromIndex > 1) {
      return new InvalidTransitionError({
        patternId,
        fromStep,
        toStep,
        reason: `Cannot skip steps from ${fromStep} to ${toStep}. Only adjacent transitions allowed.`,
      });
    }

    return null;
  }).pipe(
    Effect.filterOrFail(
      (error) => error === null,
      (error) => error as InvalidTransitionError
    )
  );
};

/**
 * Check if a step can be retried
 */
export const canRetryStep = (
  patternId: string,
  stepState: StepState
): Effect.Effect<void, CannotRetryError> => {
  return Effect.sync(() => {
    // Can only retry if failed
    if (stepState.status !== "failed") {
      return new CannotRetryError({
        patternId,
        step: "unknown",
        reason: `Cannot retry step with status "${stepState.status}". Only failed steps can be retried.`,
      });
    }

    // Can retry up to 3 times
    if (stepState.attempts >= 3) {
      return new CannotRetryError({
        patternId,
        step: "unknown",
        reason: `Cannot retry step. Maximum attempts (3) exceeded. Attempts: ${stepState.attempts}`,
      });
    }

    return null;
  }).pipe(
    Effect.filterOrFail(
      (error) => error === null,
      (error) => error as CannotRetryError
    )
  );
};

/**
 * Check if pattern is ready to advance to next step
 */
export const isReadyForNextStep = (
  state: PatternState
): Effect.Effect<boolean> => {
  return Effect.sync(() => {
    const currentIndex = WORKFLOW_STEPS.indexOf(state.currentStep);
    const currentStepState = state.steps[state.currentStep];

    // Step must exist
    if (!currentStepState) {
      return false;
    }

    // Must have completed current step
    if (currentStepState.status !== "completed") {
      return false;
    }

    // Cannot advance past finalized
    if (currentIndex >= WORKFLOW_STEPS.length - 1) {
      return false;
    }

    return true;
  });
};

/**
 * Validate pattern state consistency
 */
export const validatePatternState = (
  state: PatternState
): Effect.Effect<void, Error> => {
  return Effect.sync(() => {
    const errors: string[] = [];

    // Check that pattern ID matches metadata
    if (state.id !== state.metadata.id) {
      errors.push(
        `Pattern ID mismatch: ${state.id} !== ${state.metadata.id}`
      );
    }

    // Check that currentStep is valid
    if (!WORKFLOW_STEPS.includes(state.currentStep)) {
      errors.push(`Invalid currentStep: ${state.currentStep}`);
    }

    // Check that all required steps exist (draft is optional for migrated patterns)
    for (const step of WORKFLOW_STEPS) {
      if (step === "draft") {
        // Draft is optional for migrated patterns
        continue;
      }
      if (!(step in state.steps)) {
        errors.push(`Missing step state for: ${step}`);
      }
    }

    // Check that steps don't have impossible states
    const currentIndex = WORKFLOW_STEPS.indexOf(state.currentStep);
    for (let i = 0; i < currentIndex; i++) {
      const step = WORKFLOW_STEPS[i];
      if (step === "draft") {
        // Draft is optional for migrated patterns
        continue;
      }
      const stepState = state.steps[step];
      if (!stepState) {
        errors.push(`Missing step state for: ${step}`);
        continue;
      }
      if (stepState.status === "pending") {
        errors.push(`Step ${step} is pending but should be completed`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Pattern state validation failed: ${errors.join("; ")}`);
    }
  });
};

/**
 * Get next step after current
 */
export const getNextStep = (
  currentStep: WorkflowStep
): WorkflowStep | null => {
  const currentIndex = WORKFLOW_STEPS.indexOf(currentStep);
  if (currentIndex >= WORKFLOW_STEPS.length - 1) {
    return null;
  }
  return WORKFLOW_STEPS[currentIndex + 1];
};

/**
 * Check if step is final step
 */
export const isFinalStep = (step: WorkflowStep): boolean => {
  return step === "finalized";
};
