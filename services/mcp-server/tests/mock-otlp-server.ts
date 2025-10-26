/**
 * Mock OTLP Collector Server
 *
 * Lightweight HTTP server that receives OTLP trace exports for testing.
 * Stores received traces in memory for verification in integration tests.
 */

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';

const HTTP_STATUS_OK = 200;
const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_NOT_FOUND = 404;

export type OTLPSpan = {
  traceId: string;
  spanId: string;
  name: string;
  attributes?: Record<string, string | number | boolean>;
  startTime?: string;
  endTime?: string;
};

export type OTLPTrace = {
  resourceSpans: Array<{
    resource: {
      attributes: Array<{ key: string; value: unknown }>;
    };
    scopeSpans: Array<{
      spans: OTLPSpan[];
    }>;
  }>;
};

export class MockOTLPCollector {
  private server: ReturnType<typeof createServer> | null = null;
  private traces: OTLPTrace[] = [];
  private readonly port: number;

  constructor(port = 4318) {
    this.port = port;
  }

  /**
   * Start the mock OTLP collector server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, () => {
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  /**
   * Stop the mock OTLP collector server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
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
    if (req.url === '/v1/traces' && req.method === 'POST') {
      let body = '';

      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const trace = JSON.parse(body) as OTLPTrace;
          this.traces.push(trace);
          const spanCount = this.countSpans(trace);

          res.writeHead(HTTP_STATUS_OK, {
            'Content-Type': 'application/json',
          });
          res.end(JSON.stringify({ status: 'success', spanCount }));
        } catch (_error) {
          res.writeHead(HTTP_STATUS_BAD_REQUEST, {
            'Content-Type': 'application/json',
          });
          res.end(JSON.stringify({ error: 'Invalid trace data' }));
        }
      });
    } else {
      res.writeHead(HTTP_STATUS_NOT_FOUND);
      res.end();
    }
  }

  /**
   * Count total spans in a trace
   */
  private countSpans(trace: OTLPTrace): number {
    return trace.resourceSpans.reduce(
      (total, rs) =>
        total +
        rs.scopeSpans.reduce(
          (scopeTotal, ss) => scopeTotal + ss.spans.length,
          0,
        ),
      0,
    );
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
  port = 4318,
): Promise<MockOTLPCollector> {
  const collector = new MockOTLPCollector(port);
  await collector.start();
  return collector;
}
