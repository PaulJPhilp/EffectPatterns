/**
 * Performance thresholds and SLAs for stress testing
 * These values are based on initial baseline measurements
 */

export interface Thresholds {
  edgeCases: EdgeCaseThresholds;
  normalLoad: LoadThresholds;
  peakLoad: LoadThresholds;
  nearLimitFile: VolumeThresholds;
  maxComplexity: VolumeThresholds;
  suddenSpike: SpikeThresholds;
  sustainedLoad: EnduranceThresholds;
}

export interface EdgeCaseThresholds {
  errorResponseTime: number; // max milliseconds
  statusCodeCorrect: number; // percentage (0-1)
  noCrashes: number; // percentage (0-1)
}

export interface LoadThresholds {
  p50: number; // p50 latency in ms
  p95: number; // p95 latency in ms
  p99: number; // p99 latency in ms
  errorRate: number; // percentage (0-1)
  throughput: number; // minimum requests per second
}

export interface VolumeThresholds {
  parseTime?: number; // max milliseconds
  analysisTime?: number; // max milliseconds
  totalTime: number; // max milliseconds
  memoryPeak: number; // max megabytes
}

export interface SpikeThresholds {
  maxDegradation: number; // latency multiplier (3x means 3x normal)
  recoveryTime: number; // milliseconds to recover after spike
  errorRate: number; // percentage (0-1)
  timeoutRate: number; // percentage (0-1)
}

export interface EnduranceThresholds {
  memoryGrowthRate: number; // max MB per minute
  latencyDegradation: number; // multiplier (1.2 = 20% increase)
  gcPauseDuration: number; // max milliseconds per GC pause
  eventLoopLag: number; // max milliseconds
}

/**
 * Default thresholds - these are conservative estimates
 * Adjust after running baseline measurements
 */
export const DEFAULT_THRESHOLDS: Thresholds = {
  edgeCases: {
    errorResponseTime: 100, // Error responses should be fast
    statusCodeCorrect: 1.0, // 100% of error codes must be correct
    noCrashes: 1.0, // 0% unhandled exceptions
  },

  normalLoad: {
    p50: 500, // 500ms median for normal conditions
    p95: 1500, // 1.5s p95 - handles occasional slow requests
    p99: 3000, // 3s p99 - rare slow requests
    errorRate: 0.01, // 1% max error rate
    throughput: 20, // min 20 req/s sustained
  },

  peakLoad: {
    p50: 1000, // 1s median under peak load
    p95: 3000, // 3s p95 under peak load
    p99: 5000, // 5s p99 under peak load
    errorRate: 0.05, // 5% max errors acceptable during peaks
    throughput: 15, // min 15 req/s during peaks
  },

  nearLimitFile: {
    parseTime: 500, // TypeScript parsing should be fast
    analysisTime: 2000, // Analysis rules execution
    totalTime: 5000, // Total request time for 98KB file
    memoryPeak: 200, // Peak memory usage in MB
  },

  maxComplexity: {
    totalTime: 10000, // Allow longer for extremely complex files
    memoryPeak: 300, // More memory for complex analysis
  },

  suddenSpike: {
    maxDegradation: 3, // Latency can degrade at most 3x during spike
    recoveryTime: 5000, // Should recover within 5 seconds
    errorRate: 0.1, // 10% max error rate during spike
    timeoutRate: 0.05, // 5% max timeouts during spike
  },

  sustainedLoad: {
    memoryGrowthRate: 5, // Memory should not grow more than 5MB/min
    latencyDegradation: 1.2, // Latency should not increase more than 20%
    gcPauseDuration: 100, // GC pauses should not exceed 100ms
    eventLoopLag: 50, // Event loop lag should stay below 50ms
  },
};

/**
 * Baseline thresholds - relaxed for initial discovery
 * Use when establishing baseline performance
 */
export const BASELINE_THRESHOLDS: Thresholds = {
  edgeCases: {
    errorResponseTime: 200,
    statusCodeCorrect: 0.95,
    noCrashes: 1.0,
  },
  normalLoad: {
    p50: 1000,
    p95: 3000,
    p99: 5000,
    errorRate: 0.05,
    throughput: 10,
  },
  peakLoad: {
    p50: 2000,
    p95: 5000,
    p99: 8000,
    errorRate: 0.1,
    throughput: 5,
  },
  nearLimitFile: {
    parseTime: 1000,
    analysisTime: 4000,
    totalTime: 10000,
    memoryPeak: 300,
  },
  maxComplexity: {
    totalTime: 15000,
    memoryPeak: 400,
  },
  suddenSpike: {
    maxDegradation: 5,
    recoveryTime: 10000,
    errorRate: 0.2,
    timeoutRate: 0.1,
  },
  sustainedLoad: {
    memoryGrowthRate: 10,
    latencyDegradation: 1.5,
    gcPauseDuration: 200,
    eventLoopLag: 100,
  },
};

/**
 * Get thresholds by mode
 */
export function getThresholds(mode: 'strict' | 'baseline' = 'strict'): Thresholds {
  return mode === 'baseline' ? BASELINE_THRESHOLDS : DEFAULT_THRESHOLDS;
}
