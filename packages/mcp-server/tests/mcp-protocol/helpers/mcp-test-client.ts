/**
 * MCP Test Client Helper
 *
 * Provides a reusable test client for interacting with the MCP server via stdio transport.
 * Handles spawning the server process, managing the connection, and cleaning up resources.
 */

import { spawn, ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");

/**
 * MCP Test Client Configuration
 */
export interface MCPTestClientConfig {
  /** API key for the MCP server */
  apiKey: string;
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
  }>;
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
  private config: MCPTestClientConfig;
  private toolTimeout: number;
  private isConnected = false;

  private constructor(
    client: Client,
    transport: StdioClientTransport,
    serverProcess: ChildProcess,
    config: MCPTestClientConfig
  ) {
    this.client = client;
    this.transport = transport;
    this.serverProcess = serverProcess;
    this.config = config;
    this.toolTimeout = config.toolTimeout ?? 30000;
  }

  /**
   * Create and initialize an MCP test client
   */
  static async create(config: MCPTestClientConfig): Promise<MCPTestClient> {
    // Build the MCP server if not already built
    const distPath = path.join(projectRoot, "dist", "mcp-stdio.js");

    // Create stdio transport - handles spawning the process internally
    const transport = new StdioClientTransport({
      command: "bun",
      args: [distPath],
      env: {
        ...process.env,
        PATTERN_API_KEY: config.apiKey,
        EFFECT_PATTERNS_API_URL: config.apiUrl || "http://localhost:3000",
        MCP_DEBUG: config.debug ? "true" : "false",
      },
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

      // Create a dummy process reference (we'll track the transport instead)
      const dummyProcess = {
        kill: () => {},
        once: () => {},
      } as unknown as ChildProcess;

      // Create and return test client instance
      const testClient = new MCPTestClient(client, transport, dummyProcess, config);
      testClient.isConnected = true;

      return testClient;
    } catch (error) {
      throw new Error(`Failed to connect to MCP server: ${error}`);
    }
  }

  /**
   * Call a tool via MCP protocol
   */
  async callTool(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
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
        this.toolTimeout
      );

      return result as ToolResult;
    } catch (error) {
      throw new Error(`Tool call failed: ${toolName} - ${error}`);
    }
  }

  /**
   * Parse tool result as JSON
   */
  parseResult(result: ToolResult): unknown {
    if (!result.content || result.content.length === 0) {
      throw new Error("Tool result is empty");
    }

    const textContent = result.content.find((c) => c.type === "text");
    if (!textContent) {
      throw new Error("No text content in tool result");
    }

    try {
      return JSON.parse(textContent.text);
    } catch (error) {
      throw new Error(`Failed to parse tool result: ${error}`);
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
        // @ts-expect-error Transport.close may not be typed
        await this.transport.close?.();
      }

      // Kill the server process
      if (this.serverProcess) {
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
  overrides?: Partial<MCPTestClientConfig>
): Promise<MCPTestClient> {
  const config: MCPTestClientConfig = {
    apiKey: overrides?.apiKey || "test-api-key",
    apiUrl: overrides?.apiUrl || "http://localhost:3000",
    debug: overrides?.debug ?? false,
    toolTimeout: overrides?.toolTimeout,
  };

  return MCPTestClient.create(config);
}
