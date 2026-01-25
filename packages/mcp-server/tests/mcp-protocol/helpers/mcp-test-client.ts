/**
 * MCP Test Client Helper
 *
 * Provides a reusable test client for interacting with the MCP server via stdio transport.
 * Handles spawning the server process, managing the connection, and cleaning up resources.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");

/**
 * MCP Test Client Configuration
 */
export interface MCPTestClientConfig {
  /** API key for the MCP server (optional - MCP is pure transport) */
  apiKey?: string;
  /** Base URL for the API (default: http://localhost:3000) */
  apiUrl?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Timeout for tool calls in milliseconds (default: 30000) */
  toolTimeout?: number;
}

/**
 * Tool Result Type
 */
export interface ToolResult {
  content: Array<{
    type: string;
    text: string;
    mimeType?: string;
  }>;
  structuredContent?: unknown;
  isError?: boolean;
}

/**
 * MCP Test Client
 *
 * Manages MCP server lifecycle and provides typed tool invocation methods.
 */
export class MCPTestClient {
  private client: Client;
  private transport: StdioClientTransport;
  private serverProcess: ChildProcess;
  private toolTimeout: number;
  private isConnected = false;

  private constructor(
    client: Client,
    transport: StdioClientTransport,
    serverProcess: ChildProcess,
    config: MCPTestClientConfig,
  ) {
    this.client = client;
    this.transport = transport;
    this.serverProcess = serverProcess;
    this.toolTimeout = config.toolTimeout ?? 30000;
  }

  /**
   * Create and initialize an MCP test client
   */
  static async create(config: MCPTestClientConfig): Promise<MCPTestClient> {
    // Build the MCP server if not already built
    const distPath = path.join(projectRoot, "dist", "mcp-stdio.js");

    // Create stdio transport - handles spawning the process internally
    // MCP server is pure transport - API key is optional
    const env: Record<string, string> = {
      ...process.env,
      EFFECT_PATTERNS_API_URL: config.apiUrl || "http://localhost:3000",
      MCP_DEBUG: config.debug ? "true" : "false",
    };

    // Ensure deterministic API key behavior for local MCP tests.
    if (config.apiKey) {
      env.PATTERN_API_KEY = config.apiKey;
      env.LOCAL_API_KEY = config.apiKey;
    } else {
      delete env.PATTERN_API_KEY;
      delete env.LOCAL_API_KEY;
    }

    const transport = new StdioClientTransport({
      command: "bun",
      args: [distPath],
      env,
      stderr: config.debug ? "pipe" : "ignore",
    });

    // Create MCP client
    const client = new Client({
      name: "effect-patterns-test-client",
      version: "1.0.0",
    });

    try {
      // Connect client to transport
      await client.connect(transport);

      // Create and return test client instance
      const testClient = new MCPTestClient(
        client,
        transport,
        null as any, // We'll rely on transport.close() instead of explicit process kill
        config,
      );
      testClient.isConnected = true;

      return testClient;
    } catch (error) {
      throw new Error(`Failed to connect to MCP server: ${error}`);
    }
  }

  /**
   * Call a tool via MCP protocol
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    if (!this.isConnected) {
      throw new Error("MCP client is not connected");
    }

    try {
      const result = await this.client.callTool(
        {
          name: toolName,
          arguments: args,
        },
        undefined,
        { timeout: this.toolTimeout },
      );

      // In the new architecture, tools return errors as values (isError flag)
      // Return the result whether it's success or error - let tests decide
      return result as ToolResult;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Tool execution failed")
      ) {
        throw error;
      }
      throw new Error(`Tool call failed: ${toolName} - ${error}`);
    }
  }

  /**
   * Parse tool result as JSON
   */
  parseResult(result: ToolResult): unknown {
    if (!result.content || result.content.length === 0) {
      return null;
    }

    const update = result.content.find((c) => c.type === "text");
    if (!update) {
      return null;
    }

    if (result.isError) {
      return { error: update.text };
    }

    try {
      return JSON.parse(update.text);
    } catch {
      return update.text;
    }
  }

  /**
   * Get list of available tools
   */
  async listTools(): Promise<string[]> {
    const tools = await this.client.listTools();
    return tools.tools.map((t) => t.name);
  }

  /**
   * Close the MCP client and clean up resources
   */
  async close(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    this.isConnected = false;

    try {
      // Close the transport
      if (this.transport) {
        await this.transport.close();
      }

      // Kill the server process if we have one
      if (this.serverProcess && typeof this.serverProcess.kill === 'function') {
        try {
          this.serverProcess.kill("SIGTERM");

          // Wait for process to exit
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              this.serverProcess.kill("SIGKILL");
              resolve();
            }, 5000);

            this.serverProcess.once("exit", () => {
              clearTimeout(timeout);
              resolve();
            });
          });
        } catch (e) {
          // Process might already be dead
        }
      }
    } catch (error) {
      console.error("[MCP Client] Error during cleanup:", error);
    }
  }

  /**
   * Check if client is connected
   */
  isReady(): boolean {
    return this.isConnected;
  }
}

/**
 * Helper function to create a test client with default settings
 */
export async function createMCPTestClient(
  overrides?: Partial<MCPTestClientConfig>,
): Promise<MCPTestClient> {
  const config: MCPTestClientConfig = {
    // API key is optional - MCP is pure transport, auth happens at HTTP API
    apiKey: overrides?.apiKey,
    apiUrl: overrides?.apiUrl || "http://localhost:3000",
    debug: overrides?.debug ?? false,
    toolTimeout: overrides?.toolTimeout,
  };

  return MCPTestClient.create(config);
}
