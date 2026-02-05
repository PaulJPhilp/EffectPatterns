# Gemini Integration

This document provides information about Google Gemini integration with the Effect Patterns project.

## AI Model Support

The Effect Patterns project supports Google Gemini for various AI-powered features, pattern analysis, and automated fixes.

### Quick Start

1. **Configure API Key**

   ```bash
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```

2. **Inject Rules into GEMINI.md**

   ```bash
   # Add Effect patterns to this file for Gemini's context
   ./ep-admin config install add --tool gemini
   ```

3. **Use with CLI Commands**

   ```bash
   # Ingest raw patterns
   ./ep-admin data ingest process
   
   # Run AI-powered autofix for TypeScript errors
   ./ep-admin dev autofix prepublish --ai-call --provider google
   ```

## Supported Models

- **Gemini 2.5 Flash** (Recommended) - State-of-the-art for large-scale processing and agentic tasks.
- **Gemini 2.0 Flash** - High-speed, low-latency model for most tasks.
- **Gemini Pro** - Higher quality for complex architectural analysis.
- **Gemini 1.5 Flash** - Legacy support for stable workflows.

## Features

### 1. Pattern Generation & Analysis

Create and analyze Effect-TS patterns using Gemini's reasoning capabilities.

```bash
# Generate documentation from published patterns
./ep-admin publish generate

# Search for patterns
./ep-admin pattern search "Error management"
```

### 2. AI-Powered Autofix

Automatically fix TypeScript errors in patterns before publishing using Gemini 2.5 Flash.

```bash
# Call Gemini to generate fixes for prepublish errors
./ep-admin dev autofix prepublish --ai-call --provider google --model gemini-2.5-flash
```

### 3. Gemini Skills Generation

Generate structured "Skills" that enhance Gemini's understanding of specific Effect-TS categories.

```bash
# Generate Gemini skills for all categories
./ep-admin config install skills --format gemini
```

*Skills are generated in `content/published/skills/gemini/` as `skill.json` and `system-prompt.txt`.*

### 4. Rule Injection

Inject curated Effect-TS rules directly into your environment or project-level `GEMINI.md`.

```bash
# Inject beginner level rules
./ep-admin config install add --tool gemini --skill-level beginner
```

## Configuration

Environment variables for Gemini (set in `.env`):

```bash
GOOGLE_API_KEY=your_api_key
```

*Note: Model selection is handled via CLI flags or defaults to `gemini-2.5-flash`.*

## CLI Reference

| Command | Description |
|---------|-------------|
| `./ep-admin config install add --tool gemini` | Inject patterns into GEMINI.md |
| `./ep-admin config install skills --format gemini` | Generate Gemini-compatible skills |
| `./ep-admin dev autofix prepublish --ai-call` | Fix errors using Gemini |
| `./ep-admin publish generate` | Generate documentation from patterns |
| `./ep-admin data qa process` | Run QA suite for patterns |
| `./ep-admin data ingest pipeline` | Run full ingest pipeline |

## Best Practices

1. **Use Gemini 2.5 Flash**: It provides the best performance/cost ratio for agentic workflows in 2026.
2. **Inject Rules**: Always run `./ep-admin config install add --tool gemini` in your project to give Gemini the latest context.
3. **Review AI Fixes**: When using `autofix`, always review the generated changes before committing.
4. **Skills for Context**: Use the generated `system-prompt.txt` from skills to prime Gemini for specific tasks (e.g., error management).

## Troubleshooting

1. **API Key Issues**: Verify your `GOOGLE_API_KEY` in your `.env` or environment.
2. **Model Availability**: If `gemini-2.5-flash` is unavailable, fall back to `gemini-2.0-flash`.
3. **Rate Limiting**: Free tier is limited to 60 RPM. Use the CLI's built-in batching where available.

---

*See [AGENTS.md](./AGENTS.md) for complete agent documentation.*
