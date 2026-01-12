/**
 * Environment variable check endpoint
 */

import { NextResponse } from "next/server"

export async function GET() {
	const envVars = {
		hasDatabaseUrl: !!process.env.DATABASE_URL,
		databaseUrlLength: process.env.DATABASE_URL?.length || 0,
		databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) || "not set",
		allEnvKeys: Object.keys(process.env).filter(k =>
			k.includes("DATABASE") ||
			k.includes("POSTGRES") ||
			k.includes("PG")
		)
	}

	return NextResponse.json(envVars)
}
