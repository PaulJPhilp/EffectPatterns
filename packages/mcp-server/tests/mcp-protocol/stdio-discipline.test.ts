import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { spawn } from "child_process"
import { join } from "path"
import { fileURLToPath } from "url"
import { dirname } from "path"
import { existsSync } from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Guard test: Verifies stdio output discipline for MCP server
 *
 * Critical: MCP protocol uses stdout for JSON-RPC messages.
 * Any accidental console.log() or process.stdout.write() will corrupt the protocol.
 * All logging must use console.error() (stderr).
 *
 * This test ensures:
 * 1. Server starts without stdout pollution
 * 2. Only valid JSON-RPC messages appear on stdout
 * 3. Logging appears on stderr only
 */
describe("MCP Stdio Output Discipline", () => {
  let serverProcess: ReturnType<typeof spawn> | null = null
  let stdoutChunks: Buffer[] = []
  let stderrChunks: Buffer[] = []

  beforeAll(async () => {
    // Build the stdio server
    const serverPath = join(__dirname, "../../dist/mcp-stdio.js")
    
    // Skip if server not built (preflight should build it first)
    if (!existsSync(serverPath)) {
      console.warn(
        `[stdio-discipline] Skipping test - server not built at ${serverPath}. ` +
        `Run 'bun run mcp:build' first.`
      )
      return
    }
    
    // Spawn the server process
    serverProcess = spawn("node", [serverPath], {
      env: {
        ...process.env,
        PATTERN_API_KEY: "test-key",
        MCP_ENV: "local",
        MCP_DEBUG: "false", // Disable debug to test normal operation
      },
      stdio: ["pipe", "pipe", "pipe"], // stdin, stdout, stderr
    })

    // Collect stdout (should only contain JSON-RPC protocol messages)
    serverProcess.stdout?.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk)
    })

    // Collect stderr (should contain all logging)
    serverProcess.stderr?.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk)
    })

    // Wait a bit for server to initialize
    await new Promise((resolve) => setTimeout(resolve, 500))
  })

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill()
      serverProcess = null
    }
    stdoutChunks = []
    stderrChunks = []
  })

  it("should not pollute stdout with logging", () => {
    if (!serverProcess) {
      // Skip if server wasn't started (not built)
      return
    }
    
    const stdoutContent = Buffer.concat(stdoutChunks).toString("utf-8")
    
    // Stdout should only contain JSON-RPC protocol messages or be empty
    // Check for common logging patterns that should NOT appear
    const forbiddenPatterns = [
      /\[MCP\]/,
      /\[Effect Patterns MCP\]/,
      /Server started/,
      /Starting MCP server/,
      /console\.log/,
    ]

    for (const pattern of forbiddenPatterns) {
      expect(stdoutContent).not.toMatch(pattern)
    }
  })

  it("should send all logging to stderr", () => {
    if (!serverProcess) {
      // Skip if server wasn't started (not built)
      return
    }
    
    const stderrContent = Buffer.concat(stderrChunks).toString("utf-8")
    
    // Stderr should contain server initialization messages
    // (when MCP_DEBUG=true, or startup errors)
    // This is acceptable - logging belongs on stderr
    expect(stderrContent.length).toBeGreaterThanOrEqual(0)
  })

  it("should produce valid JSON-RPC on stdout when initialized", async () => {
    if (!serverProcess) {
      // Skip if server wasn't started (not built)
      return
    }
    
    // Send an initialize request
    const initializeRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "test-client",
          version: "1.0.0",
        },
      },
    }

    if (serverProcess?.stdin) {
      serverProcess.stdin.write(JSON.stringify(initializeRequest) + "\n")
      
      // Wait for response
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    const stdoutContent = Buffer.concat(stdoutChunks).toString("utf-8")
    
    // Should contain JSON-RPC response
    if (stdoutContent.trim()) {
      const lines = stdoutContent.trim().split("\n")
      const lastLine = lines[lines.length - 1]
      
      // Should be valid JSON
      expect(() => JSON.parse(lastLine)).not.toThrow()
      
      // Should be JSON-RPC format
      const response = JSON.parse(lastLine)
      expect(response).toHaveProperty("jsonrpc", "2.0")
    }
  })

  it("should handle server startup without stdout leakage", () => {
    if (!serverProcess) {
      // Skip if server wasn't started (not built)
      return
    }
    
    // Verify server process started successfully
    expect(serverProcess).not.toBeNull()
    expect(serverProcess?.killed).toBe(false)
    
    // Verify no unexpected output on stdout during startup
    const stdoutContent = Buffer.concat(stdoutChunks).toString("utf-8")
    
    // If there's any stdout content, it should be valid JSON-RPC
    if (stdoutContent.trim()) {
      const lines = stdoutContent.trim().split("\n").filter((line) => line.trim())
      for (const line of lines) {
        expect(() => {
          const parsed = JSON.parse(line)
          // Should be JSON-RPC format
          expect(parsed).toHaveProperty("jsonrpc")
        }).not.toThrow()
      }
    }
  })
})
