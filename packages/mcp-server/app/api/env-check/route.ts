/**
 * Environment variable check endpoint
 *
 * Returns non-sensitive env presence only. Do not expose lengths, prefixes, or key names.
 */

import { NextResponse } from "next/server";

export async function GET() {
	const envVars = {
		hasDatabaseUrl: !!process.env.DATABASE_URL,
		nodeEnv: process.env.NODE_ENV || "not set",
		customNodeEnv: process.env.CUSTOM_NODE_ENV || "not set",
		hasApiKey: !!process.env.PATTERN_API_KEY,
	};

	return NextResponse.json(envVars);
}
