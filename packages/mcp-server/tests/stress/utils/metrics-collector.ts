/**
 * Collects and calculates performance metrics from stress test runs
 */

export interface RequestMetrics {
  duration: number; // milliseconds
  statusCode: number;
  success: boolean;
  parseTime?: number;
  analysisTime?: number;
  bytesReceived?: number;
  memoryBefore?: number;
  memoryAfter?: number;
  error?: string;
}

export interface CalculatedMetrics {
  latency: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p50: number;
    p95: number;
    p99: number;
    stdDev: number;
  };
  throughput: {
    requestsPerSecond: number;
    bytesPerSecond: number;
    successfulRequests: number;
    failedRequests: number;
  };
  errors: {
    total: number;
    rate: number;
    byStatusCode: Record<number, number>;
  };
  resources: {
    memoryGrowth: number; // bytes
    memoryGrowthRate: number; // bytes per second
    peakMemory: number;
  };
  timing: {
    parseTime: number[];
    analysisTime: number[];
    totalTime: number[];
  };
}

export class MetricsCollector {
  private requests: RequestMetrics[] = [];
  private startTime: number = 0;
  private endTime: number = 0;
  private memoryStart: number = 0;
  private memoryPeak: number = 0;

  start(): void {
    this.startTime = performance.now();
    this.memoryStart = this.getMemoryUsage();
    this.memoryPeak = this.memoryStart;
  }

  recordRequest(metrics: RequestMetrics): void {
    this.requests.push(metrics);

    // Track memory peak
    if (metrics.memoryAfter && metrics.memoryAfter > this.memoryPeak) {
      this.memoryPeak = metrics.memoryAfter;
    }
  }

  recordError(statusCode: number, duration: number, error?: string): void {
    this.recordRequest({
      duration,
      statusCode,
      success: false,
      error,
    });
  }

  finish(): void {
    this.endTime = performance.now();
  }

  getElapsedTime(): number {
    return this.endTime - this.startTime;
  }

  private getMemoryUsage(): number {
    return process.memoryUsage().heapUsed;
  }

  calculateMetrics(): CalculatedMetrics {
    const elapsedSeconds = this.getElapsedTime() / 1000;
    const successfulRequests = this.requests.filter((r) => r.success).length;
    const failedRequests = this.requests.filter((r) => !r.success).length;

    // Latency calculations
    const durations = this.requests.map((r) => r.duration).sort((a, b) => a - b);
    const latency = {
      min: Math.min(...durations),
      max: Math.max(...durations),
      mean: durations.reduce((a, b) => a + b, 0) / durations.length,
      median: this.percentile(durations, 50),
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
      stdDev: this.standardDeviation(durations),
    };

    // Error rate
    const totalRequests = this.requests.length;
    const errorRate = failedRequests / totalRequests;

    // Error breakdown by status code
    const byStatusCode: Record<number, number> = {};
    this.requests.forEach((r) => {
      byStatusCode[r.statusCode] = (byStatusCode[r.statusCode] || 0) + 1;
    });

    // Memory calculation
    const memoryGrowth = this.memoryPeak - this.memoryStart;
    const memoryGrowthRate = memoryGrowth / elapsedSeconds;

    // Throughput
    const bytesReceived = this.requests.reduce((sum, r) => sum + (r.bytesReceived || 0), 0);

    // Timing breakdown
    const parseTime = this.requests.filter((r) => r.parseTime).map((r) => r.parseTime!);
    const analysisTime = this.requests.filter((r) => r.analysisTime).map((r) => r.analysisTime!);
    const totalTime = durations;

    return {
      latency,
      throughput: {
        requestsPerSecond: successfulRequests / elapsedSeconds,
        bytesPerSecond: bytesReceived / elapsedSeconds,
        successfulRequests,
        failedRequests,
      },
      errors: {
        total: failedRequests,
        rate: errorRate,
        byStatusCode,
      },
      resources: {
        memoryGrowth,
        memoryGrowthRate,
        peakMemory: this.memoryPeak,
      },
      timing: {
        parseTime,
        analysisTime,
        totalTime,
      },
    };
  }

  private percentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedValues[lower];
    }

    const weight = index % 1;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private standardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map((v) => Math.pow(v - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Get summary statistics
   */
  getSummary(): object {
    const metrics = this.calculateMetrics();
    return {
      totalRequests: this.requests.length,
      successfulRequests: metrics.throughput.successfulRequests,
      failedRequests: metrics.throughput.failedRequests,
      errorRate: `${(metrics.errors.rate * 100).toFixed(2)}%`,
      latency: {
        p50: `${metrics.latency.p50.toFixed(2)}ms`,
        p95: `${metrics.latency.p95.toFixed(2)}ms`,
        p99: `${metrics.latency.p99.toFixed(2)}ms`,
      },
      throughput: `${metrics.throughput.requestsPerSecond.toFixed(2)} req/s`,
      memoryGrowth: `${(metrics.resources.memoryGrowth / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  /**
   * Export metrics as JSON
   */
  toJSON(): CalculatedMetrics {
    return this.calculateMetrics();
  }
}

/**
 * Create a new metrics collector
 */
export function createMetricsCollector(): MetricsCollector {
  return new MetricsCollector();
}
