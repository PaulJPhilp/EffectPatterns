/**
 * Pipeline state-aware commands for managing pattern publishing workflow
 *
 * These commands integrate with the PipelineStateMachine to provide:
 * - Status visibility: Show which patterns are in which workflow state
 * - Retry support: Re-run failed steps
 * - Resume capability: Continue from interruptions
 */

import {
  PipelineStateMachine,
  StateStore,
  WORKFLOW_STEPS,
} from "@effect-patterns/pipeline-state";
import { Args, Command, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import { showInfo, showPanel, showTable } from "./services/display.js";

/**
 * Status command: Show pipeline state for all patterns or a specific pattern
 */
export const statusCommand: any = Command.make("status", {
  options: {
    pattern: Options.optional(
      Options.text("pattern").pipe(
        Options.withAlias("p"),
        Options.withDescription("Show status for specific pattern")
      )
    ),
    verbose: Options.boolean("verbose").pipe(
      Options.withAlias("v"),
      Options.withDescription("Show detailed step information"),
      Options.withDefault(false)
    ),
  },
}).pipe(
  Command.withDescription("Show pipeline status for patterns"),
  Command.withHandler(({ options }) =>
    Effect.gen(function* () {
      const sm = yield* PipelineStateMachine;

      // Check if pattern filter is provided
      if (Option.isSome(options.pattern)) {
        // Single pattern status
        const patternId = options.pattern.value;
        const state = yield* sm.getPatternState(patternId);

        yield* Console.log(`\n📊 Pipeline Status - ${state.metadata.title}`);
        yield* Console.log(`   ID: ${state.id}`);
        yield* Console.log(`   Status: ${state.status}`);
        yield* Console.log(`   Current Step: ${state.currentStep}\n`);

        if (options.verbose) {
          yield* Console.log("   Steps:");
          for (const step of WORKFLOW_STEPS) {
            const stepState = state.steps[step];
            if (!stepState) {
              yield* Console.log(`     ⚪ ${step} (not initialized)`);
              continue;
            }
            const icon = getStepIcon(stepState.status);
            const time = stepState.duration
              ? ` (${stepState.duration.toFixed(1)}s)`
              : "";
            yield* Console.log(`     ${icon} ${step}${time}`);

            if (stepState.errors && stepState.errors.length > 0) {
              for (const err of stepState.errors) {
                yield* Console.log(`        ⚠️  ${err}`);
              }
            }
          }
          yield* Console.log("");
        }
      } else {
        // All patterns status
        const all = yield* sm.getAllPatterns();
        const patterns = Object.values(all) as Array<(typeof all)[string]>;

        if (patterns.length === 0) {
          yield* showInfo("No patterns in pipeline.");
          return;
        }

        // Prepare table data
        const tableData = patterns.map((p) => {
          const stepState = p.steps[p.currentStep];
          return {
            title: p.metadata.title || p.id,
            id: p.id,
            status: p.status || "unknown",
            step: p.currentStep || "draft",
            errors: stepState?.errors?.length || 0,
          };
        });

        // Sort by status priority
        const statusPriority = {
          "in-progress": 0,
          failed: 1,
          ready: 2,
          draft: 3,
          completed: 4,
        };
        tableData.sort(
          (a, b) =>
            (statusPriority[a.status as keyof typeof statusPriority] ?? 99) -
            (statusPriority[b.status as keyof typeof statusPriority] ?? 99)
        );

        // Display table
        yield* showTable(tableData, {
          columns: [
            {
              key: "title",
              header: "Pattern",
              width: 35,
            },
            {
              key: "status",
              header: "Status",
              width: 15,
              formatter: (value: string) => `${getStatusEmoji(value)} ${value}`,
            },
            {
              key: "step",
              header: "Step",
              width: 15,
            },
            {
              key: "errors",
              header: "Errors",
              width: 10,
              formatter: (value: number) => (value > 0 ? `❌ ${value}` : "✓"),
            },
          ],
        });

        // Show summary
        const summary = {
          total: patterns.length,
          completed: patterns.filter((p) => p.status === "completed").length,
          inProgress: patterns.filter((p) => p.status === "in-progress").length,
          failed: patterns.filter((p) => p.status === "failed").length,
          ready: patterns.filter((p) => p.status === "ready").length,
        };

        yield* showPanel(
          `Total: ${summary.total} | ✨ Completed: ${summary.completed} | 🔄 In Progress: ${summary.inProgress} | ❌ Failed: ${summary.failed} | ✅ Ready: ${summary.ready}`,
          "Summary",
          { type: "info" }
        );
      }
    }).pipe(
      Effect.provide((StateStore as any).Default),
      Effect.provide((PipelineStateMachine as any).Default)
    )
  )
);

/**
 * Retry command: Retry a failed step
 */
export const retryCommand: any = Command.make("retry", {
  options: {
    all: Options.boolean("all").pipe(
      Options.withAlias("a"),
      Options.withDescription("Retry all patterns at this step"),
      Options.withDefault(false)
    ),
  },
  args: {
    step: Args.text({ name: "step" }),
    pattern: Args.optional(Args.text({ name: "pattern" })),
  },
}).pipe(
  Command.withDescription("Retry a failed step"),
  Command.withHandler(({ options, args }) =>
    Effect.gen(function* () {
      const sm = yield* PipelineStateMachine;

      if (options.all) {
        const failed = yield* sm.getPatternsByStatus("failed");
        let count = 0;

        for (const p of failed) {
          if (p.currentStep === args.step) {
            yield* sm.retryStep(p.id, args.step as any);
            count++;
          }
        }

        yield* Console.log(
          `\n🔄 Retried ${count} pattern(s) on step: ${args.step}\n`
        );
      } else if (Option.isSome(args.pattern)) {
        yield* sm.retryStep(args.pattern.value, args.step as any);
        yield* Console.log(
          `\n🔄 Retried step "${args.step}" for: ${args.pattern.value}\n`
        );
      } else {
        yield* Console.log("\n❌ Specify a pattern or use --all flag\n");
      }
    }).pipe(
      Effect.provide((StateStore as any).Default),
      Effect.provide((PipelineStateMachine as any).Default)
    )
  )
);

/**
 * Resume command: Show patterns ready to resume
 */
export const resumeCommand: any = Command.make("resume", {
  options: {
    verbose: Options.boolean("verbose").pipe(
      Options.withAlias("v"),
      Options.withDescription("Show detailed information"),
      Options.withDefault(false)
    ),
  },
}).pipe(
  Command.withDescription("Show patterns ready to resume"),
  Command.withHandler(({ options }) =>
    Effect.gen(function* () {
      const sm = yield* PipelineStateMachine;
      // Get patterns in "ready" status - these are ready to resume
      const ready = yield* sm.getPatternsByStatus("ready");

      if (ready.length === 0) {
        yield* Console.log("\n✅ No patterns waiting to resume.\n");
        return;
      }

      yield* Console.log(
        `\n▶️  ${ready.length} pattern(s) ready to continue:\n`
      );

      for (const p of ready) {
        const next = getNextStep(p.currentStep);
        yield* Console.log(`   • ${p.metadata.title}`);
        if (options.verbose) {
          yield* Console.log(
            `     Step: ${p.currentStep} → ${next || "finalized"}`
          );
        }
      }

      yield* Console.log("\nRun 'ep-admin pipeline' to continue.\n");
    }).pipe(
      Effect.provide((StateStore as any).Default),
      Effect.provide((PipelineStateMachine as any).Default)
    )
  )
);

/**
 * Helper functions
 */

function getStatusEmoji(status: string): string {
  const emojis: Record<string, string> = {
    draft: "📝",
    "in-progress": "🔄",
    ready: "✅",
    completed: "✨",
    failed: "❌",
    blocked: "⛔",
  };
  return emojis[status] || "❓";
}

function getStepIcon(status: string): string {
  const icons: Record<string, string> = {
    pending: "⏳",
    running: "🔄",
    completed: "✅",
    failed: "❌",
    skipped: "⊘",
  };
  return icons[status] || "?";
}

function getNextStep(current: string): string | null {
  const idx = WORKFLOW_STEPS.indexOf(current as any);
  if (idx < 0 || idx >= WORKFLOW_STEPS.length - 1) return null;
  return WORKFLOW_STEPS[idx + 1];
}

/**
 * Combined parent command for pipeline management
 */
export const pipelineManagementCommand: any = Command.make("pipeline-state", {
  options: {},
}).pipe(
  Command.withDescription("Manage pipeline state and workflow"),
  Command.withSubcommands([statusCommand, retryCommand, resumeCommand])
);
