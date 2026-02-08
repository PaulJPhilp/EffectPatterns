#!/usr/bin/env bun
/**
 * Schema Validation Debug Script
 *
 * Validates that all schema definitions are in sync:
 * 1. Database schema (Drizzle)
 * 2. Domain schema (Effect Schema)
 * 3. Legacy mapping functions
 *
 * Run this script to detect schema drift issues early.
 */

// biome-ignore assist/source/organizeImports: <>
import { Console, Effect } from 'effect';
import { createDatabase } from '../packages/toolkit/src/db/client.js';
import {
  effectPatterns,
  type EffectPattern as DbEffectPattern,
} from '../packages/toolkit/src/db/schema/index.js';
import { Pattern } from '../packages/toolkit/src/schemas/pattern.js';
import { dbPatternToLegacy } from '../packages/toolkit/src/services/database.js';

// ============================================================================
// Schema Validation Types
// ============================================================================

interface SchemaValidationError {
  field: string;
  expectedType: string;
  actualType: string;
  severity: 'error' | 'warning';
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: SchemaValidationError[];
  warnings: SchemaValidationError[];
}

// ============================================================================
// Database Schema Inspection
// ============================================================================

const getDatabaseSchema = Effect.gen(function* () {
  const connection = createDatabase(
    process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/effect_patterns',
  );

  // Get sample pattern from database
  const samplePatterns = yield* Effect.tryPromise({
    try: () => connection.db.select().from(effectPatterns).limit(1),
    catch: (error) => new Error(`Failed to query database: ${String(error)}`),
  });

  if (samplePatterns.length === 0) {
    yield* Console.error('❌ No patterns found in database to validate schema');
    return null;
  }

  const sample = samplePatterns[0];
  yield* Console.log('📋 Database sample pattern fields:');

  // Log all database fields with their types
  const dbFields = Object.entries(sample).map(([key, value]) => ({
    field: key,
    type: typeof value,
    value,
    nullable: value === null,
  }));

  for (const { field, type, nullable } of dbFields) {
    yield* Console.log(`  - ${field}: ${type}${nullable ? ' (nullable)' : ''}`);
  }

  return sample;
});

// ============================================================================
// Domain Schema Validation
// ============================================================================

const validateDomainSchema = Effect.gen(function* () {
  yield* Console.log('🔍 Validating domain schema...');

  // Get expected fields from Effect Schema
  const expectedFields = Object.keys(Pattern.fields);
  yield* Console.log(
    `📋 Domain schema expects ${expectedFields.length} fields:`,
  );
  for (const field of expectedFields) {
    yield* Console.log(`  - ${field}`);
  }

  return expectedFields;
});

// ============================================================================
// Legacy Mapping Validation
// ============================================================================

const validateLegacyMapping = (
  dbSample: DbEffectPattern,
  expectedFields: string[],
) =>
  Effect.gen(function* () {
    yield* Console.log('🔄 Validating legacy mapping function...');

    const mappedPattern = dbPatternToLegacy(dbSample);
    const mappedFields = Object.keys(mappedPattern);

    yield* Console.log(
      `📋 Legacy mapping produces ${mappedFields.length} fields:`,
    );
    for (const field of mappedFields) {
      yield* Console.log(`  - ${field}`);
    }

    const errors: SchemaValidationError[] = [];
    const warnings: SchemaValidationError[] = [];

    // Check for missing required fields
    for (const expectedField of expectedFields) {
      if (!(expectedField in mappedPattern)) {
        errors.push({
          field: expectedField,
          expectedType: 'string',
          actualType: 'missing',
          severity: 'error',
          message: `Required field '${expectedField}' missing from legacy mapping`,
        });
      }
    }

    // Check for extra fields (warnings)
    for (const mappedField of mappedFields) {
      if (!expectedFields.includes(mappedField)) {
        warnings.push({
          field: mappedField,
          expectedType: 'undefined',
          actualType:
            typeof mappedPattern[mappedField as keyof typeof mappedPattern],
          severity: 'warning',
          message: `Extra field '${mappedField}' in legacy mapping`,
        });
      }
    }

    // Validate specific field mappings
    if (mappedPattern.id !== dbSample.slug) {
      errors.push({
        field: 'id',
        expectedType: dbSample.slug,
        actualType: mappedPattern.id,
        severity: 'error',
        message: `Field 'id' should map from db.slug, but got mismatch`,
      });
    }

    if (mappedPattern.slug !== dbSample.slug) {
      errors.push({
        field: 'slug',
        expectedType: dbSample.slug,
        actualType: mappedPattern.slug,
        severity: 'error',
        message: `Field 'slug' should map from db.slug, but got mismatch`,
      });
    }

    return { errors, warnings };
  });

// ============================================================================
// Main Validation Pipeline
// ============================================================================

const validateSchema = Effect.gen(function* () {
  yield* Console.log('🚀 Starting schema validation...');
  yield* Console.log('='.repeat(50));

  // Step 1: Get database schema
  const dbSample = yield* getDatabaseSchema;
  if (!dbSample) {
    return {
      isValid: false,
      errors: [
        {
          field: 'database',
          expectedType: 'data',
          actualType: 'empty',
          severity: 'error',
          message: 'No data in database',
        },
      ],
      warnings: [],
    };
  }

  // Step 2: Validate domain schema
  const expectedFields = yield* validateDomainSchema;

  // Step 3: Validate legacy mapping
  const { errors, warnings } = yield* validateLegacyMapping(
    dbSample,
    expectedFields,
  );

  yield* Console.log('='.repeat(50));
  yield* Console.log('📊 VALIDATION RESULTS:');

  if (errors.length > 0) {
    yield* Console.error(`❌ ${errors.length} ERRORS FOUND:`);
    for (const error of errors) {
      yield* Console.error(`  🔴 ${error.field}: ${error.message}`);
    }
  }

  if (warnings.length > 0) {
    yield* Console.warn(`⚠️  ${warnings.length} WARNINGS:`);
    for (const warning of warnings) {
      yield* Console.warn(`  🟡 ${warning.field}: ${warning.message}`);
    }
  }

  if (errors.length === 0 && warnings.length === 0) {
    yield* Console.log('✅ Schema validation PASSED! All schemas are in sync.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  } as ValidationResult;
});

// ============================================================================
// Schema Freeze Check
// ============================================================================

const checkSchemaFrozen = Effect.gen(function* () {
  yield* Console.log('🧊 Checking schema freeze status...');

  // In a real implementation, this would check against a stored schema hash
  // For now, we'll just validate the current schema is consistent
  const result = yield* validateSchema;

  if (result.isValid) {
    yield* Console.log('✅ Schema is consistent and ready to freeze');
    yield* Console.log('💡 To freeze this schema:');
    yield* Console.log('   1. Commit these schema changes');
    yield* Console.log('   2. Generate schema hash: bun run schema:hash');
    yield* Console.log('   3. Store hash in .schema-hash file');
  } else {
    yield* Console.error('❌ Schema has issues - fix before freezing');
  }

  return result;
});

// ============================================================================
// CLI Interface
// ============================================================================

const main = Effect.gen(function* () {
  const command = process.argv[2] || 'validate';

  if (command === 'validate') {
    yield* validateSchema;
  } else if (command === 'freeze') {
    yield* checkSchemaFrozen;
  } else {
    yield* Console.error("Unknown command. Use: 'validate' or 'freeze'");
    process.exit(1);
  }
});

// ============================================================================
// Error Handling
// ============================================================================

main.pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Console.error('❌ Schema validation failed:');
      yield* Console.error(String(error));
      process.exit(1);
    }),
  ),
  Effect.runPromise,
);
