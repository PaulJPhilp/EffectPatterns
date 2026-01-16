# Integrated Test Suite - Effect Patterns Analysis System

This directory contains comprehensive tests based on the integrated test plan for the Effect Patterns Analysis System. The test suite is organized into 10 categories that work together to ensure confidence across layers.

## Test Organization

### 1. Rule Registry Integrity Tests (`registry/`)
**Purpose**: Ensure the taxonomy itself doesn't rot
- Every rule ID has a rule definition with required fields
- No duplicate rule IDs or fix IDs
- Every rule with fixes references valid fix IDs
- All severities and categories are valid

### 2. Category Coverage Tests (`categories/`)
**Purpose**: Protect the structure you've built
- `concurrency` category contains exactly 10 rules
- `resources` category contains exactly 10 rules  
- `errors` category contains ≥ 15 rules
- Total rule count === 68
- All expected categories are present

### 3. Severity Distribution Tests (`severity/`)
**Purpose**: Prevent severity creep
- High severity rules ≤ 25 and ≥ 15
- No `style` rules marked High
- `resources` category has ≥ 1 High severity rule
- `concurrency` category has ≥ 5 High severity rules
- Medium and low severity rules are well-distributed

### 4. Analysis Engine Integration Tests (`integration/`)
**Purpose**: Verify multiple rules can fire together correctly
- Files that trigger violations across multiple categories
- Violations sorted by severity with stable ordering
- Single violation cases handled correctly
- Valid violation details with complete information

### 5. MCP Output Contract Tests (`mcp/`)
**Purpose**: Ensure downstream tools can rely on the output
- JSON output has stable shape and complete structure
- Markdown output renders cleanly
- Top-N limiting works for code review
- Error cases handled gracefully
- Consistent field types across violations

### 6. Fix Mapping Tests (`fix-mapping/`)
**Purpose**: Ensure recommendations stay actionable
- Every rule with fixes references valid fix IDs
- Fix descriptions are non-empty and useful
- Critical rules have associated fixes
- Fix IDs follow consistent naming patterns
- No orphaned fixes exist

### 7. Regression/Snapshot Tests (`regression/`)
**Purpose**: Catch accidental behavior changes
- "Worst-case" file triggering many rules
- Known tricky false-positive cases
- Boundary files (HTTP handlers, CLI entrypoints)
- Consistent violation ordering across runs
- Edge case code handled gracefully

### 8. Performance Smoke Tests (`performance/`)
**Purpose**: Ensure analysis stays fast enough to feel interactive
- ~500-line file analyzed within 2 seconds
- ~10 medium files analyzed within 3 seconds
- Repeated analysis without performance degradation
- Linear scaling with code size
- Memory usage remains reasonable

### 9. End-to-End Confidence Tests (`integration/`)
**Purpose**: Prove the whole stack works
- Complete analysis pipeline from services to output
- Multiple output formats (JSON, Markdown, code review)
- Error condition handling
- Configuration integration
- Actionable report generation

### 10. Rule-Level Unit Tests (existing)
**Purpose**: Prove each anti-pattern fires only when it should
- For each anti-pattern: 1 test that must trigger, 2 tests that must not trigger
- Rule ID, severity, category, and line number correctness

## Running the Tests

```bash
# Run all tests
bun test

# Run specific test categories
bun test packages/analysis-core/src/__tests__/registry/
bun test packages/analysis-core/src/__tests__/categories/
bun test packages/analysis-core/src/__tests__/severity/
bun test packages/analysis-core/src/__tests__/integration/
bun test packages/analysis-core/src/__tests__/mcp/
bun test packages/analysis-core/src/__tests__/fix-mapping/
bun test packages/analysis-core/src/__tests__/regression/
bun test packages/analysis-core/src/__tests__/performance/

# Run with coverage
bun test --coverage
```

## The Big Win

This integrated test suite does one thing very well:

✅ **It protects your taxonomy from entropy**

By testing across multiple dimensions - from individual rule correctness to system-wide performance, from data integrity to output contracts - we ensure the Effect Patterns Analysis System remains trustworthy, maintainable, and valuable as it evolves.

## Test Metrics

- **Total Rules**: 68
- **Total Categories**: 9
- **Total Fixes**: 58
- **High Severity Rules**: 15-25
- **Test Files**: 10+ comprehensive test suites
- **Coverage Target**: >90% rule coverage, >80% line coverage

## Continuous Integration

These tests are designed to run in CI/CD pipelines and provide:

1. **Fast Feedback** - Unit tests run in <30 seconds
2. **Comprehensive Validation** - Integration tests run in <2 minutes  
3. **Performance Guards** - Performance tests catch regressions
4. **Contract Stability** - MCP output tests ensure downstream compatibility
5. **Taxonomy Integrity** - Registry and category tests prevent structural drift

The test suite ensures that as new rules are added or existing rules are modified, the system maintains its high quality standards and continues to provide reliable analysis for Effect-TS codebases.
