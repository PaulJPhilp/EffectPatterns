import { NextRequest, NextResponse } from 'next/server';
import { Schema } from '@effect/schema';
import { GenerateRequest } from '../../../packages/toolkit/src/schemas/generate';

const validate = Schema.decodeUnknownSync(GenerateRequest);

export async function POST(req: NextRequest) {
    console.log('Incoming headers:', req.headers);

    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.PATTERN_API_KEY}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    try {
        const validated = validate(body);
        const response = {
            patternId: validated.patternId,
            title: 'Generated Pattern',
            snippet: '// Generated code',
            traceId: '123',
            templateUri: '/resources/snippet?traceId=123'
        };
        const res = NextResponse.json(response, { headers: { 'x-trace-id': '123' } });
        console.log('Outgoing headers:', res.headers);
        return res;
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
