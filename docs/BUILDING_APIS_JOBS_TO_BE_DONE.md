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

## 5. Advanced API Patterns

### Jobs:
- [ ] Implement authentication/authorization
- [ ] Add rate limiting
- [ ] Add request validation middleware
- [ ] Implement CORS
- [ ] Add OpenAPI documentation

### Gap Analysis:
These patterns would complete the API development story:
- JWT/session authentication
- Rate limiting with Schedule
- Middleware composition
- CORS configuration
- Auto-generated OpenAPI specs

---

## Summary

| Category | Jobs | Covered | Gaps |
|----------|------|---------|------|
| Server Setup | 2 | 1 | 0 |
| Handling Requests | 3 | 3 | 0 |
| Sending Responses | 2 | 2 | 0 |
| Dependencies | 2 | 2 | 0 |
| Advanced API Patterns | 5 | 0 | 5 |
| **Total** | **14** | **8** | **5** |

### Coverage: 67%

Core API patterns are well covered. Advanced patterns (auth, rate limiting, middleware) could be added.

