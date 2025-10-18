# Step 2: Implement GET /api/v1/rules Endpoint with Schema Validation

## Objective
Implement the GET /api/v1/rules endpoint, ensuring the response is validated using the Schema module from the effect package.

## Summary
- Define a Rule schema with `Schema.Struct`
- Read `.mdc` files from `rules/cursor/`, parse frontmatter with `gray-matter`
- Validate parsed rules with `Schema.decodeUnknown(Schema.Array(RuleSchema))`
- Return JSON response or a 500 with logging on failure

## Error handling
- Define tagged errors for directory/file/read/validation failures

## Testing
- Start server and curl `/api/v1/rules` to validate output
