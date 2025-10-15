import { Schema } from '@effect/schema';
import { type NextRequest, NextResponse } from 'next/server';
import { SearchPatternsRequest } from '../../../packages/toolkit/src/schemas/generate';

const validate = Schema.decodeUnknownSync(SearchPatternsRequest);

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.PATTERN_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  try {
    const validated = validate(body);
    return NextResponse.json({ patterns: [], count: 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
