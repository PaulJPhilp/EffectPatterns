#!/bin/bash
# Health check script for Effect Patterns Hub services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Services to check (update these URLs after deployment)
SERVICES=(
  "https://effect-patterns-mcp.vercel.app/health:MCP Server"
  "https://effect-patterns-code-assistant.vercel.app/api/health:Code Assistant"
  "https://effect-patterns-web.vercel.app/:Web App"
)

# Function to check a single service
check_service() {
  local url=$1
  local name=$2

  echo -n "Checking $name... "

  if curl -f -s --max-time 10 "$url" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Healthy${NC}"
    return 0
  else
    echo -e "${RED}❌ Unhealthy${NC}"
    return 1
  fi
}

# Main health check
echo "🔍 Effect Patterns Hub Health Check"
echo "===================================="

failed_services=()
total_services=${#SERVICES[@]}
healthy_count=0

for service in "${SERVICES[@]}"; do
  IFS=':' read -r url name <<< "$service"

  if check_service "$url" "$name"; then
    ((healthy_count++))
  else
    failed_services+=("$name")
  fi
done

echo ""
echo "📊 Health Check Summary"
echo "======================="
echo "Healthy services: $healthy_count/$total_services"

if [ ${#failed_services[@]} -eq 0 ]; then
  echo -e "${GREEN}🎉 All services are healthy!${NC}"
  exit 0
else
  echo -e "${RED}❌ Failed services: ${failed_services[*]}${NC}"
  exit 1
fi