/**
 * Mock OTLP Collector Server
 *
 * Lightweight HTTP server that receives OTLP trace exports for testing.
 * Stores received traces in memory for verification in integration tests.
 */

import { createServer, IncomingMessage, ServerResponse } from "node:http";

export interface OTLPSpan {
  traceId: string;
  spanId: string;
  name: string;
  attributes?: Record<string, string | number | boolean>;
  startTime?: string;
  endTime?: string;
}

export interface OTLPTrace {
  resourceSpans: Array<{
    resource: {
      attributes: Array<{ key: string; value: any }>;
    };
    scopeSpans: Array<{
      spans: OTLPSpan[];
    }>;
  }>;
}

export class MockOTLPCollector {
  private server: ReturnType<typeof createServer> | null = null;
  private traces: OTLPTrace[] = [];
  private port: number;

  constructor(port: number = 4318) {
    this.port = port;
  }

  /**
   * Start the mock OTLP collector server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, () => {
        console.log(`[MockOTLP] Listening on port ${this.port}`);
        resolve();
      });

      this.server.on("error", reject);
    });
  }

  /**
   * Stop the mock OTLP collector server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log("[MockOTLP] Server stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle incoming HTTP requests
   */
  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    // Handle OTLP trace export
    if (req.url === "/v1/traces" && req.method === "POST") {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        try {
          const trace = JSON.parse(body) as OTLPTrace;
          this.traces.push(trace);

          console.log(
            `[MockOTLP] Received trace with ${this.countSpans(trace)} spans`
          );

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "success" }));
        } catch (error) {
          console.error("[MockOTLP] Error parsing trace:", error);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid trace data" }));
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  }

  /**
   * Count total spans in a trace
   */
  private countSpans(trace: OTLPTrace): number {
    return trace.resourceSpans.reduce((total, rs) => {
      return (
        total +
        rs.scopeSpans.reduce((scopeTotal, ss) => {
          return scopeTotal + ss.spans.length;
        }, 0)
      );
    }, 0);
  }

  /**
   * Get all received traces
   */
  getTraces(): OTLPTrace[] {
    return this.traces;
  }

  /**
   * Get all spans from all traces
   */
  getAllSpans(): OTLPSpan[] {
    const spans: OTLPSpan[] = [];

    for (const trace of this.traces) {
      for (const resourceSpan of trace.resourceSpans) {
        for (const scopeSpan of resourceSpan.scopeSpans) {
          spans.push(...scopeSpan.spans);
        }
      }
    }

    return spans;
  }

  /**
   * Find spans by name
   */
  findSpansByName(name: string): OTLPSpan[] {
    return this.getAllSpans().filter((span) => span.name === name);
  }

  /**
   * Find span by trace ID
   */
  findSpanByTraceId(traceId: string): OTLPSpan | undefined {
    return this.getAllSpans().find((span) => span.traceId === traceId);
  }

  /**
   * Clear all collected traces
   */
  clear(): void {
    this.traces = [];
  }

  /**
   * Get trace count
   */
  getTraceCount(): number {
    return this.traces.length;
  }

  /**
   * Get span count
   */
  getSpanCount(): number {
    return this.getAllSpans().length;
  }
}

/**
 * Helper to create and start a mock OTLP collector
 */
export async function createMockOTLPCollector(
  port: number = 4318
): Promise<MockOTLPCollector> {
  const collector = new MockOTLPCollector(port);
  await collector.start();
  return collector;
}
