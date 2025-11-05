# Patterns Chat App - Quick Reference Guide

## Services Overview

### PatternsService
Query Effect-TS patterns from Supermemory.

```typescript
import { getPatternsService } from '@/lib/services/patterns-service';

const patternsService = getPatternsService();

// Search for patterns
const result = await patternsService.searchPatterns('error handling', {
  limit: 5,
  threshold: 0.6,
  rerank: true
});

console.log(result.patterns);     // Array of Pattern objects
console.log(result.totalCount);   // Total matches
console.log(result.score);        // Relevance score
```

**Pattern Object Structure:**
```typescript
interface Pattern {
  id: string;
  title: string;
  description: string;
  content: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  useCase?: string[];
  relevanceScore?: number;
  source: 'supermemory';
  url?: string;
}
```

**Available Methods:**
```typescript
// Search patterns with options
await patternsService.searchPatterns(query, options)

// Get patterns by skill level
await patternsService.getPatternsBySkillLevel('intermediate', query)

// Get patterns by use case
await patternsService.getPatternsByUseCase('error-handling')

// Clear cache (for testing)
patternsService.clearCache()

// Get cache statistics
patternsService.getCacheStats()
```

---

### PatternScorer
Evaluate if a query needs pattern guidance.

```typescript
import { getPatternScorer } from '@/lib/services/pattern-scorer';

const scorer = getPatternScorer();

// Score a query
const result = scorer.scoreQuery('How do I handle errors in Effect?');

console.log(result.needsPatterns);      // true/false
console.log(result.score);              // 0-1 (relevance score)
console.log(result.reasons);            // Why patterns were suggested
console.log(result.suggestedTopics);    // Recommended topics
```

**Scoring Result Structure:**
```typescript
interface ScoringResult {
  needsPatterns: boolean;      // Should patterns be retrieved?
  score: number;               // 0-1 relevance score
  reasons: string[];           // Scoring explanation
  suggestedTopics?: string[];  // Recommended pattern topics
}
```

**Available Methods:**
```typescript
// Get scoring result
scorer.scoreQuery(query)

// Get detailed breakdown (for debugging)
scorer.getDetailedScore(query)

// Adjust sensitivity
scorer.setMinimumThreshold(0.6)  // Default: 0.5
```

**Supported Topics:**
- error-handling
- dependency-injection
- async-programming
- type-safety
- testing
- performance
- composition
- context-propagation

---

## React Hooks

### usePatternRetrieval
Main hook for RAG pattern retrieval.

```typescript
'use client';

import { usePatternRetrieval } from '@/hooks/usePatternRetrieval';

export function ChatComponent() {
  const { 
    patterns, 
    isLoading, 
    error, 
    isRelevant, 
    relevanceScore,
    clearCache 
  } = usePatternRetrieval(userMessage, {
    enabled: true,
    minRelevanceScore: 0.5,
    maxPatterns: 3,
    cacheEnabled: true
  });

  if (isLoading) return <div>Loading patterns...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {isRelevant && (
        <div>
          <h3>Relevant Patterns (Score: {relevanceScore.toFixed(2)})</h3>
          {patterns.map(p => (
            <div key={p.id}>
              <h4>{p.title}</h4>
              <p>{p.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Hook Options:**
```typescript
interface UsePatternRetrievalOptions {
  enabled?: boolean;           // Enable/disable retrieval (default: true)
  minRelevanceScore?: number;  // Threshold 0-1 (default: 0.5)
  maxPatterns?: number;        // Max patterns to fetch (default: 3)
  cacheEnabled?: boolean;      // Enable result caching (default: true)
}
```

---

### usePatternContext
Format patterns for inclusion in LLM prompt.

```typescript
import { usePatternContext } from '@/hooks/usePatternRetrieval';

export function ChatComponent() {
  const { patterns } = usePatternRetrieval(query);
  const patternContext = usePatternContext(patterns);
  
  // Use in system prompt
  const systemPrompt = `You are an Effect-TS expert.
  
${patternContext}

Answer questions based on the patterns above.`;
}
```

**Output Format:**
```
## Pattern Title (intermediate)
Pattern description and key concepts
Tags: tag1, tag2, tag3

## Another Pattern (advanced)
More details...
```

---

### usePatternDisplay
Manage UI state for pattern display.

```typescript
import { usePatternDisplay } from '@/hooks/usePatternRetrieval';

export function PatternList({ patterns }) {
  const {
    patterns: sortedPatterns,
    groupedPatterns,
    expandedPatternId,
    setExpandedPatternId
  } = usePatternDisplay(patterns, {
    showOnlyRelevant: true,
    groupBySkillLevel: true,
    sortBy: 'relevance'
  });

  return (
    <div>
      {Object.entries(groupedPatterns).map(([level, levelPatterns]) => (
        <div key={level}>
          <h3>{level}</h3>
          {levelPatterns.map(p => (
            <div
              key={p.id}
              onClick={() => setExpandedPatternId(
                expandedPatternId === p.id ? null : p.id
              )}
            >
              <h4>{p.title}</h4>
              {expandedPatternId === p.id && (
                <p>{p.description}</p>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

**Display Options:**
```typescript
interface PatternDisplayOptions {
  showOnlyRelevant?: boolean;   // Hide low-relevance patterns
  groupBySkillLevel?: boolean;  // Group by beginner/intermediate/advanced
  sortBy?: 'relevance' | 'skillLevel' | 'title';
}
```

---

## API Endpoints (To Implement)

### POST /api/patterns/score
Score a query for pattern relevance.

**Request:**
```json
{
  "query": "How do I handle errors in Effect?"
}
```

**Response:**
```json
{
  "needsPatterns": true,
  "score": 0.78,
  "reasons": [
    "Effect-TS specificity: 100%",
    "Topic match: error-handling (50%)",
    "Learning/guidance indicators present"
  ],
  "suggestedTopics": ["error-handling"]
}
```

### POST /api/patterns/search
Retrieve relevant patterns.

**Request:**
```json
{
  "query": "How do I handle errors in Effect?",
  "topics": ["error-handling"],
  "limit": 3
}
```

**Response:**
```json
[
  {
    "id": "error-handling-01",
    "title": "Error Handling with Either",
    "description": "Learn how to use Either for error handling...",
    "content": "...",
    "skillLevel": "intermediate",
    "tags": ["errors", "control-flow"],
    "relevanceScore": 0.95,
    "source": "supermemory"
  },
  ...
]
```

---

## Usage Patterns

### Basic Chat Integration
```typescript
'use client';

import { useChat } from 'ai/react';
import { usePatternRetrieval, usePatternContext } from '@/hooks/usePatternRetrieval';

export function ChatInterface() {
  const { messages, input, setInput, append } = useChat();
  const { patterns } = usePatternRetrieval(input);
  const patternContext = usePatternContext(patterns);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const systemPrompt = `You are an Effect-TS expert.
    
${patternContext}

Provide helpful guidance based on the patterns above.`;

    await append({
      role: 'user',
      content: input
    }, {
      data: { systemPrompt }
    });
    
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Chat UI */}
    </form>
  );
}
```

### With Error Handling
```typescript
const { patterns, error, isLoading } = usePatternRetrieval(query);

if (error) {
  console.error('Pattern retrieval failed:', error);
  // Gracefully degrade - proceed with chat without patterns
}

const contextPatterns = patterns || [];
const systemPrompt = buildSystemPrompt(contextPatterns);
```

### With Debugging
```typescript
import { getPatternScorer } from '@/lib/services/pattern-scorer';

const scorer = getPatternScorer();
const detailed = scorer.getDetailedScore(query);

console.log('Scoring breakdown:', {
  total: detailed.score,
  effect: detailed.effectScore,
  topic: detailed.topicScore,
  guidance: detailed.guidanceScore,
  threshold: detailed.threshold
});
```

---

## Testing

### Mock PatternsService
```typescript
import { setPatternsService } from '@/lib/services/patterns-service';

const mockService = {
  searchPatterns: jest.fn().mockResolvedValue({
    patterns: [
      {
        id: 'test-1',
        title: 'Test Pattern',
        description: 'Test',
        content: 'Test content',
        skillLevel: 'beginner',
        tags: ['test'],
        relevanceScore: 0.9
      }
    ],
    totalCount: 1,
    query: 'test',
    timestamp: Date.now()
  })
};

setPatternsService(mockService as any);
```

### Test PatternScorer
```typescript
import { setPatternScorer } from '@/lib/services/pattern-scorer';

const scorer = new PatternScorer();
const result = scorer.scoreQuery('How do I handle errors?');

expect(result.needsPatterns).toBe(true);
expect(result.score).toBeGreaterThan(0.5);
expect(result.suggestedTopics).toContain('error-handling');
```

---

## Environment Variables Checklist

```bash
# Required
SUPERMEMORY_API_KEY=sm_...
SUPERMEMORY_PROJECT_ID=effect-patterns
DATABASE_URL=postgresql://...
BLOB_READ_WRITE_TOKEN=...

# Optional
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
NODE_ENV=development
```

---

## Common Issues & Solutions

### Patterns Not Appearing
1. Check `SUPERMEMORY_API_KEY` is set correctly
2. Verify patterns uploaded: `pnpm run dev -- memories list --type pattern`
3. Check query score: Use `getDetailedScore()` for debugging
4. Verify threshold: Default is 0.5, adjust if needed

### High API Latency
1. Check cache is enabled (default: true)
2. Look at memory router API status
3. Consider increasing `minRelevanceScore` threshold
4. Reduce `maxPatterns` limit

### Incorrect Pattern Matching
1. Review scoring breakdown with `getDetailedScore()`
2. Check keywords in PatternScorer for topic matching
3. Adjust scoring weights if needed
4. Test with explicit topic queries

---

## Support Resources

- Implementation Guide: `docs/patterns-chat-app/IMPLEMENTATION_GUIDE.md`
- Supermemory API: https://supermemory.ai/docs
- sm-cli README: `app/sm-cli/README.md`

