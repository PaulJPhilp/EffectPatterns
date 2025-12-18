# Building APIs Jobs-to-be-Done

## What is this?

This document lists the **jobs** a developer needs to accomplish when building HTTP APIs with Effect. We audit patterns against these jobs to find gaps.

---

## 1. Server Setup ✅

### Jobs:
- [x] Create a basic HTTP server
- [x] Set up routing

### Patterns (1):
- `create-server.mdx` - Create a Basic HTTP Server

---

## 2. Handling Requests ✅

### Jobs:
- [x] Handle GET requests
- [x] Extract path parameters
- [x] Validate request bodies

### Patterns (3):
- `handle-get.mdx` - Handle a GET Request
- `extract-path-params.mdx` - Extract Path Parameters
- `validate-body.mdx` - Validate Request Body

---

## 3. Sending Responses ✅

### Jobs:
- [x] Send JSON responses
- [x] Handle API errors gracefully

### Patterns (2):
- `send-json.mdx` - Send a JSON Response
- `handle-api-errors.mdx` - Handle API Errors

---

## 4. Dependencies ✅

### Jobs:
- [x] Provide dependencies to routes
- [x] Make HTTP client requests from server

### Patterns (2):
- `provide-dependencies.mdx` - Provide Dependencies to Routes
- `http-client-request.mdx` - Make an Outgoing HTTP Client Request

---

## 5. Advanced API Patterns ✅

### Jobs:
- [x] Implement authentication/authorization
- [x] Add rate limiting
- [x] Add request validation middleware
- [x] Implement CORS
- [x] Add OpenAPI documentation

### Patterns (5):
- `api-authentication.mdx` - Implement API Authentication
- `api-rate-limiting.mdx` - Add Rate Limiting to APIs
- `api-middleware.mdx` - Compose API Middleware
- `api-cors.mdx` - Configure CORS for APIs
- `api-openapi.mdx` - Generate OpenAPI Documentation

---

## Summary

| Category | Jobs | Covered | Gaps |
|----------|------|---------|------|
| Server Setup | 2 | 1 | 0 |
| Handling Requests | 3 | 3 | 0 |
| Sending Responses | 2 | 2 | 0 |
| Dependencies | 2 | 2 | 0 |
| Advanced API Patterns | 5 | 5 | 0 |
| **Total** | **14** | **13** | **0** |

### Coverage: 100%

API patterns are now fully covered.

