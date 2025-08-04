# QA Process Scripts

This directory contains scripts for processing and validating Effect Pattern files.

## Files

- `qa-process.sh` - Bash script that replicates the functionality of the original `qa-process.ts`
- `test-qa-process.sh` - Test script to validate the bash script
- `make-executable.sh` - Script to make all QA scripts executable

## Usage

### qa-process.sh

The bash script replicates the functionality of the original TypeScript script:

```bash
./qa-process.sh
```

This script will:
1. Process all MDX files in `content/new/processed`
2. Run QA validation against each pattern using the CLI
3. Produce JSON output with metadata, pass/fail status, and metrics
4. Save results to `content/qa/results/`

You can also run the script via the package.json script:

```bash
bun run qa:process
```

### test-qa-process.sh

To test the bash script:

```bash
# Make the test script executable (if not already)
chmod +x test-qa-process.sh

# Run the test
./test-qa-process.sh
```

### make-executable.sh

To make all QA scripts executable:

```bash
# Make the script executable (if not already)
chmod +x make-executable.sh

# Run it to make all QA scripts executable
./make-executable.sh
```

## Implementation Details

The bash script implements the same functionality as the TypeScript version:

- **Configuration**: Sets up paths for the project directories
- **Validation**: Ensures required directories exist
- **Pattern Discovery**: Finds all MDX files in the patterns directory
- **Metadata Extraction**: Extracts frontmatter from MDX files using awk and sed
- **QA Validation**: 
  - Creates QA prompt content for each pattern
  - Runs the CLI process-prompt command
  - Parses the JSON response
  - Handles errors and failures
- **Result Saving**: Saves QA results as JSON files
- **Main Processing**: Orchestrates the entire workflow
- **Error Handling**: Uses bash error handling mechanisms

## Dependencies

- `bun` - Required to run the CLI commands
- Standard Unix tools (awk, sed, grep, find, etc.)
- Access to the Effect Patterns CLI (`cli:start` script)

## Migration from TypeScript

The original `qa-process.ts` TypeScript script has been replaced with this bash script for better performance and simpler deployment. The functionality remains identical, but the implementation now uses native shell commands instead of Node.js dependencies.

## Permissions Note

All bash scripts in this directory must have execute permissions to run correctly. If you encounter a "Permission denied" error, run the `make-executable.sh` script to fix the permissions:

```bash
chmod +x make-executable.sh
./make-executable.sh
```

This will ensure all scripts have the necessary execute permissions.
