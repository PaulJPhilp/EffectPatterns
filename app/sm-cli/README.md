# Supermemory CLI (sm-cli)

A TypeScript CLI tool for managing Supermemory patterns using Effect-TS.

## Setup

1. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Set the environment variable:**
   ```bash
   export SUPERMEMORY_API_KEY="your-api-key-here"
   ```

   Or create a `.env.local` file in the project root:
   ```
   SUPERMEMORY_API_KEY=your-api-key-here
   ```

## Running the CLI

### Development Mode (with TypeScript)
```bash
npm run dev -- <command>
```

### Production Mode (compiled)
```bash
npm run build
node dist/index.js <command>
```

### Using npm script
```bash
npm run cli -- <command>
```

## Available Commands

### Project Management

**Set active project:**
```bash
npm run dev -- project set <project-name>
npm run dev -- project set <project-name> --format json
```

**List available projects:**
```bash
npm run dev -- project list
npm run dev -- project list --format json
```

**Show project information:**
```bash
npm run dev -- project info
npm run dev -- project info --format json
```

### Memory Management

**List memories (with pagination):**
```bash
npm run dev -- memories list
npm run dev -- memories list --page 2 --limit 50
npm run dev -- memories list --type pattern --page 1 --format json
```

**Count memories:**
```bash
npm run dev -- memories count
npm run dev -- memories count --type pattern
npm run dev -- memories count --format json
```

### Pattern Management

**Upload a single pattern:**
```bash
npm run dev -- patterns upload <pattern-file.mdx>
```

**Upload all patterns:**
```bash
npm run dev -- patterns upload --all
```

## Configuration

The CLI stores configuration in `~/.supermemoryrc` in JSON format:

```json
{
  "activeProject": "effect-patterns",
  "apiKey": "your-api-key",
  "supermemoryUrl": "https://api.supermemory.ai",
  "uploadedPatterns": ["pattern1", "pattern2"],
  "lastUpload": "2025-11-03T12:34:56Z"
}
```

## Output Formats

All commands support two output formats:

- **Human-readable** (default): Nicely formatted tables with Unicode borders
- **JSON** (--format json): Structured JSON output for programmatic use

## Examples

```bash
# Set up the CLI
export SUPERMEMORY_API_KEY="sk_live_..."

# View current project info
npm run dev -- project info

# List all memories
npm run dev -- memories list

# Upload a pattern
npm run dev -- patterns upload /path/to/pattern.mdx

# Get JSON output for scripts
npm run dev -- project info --format json | jq .apiKeyConfigured
```

## Architecture

- **services/config.ts** - Configuration management (loads from .env.local and .supermemoryrc)
- **services/supermemory.ts** - Supermemory API wrapper
- **commands/** - CLI command implementations
- **formatters/** - Output formatters (human-readable and JSON)
- **types.ts** - TypeScript types and interfaces

## Development

To add a new command:

1. Create a file in `src/commands/`
2. Implement using `Command.make()` with Effect
3. Add to the appropriate command group (or create a new one)
4. Register in `src/index.ts`

Example:

```typescript
export const newCommand = Command.make(
  'new-command',
  {
    myOption: Options.text('myOption'),
  },
  (options) =>
    Effect.gen(function* () {
      // Implementation here
    }),
);
```
