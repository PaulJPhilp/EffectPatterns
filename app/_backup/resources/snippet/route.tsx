import { type NextRequest, NextResponse } from 'next/server';

export function GET(req: NextRequest) {
  return new NextResponse('<h1>Snippet Widget</h1>', {
    headers: {
      'Content-Type': 'text/html',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; frame-ancestors 'self' https://chat.openai.com;",
      'X-Frame-Options': 'ALLOW-FROM https://chat.openai.com',
    },
  });
}
