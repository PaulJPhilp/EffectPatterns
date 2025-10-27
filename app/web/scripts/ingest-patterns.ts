#!/usr/bin/env bun

/**
 * Pattern Ingestion Script
 *
 * Usage: bun run ingest:patterns
 */

import { Effect } from 'effect';
import { runDefaultIngestion } from '../lib/ingestion/pipeline.js';

// Run the ingestion pipeline
Effect.runPromise(runDefaultIngestion()).catch((error) => {
  console.error('Ingestion failed:', error);
  process.exit(1);
});
