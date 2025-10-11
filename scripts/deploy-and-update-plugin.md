#!/usr/bin/env bash
set -euo pipefail

# deploy_and_update_plugin.sh
# Usage:
#   VERCEL_TOKEN=... PLUGIN_REPO_DIR=/path/to/repo GITHUB_REPO=owner/repo PATTERN_API_KEY=test-api-key ./scripts/deploy_and_update_plugin.sh
#
# Requirements:
# - Vercel CLI installed and in PATH (https://vercel.com/docs/cli)
# - jq installed
# - git configured with push access
#
# What it does:
# 1) deploys services/mcp-server to Vercel (preview)
# 2) updates .claude-plugin/plugins/effect-patterns/plugin.json -> mcp url
# 3) commits changes on branch staging/claude-plugin-preview-<ts> and pushes to origin
# 4) prints Claude /plugin commands to run

: "${VERCEL_TOKEN:?Please set VERCEL_TOKEN}"
: "${PLUGIN_REPO_DIR:?Please set PLUGIN_REPO_DIR (path to plugin repo root)}"
: "${GITHUB_REPO:?Please set GITHUB_REPO (owner/repo)}"
: "${PATTERN_API_KEY:?Please set PATTERN_API_KEY for staging (we will remind you to configure it in Vercel)}"

# basic checks
if ! command -v vercel >/dev/null 2>&1; then
  echo "vercel CLI not found. Install: npm i -g vercel"
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq not found. Install: apt-get install jq or brew install jq"
  exit 1
fi

echo "Deploying MCP server (services/mcp-server) to Vercel preview..."
pushd "$PLUGIN_REPO_DIR/services/mcp-server" >/dev/null

# Use vercel deploy with JSON output to parse preview URL
# This will create a preview deployment for the current git branch
DEPLOY_OUTPUT=$(VERCEL_TOKEN="$VERCEL_TOKEN" vercel --confirm --output=json 2>&1) || {
  echo "Vercel deploy failed. Output:"
  echo "$DEPLOY_OUTPUT"
  exit 1
}

# try to extract url field – CLI outputs either {url: "..."} or an array
PREVIEW_URL=$(echo "$DEPLOY_OUTPUT" | jq -r 'if type=="array" then .[0].url // .[0].preview_url else .url // .preview_url end')

if [ -z "$PREVIEW_URL" ] || [ "$PREVIEW_URL" == "null" ]; then
  echo "Could not parse preview URL from Vercel output. Dumping output:"
  echo "$DEPLOY_OUTPUT"
  popd >/dev/null
  exit 1
fi

echo "Preview URL: $PREVIEW_URL"
popd >/dev/null

# Update plugin.json in the repo
pushd "$PLUGIN_REPO_DIR" >/dev/null

BRANCH_NAME="staging/claude-plugin-preview-$(date +%s)"
echo "Creating branch $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

PLUGIN_JSON_PATH=".claude-plugin/plugins/effect-patterns/plugin.json"
if [ ! -f "$PLUGIN_JSON_PATH" ]; then
  echo "ERROR: $PLUGIN_JSON_PATH not found in $PLUGIN_REPO_DIR"
  popd >/dev/null
  exit 1
fi

# Replace placeholder or set the url field directly using jq
TMP_FILE="$(mktemp)"
jq --arg url "${PREVIEW_URL%/}" '.mcpServers["effect-patterns-server"].url = ($url + "/api")' "$PLUGIN_JSON_PATH" > "$TMP_FILE" \
  && mv "$TMP_FILE" "$PLUGIN_JSON_PATH"

git add "$PLUGIN_JSON_PATH"
git commit -m "chore: update plugin.json with staging MCP URL ($PREVIEW_URL)"
git push --set-upstream origin "$BRANCH_NAME"

echo "Updated plugin.json committed and pushed to branch $BRANCH_NAME."

# Reminder: set PATTERN_API_KEY in the Vercel project preview environment.
echo ""
echo "IMPORTANT: Set the PATTERN_API_KEY env var for the deployed preview on Vercel:"
echo "  - Go to your project in Vercel, open the Environment Variables settings, and add PATTERN_API_KEY for the Preview environment."
echo "  - Or use the Vercel dashboard to add it for the preview deployment."
echo ""
echo "If you want to set it via Vercel CLI, you can run (interactive):"
echo "  vercel env add PATTERN_API_KEY preview"
echo "and paste the value when prompted."
echo ""

# Print the /plugin commands for Claude
OWNER=$(echo "$GITHUB_REPO" | cut -d'/' -f1)
REPO=$(echo "$GITHUB_REPO" | cut -d'/' -f2)
echo "To install plugin inside Claude Code (staging/dev):"
echo "  /plugin marketplace add ${OWNER}/${REPO}"
echo "  /plugin install effect-patterns"
echo ""
echo "Plugin repo branch with plugin.json updates pushed: $BRANCH_NAME"
echo "Preview MCP URL: $PREVIEW_URL"
echo ""

popd >/dev/null

echo "Done."