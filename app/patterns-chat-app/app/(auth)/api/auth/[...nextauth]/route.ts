import type { NextRequest } from "next/server";
import { GET as authGET, POST as authPOST } from "@/app/(auth)/auth";

// Wrap handlers to match Next.js 16 route handler signature
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  return authGET(request);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  return authPOST(request);
}
