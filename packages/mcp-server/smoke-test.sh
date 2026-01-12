#!/usr/bin/env bash

#
# Smoke Test Suite for Effect Patterns MCP Server
#
# Usage:
#   ./smoke-test.sh <BASE_URL> <API_KEY>
#
# Example:
#   ./smoke-test.sh https://effect-patterns-mcp-server.vercel.app staging-api-key
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Arguments
BASE_URL="${1:-http://localhost:3000}"
API_KEY="${2:-test-api-key}"

# Remove trailing slash from BASE_URL
BASE_URL="${BASE_URL%/}"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print colored output
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}TEST: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Function to run a test
run_test() {
    local test_name="$1"
    local curl_cmd="$2"
    local expected_status="${3:-200}"
    local assertion="${4:-}"

    TESTS_RUN=$((TESTS_RUN + 1))
    print_test "$test_name"

    # Run curl and capture response
    local response
    local http_code

    response=$(eval "$curl_cmd" 2>&1) || true
    http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | sed '$d')

    # Check HTTP status code
    if [ "$http_code" != "$expected_status" ]; then
        print_error "Expected status $expected_status, got $http_code"
        print_info "Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi

    # Run custom assertion if provided
    if [ -n "$assertion" ]; then
        if ! eval "$assertion" <<< "$body"; then
            print_error "Assertion failed: $assertion"
            print_info "Response: $body"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    fi

    print_success "Passed"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
}

# Start smoke tests
print_header "Starting Smoke Tests"
print_info "Base URL: $BASE_URL"
print_info "API Key: ${API_KEY:0:10}..."

#
# Test 1: Health Check (No Auth)
#
run_test \
    "Health check endpoint (no auth required)" \
    "curl -s -w '\n%{http_code}' '$BASE_URL/api/health'" \
    "200" \
    "jq -e '.ok == true and .service == \"effect-patterns-mcp-server\"'"

#
# Test 2: Health Check Contains Version
#
run_test \
    "Health check contains version" \
    "curl -s -w '\n%{http_code}' '$BASE_URL/api/health'" \
    "200" \
    "jq -e '.version != null'"

#
# Test 3: Health Check Contains Trace ID
#
run_test \
    "Health check includes trace ID in body" \
    "curl -s -w '\n%{http_code}' '$BASE_URL/api/health'" \
    "200" \
    "jq -e '.traceId != null and (.traceId | length) > 0'"

#
# Test 4: Health Check Trace ID in Header
#
run_test \
    "Health check includes trace ID in header" \
    "curl -s -D /dev/stderr '$BASE_URL/api/health' 2>&1 | grep -i 'x-trace-id'" \
    "200"

#
# Test 5: Patterns Endpoint Requires Auth
#
run_test \
    "Patterns endpoint requires authentication" \
    "curl -s -w '\n%{http_code}' '$BASE_URL/api/patterns'" \
    "401"

#
# Test 6: Patterns with Invalid API Key
#
run_test \
    "Patterns endpoint rejects invalid API key" \
    "curl -s -w '\n%{http_code}' -H 'x-api-key: invalid-key' '$BASE_URL/api/patterns'" \
    "401"

#
# Test 7: Patterns with Valid API Key
#
run_test \
    "Patterns endpoint accepts valid API key (header)" \
    "curl -s -w '\n%{http_code}' -H 'x-api-key: $API_KEY' '$BASE_URL/api/patterns'" \
    "200" \
    "jq -e '.patterns != null and (.patterns | length) > 0'"

#
# Test 8: Patterns with Query Parameter Auth
#
run_test \
    "Patterns endpoint accepts valid API key (query)" \
    "curl -s -w '\n%{http_code}' '$BASE_URL/api/patterns?key=$API_KEY'" \
    "200" \
    "jq -e '.count != null and .count > 0'"

#
# Test 9: Patterns Search Query
#
run_test \
    "Patterns endpoint supports search query" \
    "curl -s -w '\n%{http_code}' -H 'x-api-key: $API_KEY' '$BASE_URL/api/patterns?q=retry'" \
    "200" \
    "jq -e '.patterns != null'"

#
# Test 10: Patterns Filter by Category
#
run_test \
    "Patterns endpoint supports category filter" \
    "curl -s -w '\n%{http_code}' -H 'x-api-key: $API_KEY' '$BASE_URL/api/patterns?category=error-handling'" \
    "200" \
    "jq -e '.patterns != null'"

#
# Test 11: Patterns Limit Results
#
run_test \
    "Patterns endpoint respects limit parameter" \
    "curl -s -w '\n%{http_code}' -H 'x-api-key: $API_KEY' '$BASE_URL/api/patterns?limit=1'" \
    "200" \
    "jq -e '.patterns | length <= 1'"

#
# Test 12: Get Pattern by ID Requires Auth
#
run_test \
    "Get pattern by ID requires authentication" \
    "curl -s -w '\n%{http_code}' '$BASE_URL/api/patterns/retry-with-backoff'" \
    "401"

#
# Test 13: Get Pattern by ID
#
run_test \
    "Get pattern by ID returns pattern or 404" \
    "curl -s -w '\n%{http_code}' -H 'x-api-key: $API_KEY' '$BASE_URL/api/patterns/retry-with-backoff'" \
    "200|404"

#
# Test 14: Get Non-existent Pattern
#
run_test \
    "Get non-existent pattern returns 404" \
    "curl -s -w '\n%{http_code}' -H 'x-api-key: $API_KEY' '$BASE_URL/api/patterns/nonexistent-pattern-id'" \
    "404" \
    "jq -e '.error != null'"

#
# Test 15: Generate Endpoint Requires Auth
#
run_test \
    "Generate endpoint requires authentication" \
    "curl -s -w '\n%{http_code}' -X POST -H 'Content-Type: application/json' -d '{\"patternId\":\"retry-with-backoff\"}' '$BASE_URL/api/generate'" \
    "401"

#
# Test 16: Generate Snippet
#
run_test \
    "Generate snippet from pattern" \
    "curl -s -w '\n%{http_code}' -X POST -H 'x-api-key: $API_KEY' -H 'Content-Type: application/json' -d '{\"patternId\":\"retry-with-backoff\"}' '$BASE_URL/api/generate'" \
    "200|404"

#
# Test 17: Generate with Custom Name
#
run_test \
    "Generate snippet with custom name" \
    "curl -s -w '\n%{http_code}' -X POST -H 'x-api-key: $API_KEY' -H 'Content-Type: application/json' -d '{\"patternId\":\"retry-with-backoff\",\"name\":\"myRetry\"}' '$BASE_URL/api/generate'" \
    "200|404"

#
# Test 18: Generate with CJS Module Type
#
run_test \
    "Generate snippet with CJS module type" \
    "curl -s -w '\n%{http_code}' -X POST -H 'x-api-key: $API_KEY' -H 'Content-Type: application/json' -d '{\"patternId\":\"retry-with-backoff\",\"moduleType\":\"cjs\"}' '$BASE_URL/api/generate'" \
    "200|404"

#
# Test 19: Generate Invalid Request (Missing patternId)
#
run_test \
    "Generate endpoint validates request body" \
    "curl -s -w '\n%{http_code}' -X POST -H 'x-api-key: $API_KEY' -H 'Content-Type: application/json' -d '{\"name\":\"test\"}' '$BASE_URL/api/generate'" \
    "400" \
    "jq -e '.error != null'"

#
# Test 20: Trace Wiring Endpoint Requires Auth
#
run_test \
    "Trace wiring endpoint requires authentication" \
    "curl -s -w '\n%{http_code}' '$BASE_URL/api/trace-wiring'" \
    "401"

#
# Test 21: Trace Wiring Returns Examples
#
run_test \
    "Trace wiring endpoint returns examples" \
    "curl -s -w '\n%{http_code}' -H 'x-api-key: $API_KEY' '$BASE_URL/api/trace-wiring'" \
    "200" \
    "jq -e '.effectNodeSdk != null and .effectWithSpan != null and .langgraphPython != null'"

#
# Test 22: Trace Wiring Contains Effect Example
#
run_test \
    "Trace wiring includes Effect.js example" \
    "curl -s -w '\n%{http_code}' -H 'x-api-key: $API_KEY' '$BASE_URL/api/trace-wiring'" \
    "200" \
    "jq -e '.effectNodeSdk | contains(\"Effect\")'"

#
# Test 23: All Endpoints Return Trace ID
#
run_test \
    "All endpoints include trace ID" \
    "curl -s -w '\n%{http_code}' -H 'x-api-key: $API_KEY' '$BASE_URL/api/patterns'" \
    "200" \
    "jq -e '.traceId != null'"

#
# Test 24: CORS Headers (if applicable)
#
print_test "Check CORS headers"
cors_header=$(curl -s -I -H "Origin: https://example.com" "$BASE_URL/api/health" | grep -i "access-control-allow-origin" || echo "")
if [ -n "$cors_header" ]; then
    print_success "CORS headers present"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_info "No CORS headers (may be expected)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
TESTS_RUN=$((TESTS_RUN + 1))

#
# Test 25: Response Time Check
#
print_test "Response time check (< 2 seconds)"
start_time=$(date +%s)
curl -s -o /dev/null -H "x-api-key: $API_KEY" "$BASE_URL/api/patterns"
end_time=$(date +%s)
response_time=$((end_time - start_time))

if [ $response_time -lt 2 ]; then
    print_success "Response time: ${response_time}s"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Response time too slow: ${response_time}s"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_RUN=$((TESTS_RUN + 1))

# Summary
print_header "Test Summary"
echo "Total Tests: $TESTS_RUN"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All smoke tests passed!${NC}\n"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed${NC}\n"
    exit 1
fi
