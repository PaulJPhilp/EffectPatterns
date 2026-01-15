/**
 * Next.js Middleware for MCP Server
 *
 * Handles:
 * - Request size validation (early rejection of oversized payloads)
 * - API versioning with deprecation warnings
 * - Security headers
 * - Request ID generation for correlation
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Matcher for API routes
 */
export const config = {
  matcher: "/api/:path*",
};

/**
 * Maximum request body size in bytes
 * Default: 1MB (same as MAX_REQUEST_BODY_SIZE config)
 * Early rejection prevents processing of oversized requests
 */
const MAX_REQUEST_SIZE = parseInt(
  process.env.MAX_REQUEST_BODY_SIZE || "1048576",
  10
);

/**
 * API endpoints that are versioned (v1)
 * These have been reviewed and standardized
 */
const versionedEndpoints = [
  "/api/health",
  "/api/patterns",
  "/api/analyze-code",
  "/api/list-rules",
  "/api/review-code",
  "/api/list-fixes",
  "/api/generate",
  "/api/generate-pattern",
  "/api/apply-refactoring",
  "/api/analyze-consistency",
  "/api/trace-wiring",
  "/api/db-check",
  "/api/env-check",
  "/api/test",
  "/api/migrate",
  "/api/reset-db",
  "/api/simple-reset",
  "/api/final-reset",
  "/api/migrate-final",
];

/**
 * Check if endpoint is versioned
 */
function isVersionedEndpoint(pathname: string): boolean {
  // Remove trailing slashes and match exact endpoints
  const cleanPath = pathname.replace(/\/$/, "");
  return versionedEndpoints.some((endpoint) =>
    cleanPath === endpoint || cleanPath.startsWith(endpoint + "/")
  );
}

/**
 * Main middleware function
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const contentLength = request.headers.get("content-length");

  // Early request size validation (413 Payload Too Large)
  if (contentLength) {
    const size = parseInt(contentLength, 10);

    if (!isNaN(size) && size > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        {
          error: "Payload Too Large",
          status: "payload_too_large",
          maxSize: MAX_REQUEST_SIZE,
          actualSize: size,
          details: `Request body exceeds maximum size of ${MAX_REQUEST_SIZE} bytes`,
        },
        {
          status: 413,
          headers: {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
          },
        }
      );
    }
  }

  let response = NextResponse.next();

  // Add API version header
  if (isVersionedEndpoint(pathname)) {
    response.headers.set("X-API-Version", "1.0");
    response.headers.set("X-API-Stability", "stable");
  } else {
    response.headers.set("X-API-Version", "0.1");
    response.headers.set("X-API-Stability", "experimental");
    response.headers.set(
      "X-API-Deprecation-Warning",
      'Unversioned API endpoints are deprecated. Use /api/v1/* for stable endpoints.'
    );
  }

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Add request ID for correlation (will be replaced by route handlers)
  if (!request.headers.has("x-request-id")) {
    const requestId = crypto.randomUUID?.() || `req-${Date.now()}`;
    response.headers.set("X-Request-ID", requestId);
  }

  return response;
}
