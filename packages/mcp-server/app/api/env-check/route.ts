/**
 * Environment variable check endpoint
 *
 * Returns non-sensitive env presence only. Do not expose lengths, prefixes, or key names.
 */

import { Effect } from "effect";
import type { NextRequest } from "next/server";
import { createSimpleHandler } from "../../../src/server/routeHandler";

const handleEnvCheck = (_request: NextRequest) =>
  Effect.succeed({
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV || "not set",
    customNodeEnv: process.env.CUSTOM_NODE_ENV || "not set",
    hasApiKey: !!process.env.PATTERN_API_KEY,
  });

export const GET = createSimpleHandler(handleEnvCheck, {
  requireAuth: false,
  requireAdmin: true,
});
