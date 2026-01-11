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

## 4. Advanced Patterns ✅

### Jobs:
- [x] Implement request retries with backoff
- [x] Add request timeouts
- [x] Implement request caching
- [x] Handle rate limiting responses
- [x] Add request/response logging

### Patterns (5):
- `http-retries.mdx` - Retry HTTP Requests with Backoff
- `http-timeouts.mdx` - Add Timeouts to HTTP Requests
- `http-caching.mdx` - Cache HTTP Responses
- `http-rate-limit-handling.mdx` - Handle Rate Limiting Responses
- `http-logging.mdx` - Log HTTP Requests and Responses

---

## Summary

| Category | Jobs | Covered | Gaps |
|----------|------|---------|------|
| Getting Started | 3 | 2 | 0 |
| Request Types | 3 | 1 | 0 |
| Architecture | 3 | 3 | 0 |
| Advanced Patterns | 5 | 5 | 0 |
| **Total** | **14** | **11** | **0** |

### Coverage: 100%

