# Review Code Service

Free tier code review with architectural recommendations.

## Overview

The `ReviewCodeService` provides high-fidelity architectural recommendations for Effect codebases with confidence scoring, fix plans, and guidance. Limited to top 3 findings in Free tier.

**Important**: This service only accepts code that is:
1. Cut and pasted into the prompt (code parameter)
2. Provided from an open editor file (code parameter with optional filePath for context)

Files are **NOT** read from disk. The `filePath` parameter is only used for TypeScript file extension validation and context/metadata. Only diagnostic information is returned (no corrected code).

## API

### Methods

#### `reviewCode(code: string, filePath?: string): Effect<ReviewCodeResult, FileSizeError | NonTypeScriptError | Error>`

Analyze TypeScript code and return diagnostic recommendations. Code must be provided directly - files are not read from disk.

```typescript
const result = yield* reviewer.reviewCode(
  sourceCode,
  "src/services/user.ts"
);

console.log(`Found ${result.meta.totalFound} issues`);
console.log(`Top ${result.recommendations.length} shown`);
console.log("\nMarkdown report:");
console.log(result.markdown);
```

## Constraints

- **Code source**: Code must be cut and pasted or provided from open editor. Files are NOT read from disk.
- **File size**: Max 100KB (100,000 bytes)
- **File type**: Must be .ts or .tsx (if filePath provided)
- **Free tier limit**: Top 3 recommendations (by severity)
- **Code limit**: Entire finding base is analyzed
- **Response type**: Only diagnostic information returned (findings, recommendations, fix plans). No corrected code is included.

## Response Structure

```typescript
interface ReviewCodeResult {
  // Basic recommendations (for backward compatibility)
  recommendations: CodeRecommendation[];
  
  // Enhanced recommendations with full details
  enhancedRecommendations: EnhancedCodeRecommendation[];
  
  // Statistical summary
  summary: MachineSummary;
  
  // Metadata about results
  meta: ReviewCodeMeta;
  
  // Formatted markdown report
  markdown: string;
}
```

### CodeRecommendation (Basic)
```typescript
{
  severity: "high" | "medium" | "low";
  title: string;
  line: number;
  message: string;
}
```

### EnhancedCodeRecommendation (Detailed)
```typescript
{
  severity: "high" | "medium" | "low";
  title: string;
  line: number;
  message: string;
  ruleId: string;                    // e.g., "errors/avoid-generic"
  category: string;                  // errors, async, validation, etc.
  confidence: ConfidenceScore;       // high/medium/low + score + factors
  evidence: CodeSnippet;             // Code showing the issue
  fixPlan: FixPlan;                  // Steps + changes + risks
  guidanceKey?: string;              // Pattern guide filename
  guidance?: string;                 // Pattern guide markdown
}
```

### MachineSummary
```typescript
{
  findingsByLevel: { high: N, medium: N, low: N };
  topIssueRuleIds: string[];
  confidenceDistribution: { high: N, medium: N, low: N };
}
```

### ReviewCodeMeta
```typescript
{
  totalFound: number;           // All issues found
  hiddenCount: number;          // Issues beyond free tier limit
  upgradeMessage?: string;      // Upgrade prompt
}
```

## Error Handling

```typescript
import { Either } from "effect";
import { FileSizeError, NonTypeScriptError } from "./services/review-code";

const result = yield* reviewer.reviewCode(code, filepath)
  .pipe(Effect.either);

if (Either.isLeft(result)) {
  const error = result.left;
  
  if (error instanceof FileSizeError) {
    console.log(`File too large: ${error.size} > ${error.maxSize}`);
  } else if (error instanceof NonTypeScriptError) {
    console.log(`Must be .ts or .tsx file: ${error.filePath}`);
  }
}
```

## Example

```typescript
import { Effect } from "effect";
import { ReviewCodeService } from "./services/review-code";

const program = Effect.gen(function* () {
  const reviewer = yield* ReviewCodeService;
  
  const result = yield* reviewer.reviewCode(
    sourceCode,
    "src/api.ts"
  );
  
  // Display summary
  console.log("CODE REVIEW RESULTS");
  console.log(`Issues found: ${result.meta.totalFound}`);
  console.log(`Shown (Free tier): ${result.recommendations.length}`);
  
  if (result.meta.upgradeMessage) {
    console.log(`\n💡 ${result.meta.upgradeMessage}`);
  }
  
  // Display detailed recommendations
  result.enhancedRecommendations.forEach(rec => {
    console.log(`\n${rec.title} (Line ${rec.line})`);
    console.log(`Severity: ${rec.severity}`);
    console.log(`Confidence: ${rec.confidence.level}`);
    console.log(`Category: ${rec.category}`);
    
    console.log("\nEvidence:");
    console.log("```typescript");
    rec.evidence.beforeContext.forEach(l => console.log(l));
    console.log("// Issue:");
    rec.evidence.targetLines.forEach(l => console.log(l));
    rec.evidence.afterContext.forEach(l => console.log(l));
    console.log("```");
    
    console.log("\nFix Plan:");
    rec.fixPlan.steps.forEach(s => {
      console.log(`${s.order}. ${s.action}`);
    });
  });
  
  // Or just use markdown
  console.log("\n" + result.markdown);
});

Effect.runPromise(program);
```

## Sorting

Recommendations are sorted by:
1. **Severity** (high → medium → low)
2. **Line number** (ascending)

## Dependencies

This service orchestrates multiple services:
- `AnalysisService` - Code analysis
- `ConfidenceCalculatorService` - Confidence scoring
- `FixPlanGeneratorService` - Fix plan generation
- `SnippetExtractorService` - Code snippet extraction
- `GuidanceLoaderService` - Pattern guidance

## Configuration

- `MAX_FILE_SIZE_BYTES` - File size limit (100KB)
- `MAX_FREE_TIER_RECOMMENDATIONS` - Free tier limit (3)

## Testing

Run review code tests:
```bash
bun run test src/services/review-code/__tests__
```

## See Also

- [Code Analysis](../../../docs/analysis) - Underlying analysis engine
- [Configuration](../config) - Service configuration
- [Tier Service](../tier) - Free/Paid tier limits
