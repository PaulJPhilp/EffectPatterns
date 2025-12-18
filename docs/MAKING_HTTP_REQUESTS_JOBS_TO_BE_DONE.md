# Making HTTP Requests Jobs-to-be-Done

## What is this?

This document lists the **jobs** a developer needs to accomplish when making HTTP requests with Effect. We audit patterns against these jobs to find gaps.

---

## 1. Getting Started ✅

### Jobs:
- [x] Make a simple GET request
- [x] Parse JSON responses
- [x] Handle HTTP errors

### Patterns (2):
- `http-hello-world.mdx` - Your First HTTP Request
- `http-json-responses.mdx` - Parse JSON Responses Safely

---

## 2. Request Types ✅

### Jobs:
- [x] Make GET, POST, PUT, DELETE requests
- [x] Send request bodies
- [x] Set headers

### Patterns (1):
- `http-hello-world.mdx` - Your First HTTP Request (covers all methods)

---

## 3. Architecture ✅

### Jobs:
- [x] Model HTTP client as a service
- [x] Create testable HTTP clients
- [x] Build an HTTP server

### Patterns (3):
- `model-dependencies.mdx` - Model Dependencies as Services
- `testable-client.mdx` - Create a Testable HTTP Client Service
- `basic-server.mdx` - Build a Basic HTTP Server

---

## 4. Advanced Patterns

### Jobs:
- [ ] Implement request retries with backoff
- [ ] Add request timeouts
- [ ] Implement request caching
- [ ] Handle rate limiting responses
- [ ] Add request/response logging

### Gap Analysis:
These patterns would enhance HTTP handling:
- Retry policies for HTTP requests
- Timeout configuration
- Response caching strategies
- Rate limit handling (429 responses)
- Request/response logging middleware

---

## Summary

| Category | Jobs | Covered | Gaps |
|----------|------|---------|------|
| Getting Started | 3 | 2 | 0 |
| Request Types | 3 | 1 | 0 |
| Architecture | 3 | 3 | 0 |
| Advanced Patterns | 5 | 0 | 5 |
| **Total** | **14** | **6** | **5** |

### Coverage: 64%

Core HTTP patterns are covered. Advanced patterns (retries, timeouts, caching) could be added.

