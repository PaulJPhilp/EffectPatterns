#!/usr/bin/env bun

const id = process.argv[2];
if (!id) {
  console.error('Usage: bun ./scripts/pattern.ts <pattern-id>');
  process.exit(1);
}

const baseUrl = process.env.EFFECT_PATTERNS_API_URL || 'http://localhost:3000';
const url = `${baseUrl}/api/patterns/${encodeURIComponent(id)}`;

try {
  const res = await fetch(url);
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
