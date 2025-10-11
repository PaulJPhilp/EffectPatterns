#!/usr/bin/env bash

#
# API Key Rotation Helper Script
#
# Generates secure API keys and provides rotation instructions
#
# Usage:
#   ./scripts/rotate-api-key.sh [environment]
#
# Example:
#   ./scripts/rotate-api-key.sh staging
#   ./scripts/rotate-api-key.sh production
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Arguments
ENVIRONMENT="${1:-staging}"
TIMESTAMP=$(date +%Y%m%d)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔐 API Key Rotation - $ENVIRONMENT${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}Error: Environment must be 'staging' or 'production'${NC}"
    exit 1
fi

# Generate new key
echo -e "${YELLOW}Generating secure API key...${NC}"
NEW_KEY=$(openssl rand -hex 32)
KEY_PREFIX=${NEW_KEY:0:8}

echo -e "${GREEN}✅ New key generated: ${KEY_PREFIX}...${NC}"
echo ""

# Save to temporary secure file
TEMP_FILE=$(mktemp)
chmod 600 "$TEMP_FILE"
echo "$NEW_KEY" > "$TEMP_FILE"

# Display rotation instructions
echo -e "${BLUE}📋 Rotation Instructions${NC}"
echo -e "${BLUE}=========================${NC}"
echo ""

echo -e "${YELLOW}Phase 1: Add New Key (Do Now)${NC}"
echo "1. Add new key to Vercel as secondary key:"
echo -e "   ${GREEN}vercel env add PATTERN_API_KEY_NEW $ENVIRONMENT${NC}"
echo "   Value: $NEW_KEY"
echo ""

echo "2. Deploy application with dual-key support:"
echo -e "   ${GREEN}cd services/mcp-server${NC}"
echo -e "   ${GREEN}vercel --env $ENVIRONMENT${NC}"
echo ""

echo "3. Verify both keys work:"
echo -e "   ${GREEN}bun run smoke-test https://your-deployment.vercel.app $NEW_KEY${NC}"
echo ""

echo -e "${YELLOW}Phase 2: Update Clients (Next 7 Days)${NC}"
echo "4. Update GitHub Actions secret:"
ENV_VAR="${ENVIRONMENT^^}_API_KEY"
echo -e "   ${GREEN}gh secret set $ENV_VAR --body \"$NEW_KEY\"${NC}"
echo ""

echo "5. Update local .env files:"
echo -e "   ${GREEN}echo \"PATTERN_API_KEY=$NEW_KEY\" > services/mcp-server/.env.$ENVIRONMENT${NC}"
echo ""

echo "6. Notify team members to update their local keys"
echo ""

echo -e "${YELLOW}Phase 3: Complete Rotation (After 7 Days)${NC}"
echo "7. Remove old primary key:"
echo -e "   ${GREEN}vercel env rm PATTERN_API_KEY $ENVIRONMENT${NC}"
echo ""

echo "8. Remove secondary key:"
echo -e "   ${GREEN}vercel env rm PATTERN_API_KEY_NEW $ENVIRONMENT${NC}"
echo ""

echo "9. Add new key as primary:"
echo -e "   ${GREEN}vercel env add PATTERN_API_KEY $ENVIRONMENT${NC}"
echo "   Value: $NEW_KEY"
echo ""

echo "10. Deploy with single key:"
echo -e "    ${GREEN}vercel --env $ENVIRONMENT${NC}"
echo ""

# Update rotation log
ROTATION_LOG="services/mcp-server/API_KEY_ROTATION_LOG.md"

if [ ! -f "$ROTATION_LOG" ]; then
    cat > "$ROTATION_LOG" <<EOF
# API Key Rotation History

## Staging Environment

| Date       | Action  | Key ID (first 8 chars) | Rotated By | Reason       |
|------------|---------|------------------------|------------|--------------|

## Production Environment

| Date       | Action  | Key ID (first 8 chars) | Rotated By | Reason       |
|------------|---------|------------------------|------------|--------------|
EOF
fi

# Add rotation entry
ROTATED_BY="${USER:-Unknown}"
if [[ "$ENVIRONMENT" == "staging" ]]; then
    # Find the line after "## Staging Environment"
    sed -i.bak "/## Staging Environment/,/^$/s/|------------|/|------------|\\n| $TIMESTAMP | Rotated | $KEY_PREFIX               | $ROTATED_BY | Scheduled    |/" "$ROTATION_LOG"
else
    # Find the line after "## Production Environment"
    sed -i.bak "/## Production Environment/,/^$/s/|------------|/|------------|\\n| $TIMESTAMP | Rotated | $KEY_PREFIX               | $ROTATED_BY | Scheduled    |/" "$ROTATION_LOG"
fi

rm -f "$ROTATION_LOG.bak"

echo -e "${GREEN}✅ Rotation log updated: $ROTATION_LOG${NC}"
echo ""

# Copy to clipboard if available
if command -v pbcopy &> /dev/null; then
    echo "$NEW_KEY" | pbcopy
    echo -e "${GREEN}✅ New key copied to clipboard (macOS)${NC}"
elif command -v xclip &> /dev/null; then
    echo "$NEW_KEY" | xclip -selection clipboard
    echo -e "${GREEN}✅ New key copied to clipboard (Linux)${NC}"
elif command -v clip.exe &> /dev/null; then
    echo "$NEW_KEY" | clip.exe
    echo -e "${GREEN}✅ New key copied to clipboard (Windows/WSL)${NC}"
fi

echo ""
echo -e "${BLUE}📁 Key Information${NC}"
echo -e "${BLUE}==================${NC}"
echo "Environment: $ENVIRONMENT"
echo "Key ID: $KEY_PREFIX..."
echo "Generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "Temporary file: $TEMP_FILE"
echo ""

echo -e "${YELLOW}⚠️  Security Reminders${NC}"
echo "• Store key in secure password manager (1Password, LastPass, etc.)"
echo "• Delete temporary file after adding to Vercel:"
echo -e "  ${GREEN}rm $TEMP_FILE${NC}"
echo "• Monitor logs during migration period"
echo "• Complete Phase 3 after 7 days to remove old key"
echo ""

echo -e "${GREEN}✨ Rotation initiated successfully!${NC}"
