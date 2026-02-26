# ep-cli Quick Start

## Install

```bash
# Install globally with bun (recommended)
bun add -g @effect-patterns/ep-cli

# Or with npm
npm install -g @effect-patterns/ep-cli
```

## First Commands

```bash
ep search "retry"
ep list --difficulty intermediate
ep show retry-based-on-specific-errors
```

## Authentication Options

Use one of these:

1. Environment variable:

```bash
export PATTERN_API_KEY=your_key
```

2. API key file:

```bash
export EP_API_KEY_FILE="$HOME/.config/ep-cli/api-key"
```

3. Config JSON:

```bash
mkdir -p "$HOME/.config/ep-cli"
cat > "$HOME/.config/ep-cli/config.json" <<'EOF'
{ "apiKey": "your_key" }
EOF
```

4. One-off secure stdin:

```bash
printf '%s' "$PATTERN_API_KEY" | ep --api-key-stdin search "error handling"
```

Resolution order is:

1. `PATTERN_API_KEY`
2. `EP_API_KEY_FILE`
3. `EP_CONFIG_FILE` or `~/.config/ep-cli/config.json`

## State and Path Defaults

- Installed-rules state:
  - `$XDG_STATE_HOME/ep-cli/installed-rules.json`
  - fallback: `~/.local/state/ep-cli/installed-rules.json`
  - override: `EP_INSTALLED_STATE_FILE`
- Skills directory:
  - override: `EP_SKILLS_DIR`
  - otherwise auto-discovered from current directory upward

## Useful Flags

```bash
ep search "layer" --json
ep install list --json
ep skills stats --json
LOG_LEVEL=debug ep skills stats
```

## Troubleshooting

- Unauthorized (`401`):
  - ensure one auth method above is configured
- Skills directory not found:
  - run from workspace root or set `EP_SKILLS_DIR`
- Need machine-readable output:
  - use `--json` on supported read commands

For full command docs, see `README.md`.
