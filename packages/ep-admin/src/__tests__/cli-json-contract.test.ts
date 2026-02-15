import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageDir = path.resolve(__dirname, "../..");

type CliRun = {
	status: number | null;
	stdout: string;
	stderr: string;
};

const runCli = (args: readonly string[], env: NodeJS.ProcessEnv): CliRun => {
	const result = spawnSync("bun", ["src/index.ts", ...args], {
		cwd: packageDir,
		env,
		encoding: "utf8",
	});

	return {
		status: result.status,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	};
};

const createAuthEnv = async () => {
	const tempDir = await mkdtemp(path.join(tmpdir(), "ep-admin-cli-json-"));
	const env: NodeJS.ProcessEnv = {
		...process.env,
		EP_ADMIN_AUTH_CONFIG_FILE: path.join(tempDir, "config", "auth.json"),
		EP_ADMIN_AUTH_SESSION_FILE: path.join(tempDir, "state", "session.json"),
		EP_ADMIN_AUTH_SESSION_TTL_HOURS: "12",
	};
	return { tempDir, env };
};

describe.sequential("CLI JSON machine contract", () => {
	it("keeps stdout parseable and stderr clean for stable JSON commands", async () => {
		const { tempDir, env } = await createAuthEnv();
		try {
			const init = runCli(
				[
					"auth",
					"init",
					"--passphrase",
					"correct-horse-battery",
					"--confirm-passphrase",
					"correct-horse-battery",
					"--service-token",
					"automation-token-123456",
					"--json",
				],
				env
			);
			expect(init.status).toBe(0);

			const automationEnv = {
				...env,
				EP_ADMIN_SERVICE_TOKEN: "automation-token-123456",
			};

			const commands: ReadonlyArray<readonly string[]> = [
				["ops", "rotate-api-key", "--json"],
				["config", "install", "list", "--json"],
				["pattern", "skills", "skill-generator", "--json"],
				["db", "mock", "--json"],
			];

			for (const commandArgs of commands) {
				const result = runCli(commandArgs, automationEnv);
				expect(result.status).toBe(0);
				expect(result.stderr.trim()).toBe("");
				expect(() => JSON.parse(result.stdout)).not.toThrow();
			}
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	it("keeps stdout empty for failing JSON commands", async () => {
		const { tempDir, env } = await createAuthEnv();
		try {
			const init = runCli(
				[
					"auth",
					"init",
					"--passphrase",
					"correct-horse-battery",
					"--confirm-passphrase",
					"correct-horse-battery",
					"--service-token",
					"automation-token-123456",
					"--json",
				],
				env
			);
			expect(init.status).toBe(0);

			const automationEnv = {
				...env,
				EP_ADMIN_SERVICE_TOKEN: "automation-token-123456",
			};

			const dbFailure = runCli(["db", "show", "patterns", "--json"], automationEnv);
			expect(dbFailure.status).toBe(1);
			expect(dbFailure.stdout.trim()).toBe("");
			expect(dbFailure.stderr.trim().length).toBeGreaterThan(0);
			expect(dbFailure.stderr).toContain("Run: ep-admin db --help");

			const ingestFailure = runCli(["data", "ingest", "status", "--json"], automationEnv);
			expect(ingestFailure.status).toBe(1);
			expect(ingestFailure.stdout.trim()).toBe("");
			expect(ingestFailure.stderr.trim().length).toBeGreaterThan(0);
			expect(ingestFailure.stderr).toContain("Run: ep-admin data --help");

			const invalidToolFailure = runCli(
				["config", "install", "add", "--tool", "badtool", "--json"],
				automationEnv
			);
			expect(invalidToolFailure.status).toBe(1);
			expect(invalidToolFailure.stdout.trim()).toBe("");
			expect(invalidToolFailure.stderr).toContain("Unsupported tool");

			const invalidFormatFailure = runCli(
				["config", "install", "skills", "--format", "invalid", "--json"],
				automationEnv
			);
			expect(invalidFormatFailure.status).toBe(1);
			expect(invalidFormatFailure.stdout.trim()).toBe("");
			expect(invalidFormatFailure.stderr).toContain("Invalid format option");

			const searchFailure = runCli(
				["pattern", "search", "foo", "--json"],
				{
					...automationEnv,
					DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:1/effect_patterns",
				}
			);
			expect(searchFailure.status).toBe(1);
			expect(searchFailure.stdout.trim()).toBe("");
			expect(searchFailure.stderr.trim().length).toBeGreaterThan(0);
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});
});
