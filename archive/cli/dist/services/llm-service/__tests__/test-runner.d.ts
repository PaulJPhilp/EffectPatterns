/**
 * Comprehensive test runner for LLM service
 * Coordinates all test suites and provides utilities
 */
export interface TestSuite {
    name: string;
    tests: TestCase[];
}
export interface TestCase {
    name: string;
    run: () => Promise<void>;
    timeout?: number;
    retries?: number;
}
export interface TestResults {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    suites: SuiteResult[];
}
export interface SuiteResult {
    name: string;
    tests: TestResult[];
    duration: number;
}
export interface TestResult {
    name: string;
    status: "passed" | "failed" | "skipped";
    error?: Error;
    duration: number;
}
/**
 * Test configuration for LLM service
 */
export declare const testConfig: {
    timeout: number;
    retries: number;
    parallel: boolean;
    providers: {
        google: {
            enabled: boolean;
            models: string[];
            apiKey: string;
        };
        openai: {
            enabled: boolean;
            models: string[];
            apiKey: string;
        };
        anthropic: {
            enabled: boolean;
            models: string[];
            apiKey: string;
        };
    };
    skipPatterns: {
        api: boolean;
        network: boolean;
        expensive: boolean;
    };
};
/**
 * Test execution utilities
 */
export declare class TestRunner {
    private results;
    runTest(test: TestCase): Promise<TestResult>;
    runSuite(suite: TestSuite): Promise<SuiteResult>;
    runAll(suites: TestSuite[]): Promise<TestResults>;
    printResults(): void;
}
/**
 * Test utilities
 */
export declare const testUtils: {
    /**
     * Check if a test should be skipped
     */
    shouldSkip(condition: boolean, reason: string): boolean;
    /**
     * Create a test case
     */
    createTest(name: string, run: () => Promise<void>, options?: {
        timeout?: number;
        retries?: number;
        skip?: boolean;
        skipReason?: string;
    }): TestCase;
    /**
     * Wait for a specified duration
     */
    sleep(ms: number): Promise<void>;
    /**
     * Retry a function with exponential backoff
     */
    retry<T>(fn: () => Promise<T>, retries?: number, delay?: number): Promise<T>;
};
/**
 * Environment validation
 */
export declare const envValidation: {
    checkApiKeys(): {
        valid: boolean;
        missing: string[];
    };
    printEnvStatus(): void;
};
export declare const runner: TestRunner;
//# sourceMappingURL=test-runner.d.ts.map