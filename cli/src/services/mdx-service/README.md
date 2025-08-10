# MDX Service

Provides utilities to read, parse, validate, and update MDX files with
YAML frontmatter.

## Capabilities

- Parse a full MDX file and extract YAML frontmatter and body.
- Validate and normalize frontmatter values used by the CLI.
- Update an MDX string with new frontmatter content.
- Extract typed parameter definitions from metadata.

## API

```ts
interface MdxServiceApi {
  readMdxAndFrontmatter: (
    filePath: string
  ) => Effect<
    { content: string; frontmatter: Frontmatter; mdxBody: string },
    InvalidMdxFormatError
  >;

  updateMdxContent: (
    originalFullMdxContent: string,
    updatedFrontmatter: Frontmatter
  ) => string;

  parseMdxFile: (
    content: string
  ) => Effect<
    { attributes: Record<string, unknown>; body: string },
    InvalidMdxFormatError
  >;

  validateMdxConfig: (
    attributes: Record<string, unknown>
  ) => {
    provider?: string;
    model?: string;
    parameters?: Record<string, unknown>;
  };

  extractParameters: (
    metadata: Record<string, unknown>
  ) => Record<string, ParameterDefinition>;
}
```

Types referenced above are defined in `types.ts`.

- `Frontmatter`: shape of YAML metadata stored at the top of the file.
- `ParameterDefinition`: a typed parameter descriptor with `type`,
  `required`, `default`, and `description` fields.

## Return values

- `readMdxAndFrontmatter`: returns the original file content, the parsed
  `frontmatter`, and the `mdxBody` (the content without frontmatter).
- `updateMdxContent`: returns the full MDX string with updated
  frontmatter.
- `parseMdxFile`: returns parsed `attributes` and the `body` string.
- `validateMdxConfig`: returns normalized optional config values.
- `extractParameters`: returns a map of parameter name to definition.

## Errors

All errors are `Data.TaggedError` from `errors.ts`.

- `InvalidMdxFormatError { reason: string }` when MDX or YAML cannot be
  parsed or is malformed.
- `InvalidFrontmatterError { reason: string }` when frontmatter
  structure or expected values are invalid.

## Implementation notes

- The service follows the `Effect.Service` pattern in
  `service.ts` and uses only `TaggedError` for failures.
- Reading and parsing use `gray-matter` / `yaml` under the hood.
- Schema files are not required for this service.
