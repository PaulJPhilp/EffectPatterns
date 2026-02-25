/**
 * Health Check Endpoint
 *
 * GET /api/health
 * Returns service health status, version, and environment.
 *
 * GET /api/health?deep=true
 * Also runs a lightweight DB check and returns database: "ok" | "error";
 * returns 503 if the database check fails.
 *
 * Lightweight health check (no query) does not require database or tracing
 * to avoid crashes during cold starts or connection issues.
 */

import { createDatabase } from "@effect-patterns/toolkit"
import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import pkg from "../../../package.json" with { type: "json" }

const SERVICE_NAME = "effect-patterns-mcp-server"
const SERVICE_VERSION = pkg.version

function getEnvironment(): string {
  return (
    process.env.VERCEL_ENV ??
    process.env.APP_ENV ??
    "development"
  )
}

export async function GET(request: Request) {
  const traceId = randomUUID()
  const url = new URL(request.url)
  const deep = url.searchParams.get("deep") === "true"

  try {
    const baseResult = {
      ok: true,
      version: SERVICE_VERSION,
      service: SERVICE_NAME,
      environment: getEnvironment(),
      timestamp: new Date().toISOString(),
      traceId,
    }

    if (!deep) {
      return NextResponse.json(baseResult, {
        status: 200,
        headers: { "x-trace-id": traceId },
      })
    }

    let database: "ok" | "error" = "error"
    try {
      const { db, close } = createDatabase()
      try {
        await db.execute(sql`SELECT 1`)
        database = "ok"
      } finally {
        await close()
      }
    } catch (_dbError) {
      database = "error"
    }

    const result = {
      ...baseResult,
      ok: database === "ok",
      database,
    }
    const status = database === "ok" ? 200 : 503

    return NextResponse.json(result, {
      status,
      headers: { "x-trace-id": traceId },
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: String(error),
        version: SERVICE_VERSION,
        service: SERVICE_NAME,
        environment: getEnvironment(),
        timestamp: new Date().toISOString(),
        traceId,
      },
      {
        status: 500,
        headers: { "x-trace-id": traceId },
      }
    )
  }
}
