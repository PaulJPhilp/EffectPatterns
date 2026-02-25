/**
 * Test Data Configuration
 * Documents how test data is generated and configured
 */

/**
 * Code generation presets for different test scenarios
 *
 * Each preset controls:
 * - Target file size
 * - Number of functions
 * - Nesting depth
 * - Number of anti-patterns to inject
 * - Overall complexity level
 */
export const PRESET_DOCUMENTATION = {
  /**
   * Empty file - tests handling of zero-byte input
   * Size: 0 bytes
   * Expected: Fast error response with correct status code
   */
  empty: {
    size: 0,
    functions: 0,
    nesting: 0,
    issues: 0,
    useCase: 'boundary value testing',
  },

  /**
   * Minimal file - single function, minimal TypeScript
   * Size: ~100 bytes
   * Expected: Processes instantly, may find issues
   */
  minimal: {
    size: 100,
    functions: 1,
    nesting: 1,
    issues: 0,
    useCase: 'baseline measurement',
  },

  /**
   * Small file - typical use case
   * Size: ~5KB
   * Functions: ~10
   * Expected: < 1s response time, baseline for load tests
   */
  small: {
    size: 5000,
    functions: 10,
    nesting: 2,
    issues: 2,
    useCase: 'normal load testing',
    characteristics: [
      'Realistic small module',
      'Quick analysis',
      'Good for high throughput tests',
      'Multiple concurrent requests',
    ],
  },

  /**
   * Medium file - larger module
   * Size: ~25KB
   * Functions: ~50
   * Expected: 1-2s response time, performance baseline
   */
  medium: {
    size: 25000,
    functions: 50,
    nesting: 3,
    issues: 5,
    useCase: 'mixed load testing',
    characteristics: [
      'Substantial module',
      'More anti-patterns',
      'Moderate analysis time',
      'Good for resource measurement',
    ],
  },

  /**
   * Large file - substantial module near limit
   * Size: ~90KB
   * Functions: ~150
   * Expected: 3-5s response time, stress testing
   */
  large: {
    size: 90000,
    functions: 150,
    nesting: 4,
    issues: 15,
    useCase: 'volume testing',
    characteristics: [
      'Near size limit',
      'Complex analysis',
      'Longer response times',
      'Memory intensive',
    ],
  },

  /**
   * Near-limit file - pushes boundaries
   * Size: ~98KB (just under 100KB limit)
   * Functions: ~200
   * Expected: 4-5s response time, peak resource usage
   */
  nearLimit: {
    size: 98000,
    functions: 200,
    nesting: 5,
    issues: 20,
    useCase: 'boundary and volume testing',
    characteristics: [
      'Maximum allowed size',
      'Extensive analysis',
      'Peak memory usage',
      'Stress on AST traversal',
    ],
  },

  /**
   * Over-limit file - tests size validation
   * Size: ~101KB (over 100KB limit)
   * Expected: Immediate 413 Payload Too Large response
   */
  overLimit: {
    size: 101000,
    functions: 250,
    nesting: 5,
    issues: 25,
    useCase: 'boundary validation',
    characteristics: [
      'Exceeds size limit',
      'Quick rejection',
      'Tests validation layer',
      'Error response performance',
    ],
  },
};

/**
 * Anti-pattern distribution strategies
 */
export const ANTI_PATTERN_STRATEGIES = {
  /**
   * Uniform distribution - evenly spread throughout file
   * Use for: testing rule detection coverage
   * Result: Easy to find all patterns
   */
  uniform: {
    description: 'Patterns evenly distributed',
    spacing: 'equal',
    useCase: 'validation testing',
  },

  /**
   * Clustered distribution - grouped at start
   * Use for: early stopping detection
   * Result: Patterns found quickly if doing early exit
   */
  clustered: {
    description: 'Patterns grouped together',
    spacing: 'dense at start',
    useCase: 'early termination testing',
  },

  /**
   * Random distribution - unpredictable positions
   * Use for: stress testing pattern detection
   * Result: Most realistic distribution
   */
  random: {
    description: 'Patterns randomly placed',
    spacing: 'unpredictable',
    useCase: 'realistic load simulation',
  },
};

/**
 * Common anti-pattern combinations
 */
export const ANTI_PATTERN_PRESETS = {
  /**
   * Heavily flawed - realistic worst case
   * Combines multiple anti-pattern types
   * Expected findings: 20-50 total issues (top 3 returned)
   */
  heavilyFlawed: {
    'async-await': 5,
    'any-type': 8,
    'throw-error': 3,
    'console-log': 4,
    description: 'Realistic worst-case code',
    expectedFindings: '20-50 (top 3 returned)',
  },

  /**
   * Moderate issues - common case
   * Mix of a few anti-patterns
   * Expected findings: 5-10 total issues
   */
  moderate: {
    'any-type': 3,
    'async-await': 2,
    'console-log': 1,
    description: 'Common code issues',
    expectedFindings: '5-10',
  },

  /**
   * Minimal issues - nearly clean code
   * Just a few anti-patterns
   * Expected findings: 1-3 total issues
   */
  minimal: {
    'any-type': 1,
    description: 'Mostly clean code',
    expectedFindings: '1-3',
  },

  /**
   * Async/await heavy - focuses on async issues
   * Many instances of async/await in Effect context
   * Expected findings: 10+ async-related issues (top 3 returned)
   */
  asyncAwaitHeavy: {
    'async-await': 10,
    description: 'Async/await anti-pattern focus',
    expectedFindings: '10+ (top 3 returned)',
  },

  /**
   * Any-type heavy - type system issues
   * Many `any` type declarations
   * Expected findings: 15+ type issues
   */
  anyTypeHeavy: {
    'any-type': 15,
    description: 'Type safety issues',
    expectedFindings: '15+ (top 3 returned)',
  },

  /**
   * Mixed patterns - diverse issues
   * All anti-pattern types represented
   * Expected findings: 25+ total issues
   */
  mixed: {
    'async-await': 3,
    'any-type': 5,
    'throw-error': 2,
    'console-log': 2,
    'mutable-ref': 1,
    'promise-all': 1,
    description: 'Diverse anti-patterns',
    expectedFindings: '25+ (top 3 returned)',
  },
};

/**
 * Complex code generation strategies
 */
export const COMPLEXITY_PROFILES = {
  /**
   * Stack stress - deeply nested structures
   * Tests: AST traversal depth handling
   * Expected: 8-15 levels of nesting
   */
  stackStress: {
    nestingDepth: 15,
    description: 'Deep nesting stress test',
    stressedComponent: 'AST traversal stack',
  },

  /**
   * Parser stress - many declarations
   * Tests: TypeScript parser performance
   * Expected: 200+ functions
   */
  parserStress: {
    functionCount: 200,
    description: 'Many functions stress test',
    stressedComponent: 'TypeScript parser',
  },

  /**
   * Memory stress - very large file
   * Tests: Memory allocation and GC
   * Expected: 95KB near limit
   */
  memoryStress: {
    sizeKB: 95,
    description: 'Large file memory stress',
    stressedComponent: 'Memory management',
  },

  /**
   * Type analysis stress - complex types
   * Tests: Type system analysis
   * Expected: 10 levels of type nesting
   */
  typeStress: {
    typeNestingDepth: 10,
    description: 'Type system stress test',
    stressedComponent: 'Type analysis',
  },

  /**
   * Effect pattern stress - complex chains
   * Tests: Effect pattern recognition
   * Expected: Complex Effect chains
   */
  effectStress: {
    effectChains: 5,
    chainDepth: 4,
    description: 'Effect composition stress',
    stressedComponent: 'Effect pattern detection',
  },

  /**
   * Combined max stress - all factors
   * Tests: Overall system performance
   * Expected: ~98KB file with all complexities
   */
  maxStress: {
    nestingDepth: 8,
    functionCount: 50,
    typeNestingDepth: 5,
    effectChains: 3,
    description: 'Maximum combined stress',
    stressedComponent: 'Overall system',
  },
};

/**
 * Test scenarios and what they measure
 */
export const TEST_SCENARIOS = {
  boundaryValues: {
    description: 'Test file size boundaries',
    files: ['empty', 'minimal', 'nearLimit', 'overLimit'],
    measures: ['size validation', 'error handling', 'response time'],
  },

  performanceBaseline: {
    description: 'Establish baseline performance',
    files: ['small', 'medium', 'large'],
    measures: ['latency', 'throughput', 'memory usage'],
  },

  concurrentLoad: {
    description: 'Test concurrent request handling',
    files: ['small'], // repeated many times
    rps: [10, 25, 50, 100],
    measures: ['latency distribution', 'throughput', 'error rate'],
  },

  volumeHandling: {
    description: 'Test handling of large/complex files',
    files: ['large', 'nearLimit'],
    variants: ['clean', 'many-issues', 'deeply-nested'],
    measures: ['parse time', 'analysis time', 'memory peak'],
  },

  memoryLeakDetection: {
    description: 'Detect memory leaks during extended runs',
    duration: '30 minutes',
    requestsPerSecond: 5,
    measures: ['memory growth rate', 'latency degradation'],
  },

  trafficBurst: {
    description: 'Test resilience to sudden load spikes',
    patterns: [
      'ramp (0→100 req/s)',
      'spike (sudden peak)',
      'oscillation (10↔80 req/s)',
      'flash crowd (200 simultaneous)',
    ],
    measures: ['latency degradation', 'recovery time', 'error rate'],
  },
};

/**
 * Expected performance characteristics
 */
export const EXPECTED_PERFORMANCE = {
  parseTime: {
    small: '100-200ms',
    medium: '300-500ms',
    large: '400-600ms',
    nearLimit: '500-1000ms',
    description: 'TypeScript AST creation time',
  },

  analysisTime: {
    small: '200-400ms',
    medium: '600-1000ms',
    large: '1000-2000ms',
    nearLimit: '2000-4000ms',
    description: 'Rule execution and analysis time',
  },

  totalTime: {
    small: '300-600ms',
    medium: '900-1500ms',
    large: '1400-2600ms',
    nearLimit: '2500-5000ms',
    description: 'Total request time (parse + analysis)',
  },

  concurrentThroughput: {
    '10 req/s': '> 25 req/s success rate',
    '25 req/s': '> 20 req/s success rate',
    '50 req/s': '> 15 req/s success rate',
    '100 req/s': 'variable (saturation point)',
    description: 'Actual throughput at various target rates',
  },

  memoryUsage: {
    baseline: '50MB',
    small: '80MB',
    medium: '120MB',
    large: '180MB',
    nearLimit: '200MB',
    description: 'Heap memory usage per request',
  },
};

/**
 * Code generation distribution
 * How code is structured for testing
 */
export const CODE_STRUCTURE = {
  imports: {
    effect: 'Always included',
    types: 'TypeScript types as needed',
    count: '1-3 imports per file',
  },

  functions: {
    naming: 'func_N or function_N pattern',
    structure: 'Mix of async, sync, and Effect generators',
    antiPatterns: 'Injected at calculated positions',
  },

  types: {
    classes: 'Mix of class and interface declarations',
    nesting: 'Type definitions nested up to specified depth',
    coverage: 'All TypeScript type variants',
  },

  effects: {
    patterns: 'Effect.gen, pipe compositions, error handling',
    chains: 'Sequential effects and flatMap chains',
    depth: 'Nesting up to specified level',
  },

  comments: {
    headers: 'File and function comments',
    padding: 'Used to reach target size',
    annotations: '// Generated test code markers',
  },
};
