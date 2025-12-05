# Effect Patterns Publishing Pipeline

## Overview

The publishing pipeline is a three-stage system for managing Effect pattern content from creation through publication. It handles MDX file processing, TypeScript code extraction, validation, and final publication.

## Directory Structure

```
content/
├── new/              # Active development stage
│   ├── raw/          # Raw MDX files with embedded TypeScript code
│   ├── src/          # Extracted TypeScript source files
│   ├── processed/    # MDX with Example component tags
│   └── published/    # Final published MDX with embedded code
├── published/        # Archive of published patterns (132 files)
├── qa/               # Quality assurance outputs
└── discord/          # Discord-related content
```

## Three-Stage Pipeline

### Stage 1: Ingestion (`scripts/ingest/process.ts`)

**Input**: `content/new/raw/*.mdx`  
**Output**: `content/new/src/*.ts` + `content/new/processed/*.mdx`

Processes raw pattern files by:

- Parsing YAML frontmatter (id, title, skillLevel, useCase, summary)
- Validating required sections: Good Example, Anti-Pattern, Explanation/Rationale
- Extracting TypeScript code from "Good Example" section → `src/{id}.ts`
- Replacing code block with `<Example path="./src/{id}.ts" />` tag
- Writing processed MDX to `processed/` directory

**Validation**:

- Frontmatter completeness and valid skillLevel (Beginner/Intermediate/Advanced)
- Required section presence
- TypeScript code block extraction success

### Stage 2: Publishing (`scripts/publish/publish.ts`)

**Input**: `content/new/processed/*.mdx` + `content/new/src/*.ts`  
**Output**: `content/new/published/*.mdx`

Converts processed MDX back to publication format by:

- Reading each processed MDX file
- Locating corresponding TypeScript file in `src/`
- Replacing `<Example path="./src/{id}.ts" />` with embedded code block
- Writing final published MDX with full code content

**Validation**:

- TypeScript file existence for each pattern
- Successful code block replacement

### Stage 3: Validation (`scripts/publish/validate.ts`)

**Input**: `content/new/published/*.mdx` + `content/new/src/*.ts`  
**Output**: Validation report (exit code 0 or 1)

Ensures published patterns meet quality standards:

- **Frontmatter validation**: id, title, skillLevel, useCase, summary present
- **Filename consistency**: Frontmatter id matches filename
- **Section validation**: Good Example, Anti-Pattern, Explanation/Rationale present
- **File integrity**: TypeScript source file exists for each pattern

## Data Flow

```
Raw MDX (embedded code)
    ↓
[INGEST] Extract code → src/{id}.ts
    ↓
Processed MDX (Example tags)
    ↓
[PUBLISH] Replace tags with code
    ↓
Published MDX (embedded code)
    ↓
[VALIDATE] Verify completeness
    ↓
✅ Ready for deployment
```

## Key Design Decisions

1. **Two-representation model**: Patterns exist in both processed (Example tags) and published (embedded code) forms, enabling flexible content management

2. **Separate source files**: TypeScript code extracted to individual files allows:

   - Independent code validation and linting
   - Reusability across multiple patterns
   - Easier version control and diffing

3. **Frontmatter-driven validation**: YAML frontmatter serves as contract for pattern metadata, enforced at ingestion time

4. **Staged directories**: Each stage has dedicated input/output directories preventing accidental overwrites and enabling rollback

## Usage

```bash
# Stage 1: Process raw patterns
bunx tsx scripts/ingest/process.ts

# Stage 2: Publish to final format
bunx tsx scripts/publish/publish.ts

# Stage 3: Validate published patterns
bunx tsx scripts/publish/validate.ts

# Run all stages
bunx tsx scripts/publish/pipeline.ts
```

## Error Handling

- **Ingestion**: Fails on missing frontmatter, invalid sections, or missing code blocks
- **Publishing**: Fails if TypeScript source files don't exist
- **Validation**: Reports all errors with file paths and exits with code 1 on failure

## Current Status

- **88 patterns** in `content/new/` at various stages
- **132 patterns** in `content/published/` (archive)
- Pipeline fully automated and idempotent
- All validation checks passing
