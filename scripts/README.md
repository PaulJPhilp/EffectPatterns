# Effect Patterns Publishing Pipeline

This directory contains the scripts that power the Effect Patterns publishing pipeline. These scripts help maintain consistency between TypeScript source files and their corresponding MDX documentation.

## Pipeline Overview

The publishing pipeline consists of a 3-stage workflow:

1. **New Patterns** (`content/new/`): Empty subdirectories for new patterns that haven't been published yet
2. **Raw Patterns** (`content/raw/`): MDX files with TypeScript code replaced by `<Example />` components
3. **Published Patterns** (`content/published/`): Final MDX files with embedded TypeScript code blocks

## Available Scripts

### 1. `process_patterns.ts`

Processes MDX files by extracting TypeScript code blocks and replacing them with Example components.

```bash
npx tsx process_patterns.ts --indir <input_directory> --outdir <output_directory> [--srcdir <source_directory>] [--count <number>]
```

**Arguments:**
- `--indir`: Input directory containing MDX files (required)
- `--outdir`: Output directory for processed MDX files (required)
- `--srcdir`: Directory to write extracted TypeScript code (optional)
- `--count`: Number of files to process (optional)

**Example:**
```bash
npx tsx process_patterns.ts --indir content/published --outdir content/raw --srcdir content/src
```

### 2. `publish-patterns.ts`

Processes MDX files by replacing Example components with TypeScript code from source files.

```bash
npx tsx publish-patterns.ts --indir <input_directory> --outdir <output_directory> --srcdir <source_directory> [--count <number>]
```

**Arguments:**
- `--indir`: Input directory containing MDX files with Example components (required)
- `--outdir`: Output directory for processed MDX files (required)
- `--srcdir`: Directory containing TypeScript source files (required)
- `--count`: Number of files to process (optional)

**Example:**
```bash
npx tsx publish-patterns.ts --indir content/raw --outdir content/published --srcdir content/src
```

### 3. `pattern-validator.ts`

Validates that TypeScript code blocks in MDX files match their corresponding source files.

```bash
npx tsx pattern-validator.ts --indir <input_directory> --srcdir <source_directory> [--count <number>]
```

**Arguments:**
- `--indir`: Input directory containing MDX files (required)
- `--srcdir`: Directory containing TypeScript source files (required)
- `--count`: Number of files to process (optional)

**Example:**
```bash
npx tsx pattern-validator.ts --indir content/published --srcdir content/src
```

### 4. `generate_readme.ts`

Generates the main README.md file with links to all patterns, organized by category.

```bash
npx tsx generate_readme.ts
```

**Note:** This script looks for MDX files in the `content/published` directory.

### 5. `validate_and_generate.ts`

Combines validation and README generation in one step.

```bash
npx tsx validate_and_generate.ts
```

This script:
1. Validates all TypeScript code blocks against source files
2. Generates the README.md with links to all patterns
3. Ensures complete consistency between code, documentation, and README

## Typical Workflow

1. **Create new patterns** in `content/new/`
2. **Process patterns** to extract TypeScript code:
   ```bash
   npx tsx process_patterns.ts --indir content/published --outdir content/raw --srcdir content/src
   ```
3. **Make changes** to TypeScript source files in `content/src/`
4. **Publish patterns** to restore TypeScript code blocks:
   ```bash
   npx tsx publish-patterns.ts --indir content/raw --outdir content/published --srcdir content/src
   ```
5. **Validate patterns** to ensure consistency:
   ```bash
   npx tsx pattern-validator.ts --indir content/published --srcdir content/src
   ```
6. **Generate README** with links to all patterns:
   ```bash
   npx tsx generate_readme.ts
   ```

Or use the combined validation and generation script:
```bash
npx tsx validate_and_generate.ts
```

## Future Automation

Future enhancements to this pipeline could include:

1. GitHub Actions workflow to automatically validate patterns on pull requests
2. Automated tests for the pipeline scripts
3. Integration with a CI/CD system for automated deployment
4. Pre-commit hooks to ensure consistency before committing changes

## Dependencies

- TypeScript
- Node.js
- commander (for CLI argument parsing)
- gray-matter (for parsing MDX frontmatter)
- fs/promises (for file system operations)
- path (for path manipulation)
