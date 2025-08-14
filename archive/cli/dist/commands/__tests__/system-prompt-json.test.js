import { describe, it, expect } from "vitest";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { createCli, runCli } from "../../core/index.js";
import { systemPromptCommand } from "../../commands/system-prompt.js";
function tmpFile(name) {
    return path.join(os.tmpdir(), `effect-patterns-${name}-${Date.now()}.json`);
}
async function runCliWithArgs(args) {
    const root = createCli({ commands: [systemPromptCommand] });
    await runCli(root, ["node", "cli", ...args]);
}
describe("System prompt JSON/file outputs", () => {
    it("system-prompt clear respects --json and --output (writes text)", async () => {
        const out = tmpFile("system-prompt-clear");
        if (fs.existsSync(out))
            fs.rmSync(out);
        await runCliWithArgs([
            "system-prompt",
            "--json",
            "clear",
            "--output",
            out,
        ]);
        const content = fs.readFileSync(out, "utf-8");
        expect(content).toBe("System prompt cleared");
    });
    it("system-prompt file supports local --output and writes text", async () => {
        const tmpMdx = tmpFile("system-prompt-file-input").replace(/\.json$/, ".mdx");
        const out = tmpFile("system-prompt-file-out");
        if (fs.existsSync(out))
            fs.rmSync(out);
        // Minimal valid MDX with frontmatter for TemplateService
        const mdxContent = [
            "---",
            "parameters: {}",
            "---",
            "Hello",
            "",
        ].join("\n");
        fs.writeFileSync(tmpMdx, mdxContent, "utf-8");
        await runCliWithArgs([
            "system-prompt",
            "file",
            "--output",
            out,
            tmpMdx,
        ]);
        const expectedMsg = `System prompt set to: ${path.resolve(tmpMdx)}`;
        const content = fs.readFileSync(out, "utf-8");
        expect(content).toBe(expectedMsg);
    });
});
