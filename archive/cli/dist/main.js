import * as dotenv from "dotenv";
dotenv.config();
import { applyPromptToDir } from "./commands/apply-prompt-to-dir.js";
import { authCommand } from "./commands/auth.js";
import { configCommand } from "./commands/config.js";
import { dryRun } from "./commands/dry-run.js";
import { echoCommand } from "./commands/echo.js";
import { effectPatternsGen, effectPatternsGenerate, effectPatternsProcessPromptLegacy, } from "./commands/generate.js";
import { health } from "./commands/health.js";
import { effectPatternsList } from "./commands/list.js";
import { metricsCommand } from "./commands/metrics.js";
import { planCommand } from "./commands/plan.js";
import { run as runGroup } from "./commands/run.js";
import { systemPromptCommand } from "./commands/system-prompt.js";
import { testCommand } from "./commands/test.js";
import { traceCommand } from "./commands/trace.js";
import { createCli, runCli } from "./core/index.js";
// Compose CLI via core factory
const root = createCli({
    name: "effect-ai",
    version: "1.0.0",
    commands: [
        effectPatternsList,
        dryRun,
        configCommand,
        health,
        runGroup,
        metricsCommand,
        planCommand,
        effectPatternsGenerate,
        effectPatternsGen,
        effectPatternsProcessPromptLegacy,
        authCommand,
        traceCommand,
        testCommand,
        applyPromptToDir,
        systemPromptCommand,
        echoCommand,
    ],
});
runCli(root);
//# sourceMappingURL=main.js.map