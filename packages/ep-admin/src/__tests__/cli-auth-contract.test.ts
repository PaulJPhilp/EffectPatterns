import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
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
  const tempDir = await mkdtemp(path.join(tmpdir(), "ep-admin-cli-auth-"));
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    EP_ADMIN_AUTH_CONFIG_FILE: path.join(tempDir, "config", "auth.json"),
    EP_ADMIN_AUTH_SESSION_FILE: path.join(tempDir, "state", "session.json"),
    EP_ADMIN_AUTH_SESSION_TTL_HOURS: "12",
  };
  return { tempDir, env };
};

describe.sequential("CLI auth and DX contract", () => {
	it("fails protected commands with actionable guidance when not logged in", async () => {
		const { tempDir, env } = await createAuthEnv();
		try {
			const result = runCli(["ops", "rotate-api-key", "--json"], env);
			expect(result.status).toBe(1);
			expect(result.stderr).toContain("ep-admin authentication is not initialized.");
			expect(result.stderr).toContain("Run: ep-admin auth init");
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	it("shows typo suggestion before auth gating for logged-out users", async () => {
		const { tempDir, env } = await createAuthEnv();
		try {
			const typo = runCli(["opz"], env);
			expect(typo.status).toBe(1);
			expect(typo.stderr).toContain("Did you mean: ep-admin ops");
			expect(typo.stderr).toContain("Run: ep-admin --help");
			expect(typo.stderr).not.toContain("auth has not been initialized");
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	it("shows nested typo suggestions before auth gating with scoped help", async () => {
		const { tempDir, env } = await createAuthEnv();
		try {
			const nestedTypo = runCli(["db", "shwo", "all"], env);
			expect(nestedTypo.status).toBe(1);
			expect(nestedTypo.stderr).toContain("Did you mean: ep-admin db show");
			expect(nestedTypo.stderr).toContain("Run: ep-admin db --help");
			expect(nestedTypo.stderr).not.toContain("Run: ep-admin auth init");

			const deepTypo = runCli(["ops", "mcp", "list-rulez"], env);
			expect(deepTypo.status).toBe(1);
			expect(deepTypo.stderr).toContain("Did you mean: ep-admin ops mcp list-rules");
			expect(deepTypo.stderr).toContain("Run: ep-admin ops mcp --help");
			expect(deepTypo.stderr).not.toContain("Run: ep-admin auth init");
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

  it("keeps --help and --version available without login", async () => {
    const { tempDir, env } = await createAuthEnv();
    try {
      const help = runCli(["--help"], env);
      expect(help.status).toBe(0);
      expect(help.stdout).toContain("ep-admin");
      expect(help.stdout).toContain("Top-level commands:");
      expect(help.stdout).not.toContain("pattern pattern");
      expect(help.stdout).not.toContain("data data");

      const version = runCli(["--version"], env);
      expect(version.status).toBe(0);
      expect(version.stdout.trim().length).toBeGreaterThan(0);

      const noColor = runCli(["--help"], {
        ...env,
        NO_COLOR: "1",
      });
      expect(noColor.status).toBe(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("allows protected commands after auth init/login", async () => {
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

      const login = runCli(
        [
          "auth",
          "login",
          "--passphrase",
          "correct-horse-battery",
          "--json",
        ],
        env
      );
      expect(login.status).toBe(0);

      const protectedResult = runCli(["ops", "rotate-api-key", "--json"], env);
      expect(protectedResult.status).toBe(0);
      expect(() => JSON.parse(protectedResult.stdout)).not.toThrow();
      const payload = JSON.parse(protectedResult.stdout) as {
        ok: boolean;
        action: string;
      };
      expect(payload.ok).toBe(true);
      expect(payload.action).toBe("rotate-api-key");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("supports service token bypass and rejects invalid token", async () => {
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

      const bypass = runCli(["ops", "rotate-api-key", "--json"], {
        ...env,
        EP_ADMIN_SERVICE_TOKEN: "automation-token-123456",
      });
      expect(bypass.status).toBe(0);

      const wrongToken = runCli(["ops", "rotate-api-key", "--json"], {
        ...env,
        EP_ADMIN_SERVICE_TOKEN: "wrong-token",
      });
      expect(wrongToken.status).toBe(1);
      expect(wrongToken.stderr).toContain("Invalid EP_ADMIN_SERVICE_TOKEN");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

	it("keeps deep typo handling consistent for session and service-token paths", async () => {
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

			const login = runCli(
				[
					"auth",
					"login",
					"--passphrase",
					"correct-horse-battery",
					"--json",
				],
				env
			);
			expect(login.status).toBe(0);

			const withSession = runCli(["ops", "mcp", "list-rulez"], env);
			expect(withSession.status).toBe(1);
			expect(withSession.stderr).toContain(
				"Did you mean: ep-admin ops mcp list-rules"
			);
			expect(withSession.stderr).toContain("Run: ep-admin ops mcp --help");
			expect(withSession.stderr).not.toContain("[object Object]");

			const withTokenBypass = runCli(["ops", "mcp", "list-rulez"], {
				...env,
				EP_ADMIN_SERVICE_TOKEN: "automation-token-123456",
			});
			expect(withTokenBypass.status).toBe(1);
			expect(withTokenBypass.stderr).toContain(
				"Did you mean: ep-admin ops mcp list-rules"
			);
			expect(withTokenBypass.stderr).toContain("Run: ep-admin ops mcp --help");
			expect(withTokenBypass.stderr).not.toContain("[object Object]");
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

  it("supports ops help and legacy alias warning, plus typo suggestion", async () => {
    const { tempDir, env } = await createAuthEnv();
    try {
      const opsHelp = runCli(["ops", "--help"], env);
      expect(opsHelp.status).toBe(0);
      expect(opsHelp.stdout).toContain("health-check");

      const legacy = runCli(["search", "--help"], env);
      expect(legacy.status).toBe(0);
      expect(legacy.stderr).toContain("Deprecated command path");

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

      const typo = runCli(["opz"], {
        ...env,
        EP_ADMIN_SERVICE_TOKEN: "automation-token-123456",
      });
      expect(typo.status).toBe(1);
      expect(typo.stderr).toContain("Did you mean: ep-admin ops");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

	it("uses canonical ep-admin release guidance text", async () => {
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

			const preview = runCli(["release", "preview"], {
				...env,
				EP_ADMIN_SERVICE_TOKEN: "automation-token-123456",
			});
			const combinedOutput = `${preview.stdout}\n${preview.stderr}`;
			expect(combinedOutput).not.toContain("bun run ep release create");
			if (combinedOutput.includes("To create this release, run:")) {
				expect(combinedOutput).toContain("ep-admin release create");
			}
			if (combinedOutput.includes("No git tags found in this repository.")) {
				expect(combinedOutput).toContain("ep-admin release create");
			}
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});
});
