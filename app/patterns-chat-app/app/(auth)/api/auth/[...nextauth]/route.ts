import type { NextRequest } from "next/server";
import { GET as authGET, POST as authPOST } from "@/app/(auth)/auth";

// Wrap handlers to match Next.js 16 route handler signature
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  // Type cast to work around next-auth bundling its own Next.js types
  return authGET(request as any);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  // Type cast to work around next-auth bundling its own Next.js types
  return authPOST(request as any);
}
