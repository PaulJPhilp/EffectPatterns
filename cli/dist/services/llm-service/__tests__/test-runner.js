/**
 * Test configuration for LLM service
 */
export const testConfig = {
    timeout: 30000,
    retries: 2,
    parallel: false, // Set to true for faster execution
    providers: {
        google: {
            enabled: true,
            models: ["gemini-2.0-flash", "gemini-2.5-flash"],
            apiKey: process.env.GOOGLE_API_KEY
        },
        openai: {
            enabled: true,
            models: ["gpt-4o-mini", "gpt-3.5-turbo"],
            apiKey: process.env.OPENAI_API_KEY
        },
        anthropic: {
            enabled: true,
            models: ["claude-3-haiku", "claude-3-sonnet"],
            apiKey: process.env.ANTHROPIC_API_KEY
        }
    },
    skipPatterns: {
        api: !process.env.GOOGLE_API_KEY && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY,
        network: process.env.CI === "true",
        expensive: process.env.SKIP_EXPENSIVE === "true"
    }
};
/**
 * Test execution utilities
 */
export class TestRunner {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            suites: []
        };
    }
    async runTest(test) {
        const start = Date.now();
        try {
            await test.run();
            return {
                name: test.name,
                status: "passed",
                duration: Date.now() - start
            };
        }
        catch (error) {
            return {
                name: test.name,
                status: "failed",
                error: error,
                duration: Date.now() - start
            };
        }
    }
    async runSuite(suite) {
        const start = Date.now();
        const suiteResult = {
            name: suite.name,
            tests: [],
            duration: 0
        };
        console.log(`\n🧪 Running test suite: ${suite.name}`);
        for (const test of suite.tests) {
            const result = await this.runTest(test);
            suiteResult.tests.push(result);
            const statusIcon = result.status === "passed" ? "✅" : "❌";
            console.log(`  ${statusIcon} ${result.name} (${result.duration}ms)`);
            if (result.error) {
                console.log(`    Error: ${result.error.message}`);
            }
        }
        suiteResult.duration = Date.now() - start;
        return suiteResult;
    }
    async runAll(suites) {
        const start = Date.now();
        console.log("🚀 Starting LLM Service Test Suite");
        console.log("=".repeat(50));
        for (const suite of suites) {
            const suiteResult = await this.runSuite(suite);
            this.results.suites.push(suiteResult);
            // Update overall results
            this.results.total += suiteResult.tests.length;
            this.results.passed += suiteResult.tests.filter(t => t.status === "passed").length;
            this.results.failed += suiteResult.tests.filter(t => t.status === "failed").length;
            this.results.skipped += suiteResult.tests.filter(t => t.status === "skipped").length;
        }
        this.results.duration = Date.now() - start;
        return this.results;
    }
    printResults() {
        console.log("\n" + "=".repeat(50));
        console.log("📊 Test Results Summary");
        console.log("=".repeat(50));
        console.log(`Total Tests: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⏭️  Skipped: ${this.results.skipped}`);
        console.log(`⏱️  Duration: ${this.results.duration}ms`);
        if (this.results.failed > 0) {
            console.log("\n❌ Failed Tests:");
            this.results.suites.forEach(suite => {
                const failedTests = suite.tests.filter(t => t.status === "failed");
                if (failedTests.length > 0) {
                    console.log(`  ${suite.name}:`);
                    failedTests.forEach(test => {
                        console.log(`    ❌ ${test.name}: ${test.error?.message}`);
                    });
                }
            });
        }
        console.log("\n" + "=".repeat(50));
    }
}
/**
 * Test utilities
 */
export const testUtils = {
    /**
     * Check if a test should be skipped
     */
    shouldSkip(condition, reason) {
        if (condition) {
            console.log(`⏭️  Skipping: ${reason}`);
            return true;
        }
        return false;
    },
    /**
     * Create a test case
     */
    createTest(name, run, options) {
        return {
            name,
            run: options?.skip ? async () => {
                throw new Error(options.skipReason || "Test skipped");
            } : run,
            timeout: options?.timeout,
            retries: options?.retries
        };
    },
    /**
     * Wait for a specified duration
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    /**
     * Retry a function with exponential backoff
     */
    async retry(fn, retries = 3, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            }
            catch (error) {
                if (i === retries - 1)
                    throw error;
                await this.sleep(delay * Math.pow(2, i));
            }
        }
        throw new Error("Retry failed");
    }
};
/**
 * Environment validation
 */
export const envValidation = {
    checkApiKeys() {
        const requiredKeys = [
            { name: "GOOGLE_API_KEY", present: !!process.env.GOOGLE_API_KEY },
            { name: "OPENAI_API_KEY", present: !!process.env.OPENAI_API_KEY },
            { name: "ANTHROPIC_API_KEY", present: !!process.env.ANTHROPIC_API_KEY }
        ];
        const missing = requiredKeys.filter(k => !k.present).map(k => k.name);
        return {
            valid: missing.length === 0,
            missing
        };
    },
    printEnvStatus() {
        console.log("🔑 Environment Status:");
        console.log(`GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? "✅" : "❌"}`);
        console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "✅" : "❌"}`);
        console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? "✅" : "❌"}`);
    }
};
// Export singleton instance
export const runner = new TestRunner();
