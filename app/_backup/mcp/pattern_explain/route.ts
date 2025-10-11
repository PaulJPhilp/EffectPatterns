import { NextRequest, NextResponse } from 'next/server';
import { Schema } from '@effect/schema';
import { ExplainPatternRequest } from '../../../packages/toolkit/src/schemas/generate';

const validate = Schema.decodeUnknownSync(ExplainPatternRequest);

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.PATTERN_API_KEY}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    try {
        const validated = validate(body);
        return NextResponse.json({ pattern: {} });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
