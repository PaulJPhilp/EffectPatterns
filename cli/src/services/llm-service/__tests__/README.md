# LLM Service Test Suite

A comprehensive test suite for the LLM service without using mocks. Tests are designed to work with real API calls to validate the complete functionality.

## 📁 Test Structure

```
__tests__/
├── service.test.ts           # Main service function tests
├── api.test.ts              # API interface tests
├── errors.test.ts           # Error handling tests
├── types.test.ts            # Type validation tests
├── test-helpers.ts          # Test utilities and helpers
├── test-runner.ts           # Comprehensive test runner
├── README.md               # This documentation
└── prompts/                # Stored test prompts
    ├── basic-prompt.mdx
    ├── complex-prompt.mdx
    ├── streaming-prompt.mdx
    └── object-generation-prompt.mdx
```

## 🚀 Quick Start

### Prerequisites

Set up your API keys:

```bash
# Google AI
export GOOGLE_API_KEY="your-google-api-key"

# OpenAI
export OPENAI_API_KEY="your-openai-api-key"

# Anthropic
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test service.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Using the Test Runner

```typescript
import { runner, envValidation } from './test-runner';

// Check environment
envValidation.printEnvStatus();

// Run tests programmatically
const results = await runner.runAll([
  {
    name: "Service Tests",
    tests: [...]
  }
]);

runner.printResults();
```

## 🧪 Test Categories

### Service Tests (`service.test.ts`)
Tests for core service functions:
- `generateText()` - Text generation with all providers
- `generateObject()` - Structured object generation
- `streamText()` - Streaming text generation
- `processPromptFromText()` - Text prompt processing
- `processPromptFromMdx()` - MDX content processing

### API Tests (`api.test.ts`)
Tests for API interface consistency:
- Function signature verification
- API integration testing
- Workflow testing
- Error handling

### Error Tests (`errors.test.ts`)
Tests for error handling:
- Error type creation and structure
- Error propagation
- Error recovery
- Logging utilities

### Type Tests (`types.test.ts`)
Tests for type safety:
- Provider type validation
- Model type validation
- Type safety across providers
- Edge case handling

## 📋 Test Configuration

### Environment Variables

```bash
# API Keys (required for live testing)
GOOGLE_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here

# Test Configuration
SKIP_EXPENSIVE=true    # Skip expensive tests
CI=true               # Skip network tests in CI
```

### Test Timeouts

- Default timeout: 30 seconds
- API calls: 30 seconds
- Streaming tests: 45 seconds
- Complex operations: 60 seconds

## 🎯 Test Data

### Stored Prompts

Located in `prompts/` directory:

1. **basic-prompt.mdx** - Simple test prompt
2. **complex-prompt.mdx** - Multi-section complex prompt
3. **streaming-prompt.mdx** - Streaming-specific prompt
4. **object-generation-prompt.mdx** - JSON object generation prompt

### Test Helpers

Available in `test-helpers.ts`:
- Test data generators
- Mock data structures
- Validation utilities
- Error matchers

## 🔧 Utilities

### Test Utilities

```typescript
// Test data
import { testData } from './test-helpers';
const validMdx = testData.validMdx('google', 'gemini-2.0-flash');

// Error checking
import { errorMatchers } from './test-helpers';
expect(errorMatchers.isInvalidMdxFormatError(error)).toBe(true);

// Configuration
import { testConfig } from './test-helpers';
console.log(testConfig.providers.google.models);
```

### Environment Validation

```typescript
import { envValidation } from './test-runner';

// Check API keys
const status = envValidation.checkApiKeys();
console.log(status.valid, status.missing);

// Print environment status
envValidation.printEnvStatus();
```

## 🚨 Error Handling

### Common Errors

1. **Missing API Keys**
   - Error: Tests fail with authentication errors
   - Solution: Set required environment variables

2. **Rate Limiting**
   - Error: Tests timeout or return rate limit errors
   - Solution: Add delays between tests or use test accounts

3. **Network Issues**
   - Error: Connection timeouts
   - Solution: Increase timeout values or skip network tests

### Error Recovery

Tests include retry logic with exponential backoff:

```typescript
import { testUtils } from './test-runner';

await testUtils.retry(async () => {
  return await generateText("test prompt", "google", "gemini-2.0-flash");
}, 3, 1000);
```

## 📊 Test Results

### Output Format

```
🚀 Starting LLM Service Test Suite
==================================================
🧪 Running test suite: Service Tests
  ✅ should generate text with valid provider and model (1234ms)
  ✅ should handle invalid provider gracefully (567ms)
  ❌ should handle empty prompt (timeout)

📊 Test Results Summary
==================================================
Total Tests: 45
✅ Passed: 42
❌ Failed: 2
⏭️  Skipped: 1
⏱️  Duration: 45234ms

❌ Failed Tests:
  Service Tests:
    should handle empty prompt: Request timeout
```

## 🔄 Continuous Integration

### GitHub Actions

```yaml
name: LLM Service Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
        env:
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## 📈 Performance Testing

### Benchmarking

Tests include performance benchmarks:
- Response time measurement
- Token usage tracking
- Cost estimation
- Rate limit monitoring

### Load Testing

```typescript
// Concurrent request testing
const promises = Array(10).fill(null).map(() => 
  generateText("load test", "google", "gemini-2.0-flash")
);
const results = await Promise.all(promises);
```

## 🛡️ Security

### API Key Management

- Never commit API keys to repository
- Use environment variables for sensitive data
- Implement key rotation strategies

### Safe Testing

- Tests use real API calls with actual costs
- Implement spending limits
- Monitor usage during testing

## 🤝 Contributing

### Adding New Tests

1. Create test file in `__tests__/` directory
2. Follow existing test patterns
3. Add appropriate test data
4. Update documentation

### Test Guidelines

- No mocks - use real API calls
- Include error handling tests
- Add performance benchmarks
- Document test requirements

## 📞 Support

For issues or questions:
1. Check environment variables
2. Verify API key permissions
3. Review test logs
4. Check rate limits
5. Consult service documentation
