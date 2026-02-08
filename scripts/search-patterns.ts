#!/usr/bin/env bun

const query = process.argv[2];
const limitArg = process.argv[3];
const limit = limitArg ? Number(limitArg) : 5;

if (!query) {
  console.error('Usage: bun ./scripts/search-patterns.ts <query> [limit]');
  process.exit(1);
}

if (Number.isNaN(limit) || limit <= 0) {
  console.error('Limit must be a positive number.');
  process.exit(1);
}

const baseUrl = process.env.EFFECT_PATTERNS_API_URL || 'http://localhost:3000';
const url = new URL(`${baseUrl}/api/patterns`);
url.searchParams.set('q', query);
url.searchParams.set('limit', String(limit));

try {
  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error(`Request failed: ${res.status} ${res.statusText}`);
    const text = await res.text();
    if (text) console.error(text);
    process.exit(1);
  }
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
} catch (err) {
  console.error('Request error:', err);
  process.exit(1);
}
