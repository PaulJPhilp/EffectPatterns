import { describe, it, expect } from "vitest";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { createCli, runCli } from "../core/index.js";
import { metricsCommand } from "../commands/metrics.js";
function tmpFile(name) {
    return path.join(os.tmpdir(), `effect-patterns-${name}-${Date.now()}.json`);
}
async function runCliWithArgs(args) {
    const root = createCli({ commands: [metricsCommand] });
    await runCli(root, ["node", "cli", ...args]);
}
describe("Metrics command JSON outputs", () => {
    it("metrics report defaults to JSON with global --json and writes to file", async () => {
        const out = tmpFile("metrics-report");
        if (fs.existsSync(out))
            fs.rmSync(out);
        // Group flags must come before the subcommand name
        await runCliWithArgs(["metrics", "--json", "report", "--output", out]);
        const content = fs.readFileSync(out, "utf-8");
        const parsed = JSON.parse(content);
        expect(parsed).toHaveProperty("summary");
        expect(parsed).toHaveProperty("runs");
        expect(Array.isArray(parsed.runs)).toBe(true);
    });
    it("metrics last supports --json and writes { last: ... | null }", async () => {
        const out = tmpFile("metrics-last");
        if (fs.existsSync(out))
            fs.rmSync(out);
        await runCliWithArgs(["metrics", "--json", "last", "--output", out]);
        const content = fs.readFileSync(out, "utf-8");
        const parsed = JSON.parse(content);
        expect(parsed).toHaveProperty("last");
        // Accept null or object depending on seed state
        expect(parsed.last === null || typeof parsed.last === "object").toBe(true);
    });
    it("metrics clear emits { cleared: true } with --json", async () => {
        const out = tmpFile("metrics-clear");
        if (fs.existsSync(out))
            fs.rmSync(out);
        await runCliWithArgs(["metrics", "--json", "clear", "--output", out]);
        const content = fs.readFileSync(out, "utf-8");
        const parsed = JSON.parse(content);
        expect(parsed).toEqual({ cleared: true });
    });
});
