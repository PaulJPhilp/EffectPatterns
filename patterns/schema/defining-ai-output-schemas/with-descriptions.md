---
id: schema-ai-output-with-descriptions
title: Adding Descriptions for AI Context
category: defining-ai-output-schemas
skill: beginner
tags:
  - schema
  - ai
  - descriptions
  - json-schema
  - documentation
---

# Problem

You define a schema with field names like `confidence` or `category`, but the LLM doesn't understand the nuance of what you want. It might interpret fields differently than intended, leading to hallucinations or incorrect data. You need to add descriptions that guide the LLM on what each field means and how to populate it.

# Solution

```typescript
import { Schema, JSONSchema, Effect } from "effect"
import { Anthropic } from "@anthropic-ai/sdk"

// 1. Define schema with descriptions
const MovieReview = Schema.Struct({
  title: Schema.String.pipe(
    Schema.description("Movie title from the review text")
  ),
  rating: Schema.Number.pipe(
    Schema.between(1, 10),
    Schema.description(
      "Rating on scale of 1-10. Be precise: 7.5 is better than 8"
    )
  ),
  reviewSentiment: Schema.Literal("positive", "mixed", "negative").pipe(
    Schema.description(
      "Overall sentiment: positive (recommends watching), " +
      "mixed (has pros and cons), negative (don't watch)"
    )
  ),
  strengths: Schema.Array(Schema.String).pipe(
    Schema.description(
      "What worked well: acting, cinematography, plot, dialogue, etc. " +
      "List 2-3 specific examples"
    )
  ),
  weaknesses: Schema.Array(Schema.String).pipe(
    Schema.description(
      "What didn't work: pacing, character development, ending, etc. " +
      "List 2-3 specific examples"
    )
  ),
  watchAgain: Schema.Boolean.pipe(
    Schema.description("Would you watch this movie again? True if yes")
  ),
})

type MovieReview = typeof MovieReview.Type

// 2. Generate JSON Schema with descriptions
const jsonSchema = JSONSchema.make(MovieReview)
console.log(JSON.stringify(jsonSchema, null, 2))
// Output includes "description" fields in schema

// 3. Use in LLM call
const reviewMovie = (reviewText: string) =>
  Effect.gen(function* () {
    const client = new Anthropic()

    const response = yield* Effect.tryPromise({
      try: () =>
        client.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `Extract structured review data from this text:\n\n${reviewText}`,
            },
          ],
          tools: [
            {
              name: "extract_review",
              description: "Extract structured movie review data",
              input_schema: jsonSchema as any,
            },
          ],
        }),
      catch: (error) => new Error(`API call failed: ${error}`),
    })

    const toolUse = response.content.find(
      (block) => block.type === "tool_use"
    ) as any

    if (!toolUse) {
      return yield* Effect.fail(new Error("No tool use in response"))
    }

    const result = yield* Effect.tryPromise({
      try: () => Schema.decodeUnknownSync(MovieReview)(toolUse.input),
      catch: (error) => new Error(`Validation failed: ${error}`),
    })

    return result
  })

// Usage
const sampleReview =
  "The Matrix is a masterpiece. The action scenes are groundbreaking, " +
  "the plot twist is mind-bending, and Keanu Reeves is perfect. " +
  "The only issue is some dialogue feels dated. I'd watch it again!"

Effect.runPromise(reviewMovie(sampleReview)).then((review) =>
  console.log(JSON.stringify(review, null, 2))
)
```

# Why This Works

| Concept | Explanation |
|---------|-------------|
| `Schema.description()` | Adds JSON Schema `description` field that LLMs read as instructions |
| Explicit context | "Be precise: 7.5 is better than 8" guides LLM to avoid round numbers |
| Field naming + description | Combines semantic names with behavioral guidance |
| "List 2-3 examples" | Tells LLM exactly how many items you want in arrays |
| Example values | "positive (recommends watching)" clarifies what each literal means |

# When to Use

- When LLM field interpretation varies between runs
- Complex fields that need clarification (dates, enums, amounts)
- When you want consistent formatting (e.g., "ISO 8601 date format")
- Guiding LLM on numeric precision (ratings, percentages)
- Arrays where count matters ("return exactly 3 items")

# Related Patterns

- [Basic AI Output Schema](./basic.md)
- [Nested Object Schemas](./nested-structures.md)
- [Enums and Literal Types](./enums-and-literals.md)
- [Integration with Vercel AI SDK](./vercel-ai-sdk.md)
