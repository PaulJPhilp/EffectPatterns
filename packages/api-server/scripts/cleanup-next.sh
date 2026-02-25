#!/bin/bash
# Cleanup script for Next.js development artifacts and port conflicts
# Usage: npm run cleanup:next

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🧹 Cleaning Next.js artifacts and freeing ports..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Kill running processes
echo -e "${YELLOW}1. Stopping running processes...${NC}"
pkill -f "next dev" 2>/dev/null || true
pkill -f "bun run dev" 2>/dev/null || true
pkill -f "node.*dev" 2>/dev/null || true
sleep 1
echo -e "${GREEN}   ✓ Processes stopped${NC}"

# 2. Remove lock files and cache
echo -e "${YELLOW}2. Removing .next directory...${NC}"
rm -rf .next/dev/lock 2>/dev/null || true
rm -rf .next 2>/dev/null || true
echo -e "${GREEN}   ✓ Cache cleared${NC}"

# 3. Free test ports
echo -e "${YELLOW}3. Freeing ports 3000-3005...${NC}"
ports_freed=0
for port in 3000 3001 3002 3003 3004 3005; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    ports_freed=$((ports_freed + 1))
  fi
done
sleep 1
echo -e "${GREEN}   ✓ Freed $ports_freed port(s)${NC}"

# 4. Verify cleanup
echo -e "${YELLOW}4. Verifying ports...${NC}"
all_clear=true
for port in 3000 3001 3002 3003 3004 3005; do
  if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "   ${GREEN}✓${NC} Port $port"
  else
    echo -e "   ${RED}✗${NC} Port $port still in use"
    all_clear=false
  fi
done

if [ "$all_clear" = true ]; then
  echo ""
  echo -e "${GREEN}✓ Cleanup complete! Ready for development.${NC}"
  echo ""
  echo "Next steps:"
  echo "  npm run dev              # Start development server"
  echo "  npm run test:stress      # Run all stress tests"
  exit 0
else
  echo ""
  echo -e "${RED}⚠ Some ports still in use. Please investigate manually.${NC}"
  echo ""
  echo "Debug info:"
  for port in 3000 3001 3002 3003 3004 3005; do
    echo "Port $port:"
    lsof -i :$port 2>/dev/null || echo "  (free)"
  done
  exit 1
fi
