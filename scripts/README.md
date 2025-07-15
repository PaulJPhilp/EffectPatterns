# Effect Patterns Scripts

This directory contains the scripts that power the Effect Patterns documentation system. The scripts are organized into two main directories:

## `/publish`

Contains the main publishing pipeline scripts that run in sequence:

1. **test.ts**: Run and validate all TypeScript examples
2. **publish.ts**: Convert raw MDX to published MDX
3. **validate.ts**: Validate published MDX files
4. **generate.ts**: Generate README.md
5. **rules.ts**: Generate AI coding rules
6. **pipeline.ts**: Orchestrates all steps in sequence

## `/ingest`

Contains scripts for processing new patterns before they enter the main pipeline:

1. **process.ts**: Validates and moves new patterns from `/content/new` into the main content directories

## Directory Structure

```
scripts/
├── publish/
│   ├── test.ts
│   ├── publish.ts
│   ├── validate.ts
│   ├── generate.ts
│   ├── rules.ts
│   └── pipeline.ts
├── ingest/
│   └── process.ts
└── README.md
```

## Pipeline Scripts

### `pipeline.ts`

Orchestrates the entire publishing pipeline, running each step in sequence and stopping if any step fails.

```bash
bun run pipeline
```

### `test.ts`

Runs and validates all TypeScript examples in `/content/src`.

```bash
bun run test
```

### `publish.ts`

Converts raw MDX files to published format by replacing Example components with TypeScript code.

```bash
bun run publish
```

### `validate.ts`

Validates that all published MDX files match their TypeScript source files.

```bash
bun run validate
```

### `generate.ts`

Generates the main README.md with links to all patterns.

```bash
bun run generate
```

### `rules.ts`

Generates AI coding rules from all patterns.

```bash
bun run rules
```

## Ingest Scripts

### `process.ts`

Processes new patterns from `/content/new` into the main content directories.

```bash
bun run ingest
```

This script:
1. Validates MDX frontmatter and required sections
2. Moves TypeScript files to `/content/src`
3. Moves MDX files to `/content/raw`

## Typical Workflow

1. **Create new pattern**
   ```bash
   # Create files in content/new
   touch content/new/my-pattern.mdx
   touch content/new/src/my-pattern.ts
   ```

2. **Process new pattern**
   ```bash
   bun run ingest
   ```

3. **Run publishing pipeline**
   ```bash
   bun run pipeline
   ```
   
This will:
- Run all TypeScript examples
- Convert raw MDX to published format
- Validate all files
- Generate README.md
- Generate AI coding rules

## Dependencies

- Bun (for running TypeScript)
- Node.js
- gray-matter (for parsing MDX frontmatter)
- fs/promises (for file system operations)
- path (for path manipulation)
- child_process (for running commands)
- util (for promisification)
