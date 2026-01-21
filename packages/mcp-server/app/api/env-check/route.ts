/**
 * Environment variable check endpoint
 */

import { NextResponse } from "next/server";

export async function GET() {
	const envVars = {
		hasDatabaseUrl: !!process.env.DATABASE_URL,
		databaseUrlLength: process.env.DATABASE_URL?.length || 0,
		databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) || "not set",
		nodeEnv: process.env.NODE_ENV || "not set",
		customNodeEnv: process.env.CUSTOM_NODE_ENV || "not set",
		hasApiKey: !!process.env.PATTERN_API_KEY,
		apiKeyLength: process.env.PATTERN_API_KEY?.length || 0,
		allEnvKeys: Object.keys(process.env).filter(
			(k) =>
				k.includes("DATABASE") ||
				k.includes("POSTGRES") ||
				k.includes("PG") ||
				k.includes("NODE_ENV") ||
				k.includes("CUSTOM_NODE_ENV") ||
				k.includes("PATTERN_API_KEY"),
		),
	};

	return NextResponse.json(envVars);
}
