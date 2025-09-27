#!/bin/bash

# Test Webhook Script for Daily Login Assistant
# Usage: ./test-webhook.sh [message] [title]

set -e

# Configuration
SHOUTRRR_PATH="${HOME}/.local/bin/shoutrrr"
WEBHOOK_URL="generic://localhost:3001?disabletls=yes&template=json"

# Default values
DEFAULT_TITLE="🧪 Test Notification"
DEFAULT_MESSAGE="Testing webhook functionality from script"

# Parse arguments
TITLE="${2:-$DEFAULT_TITLE}"
MESSAGE="${1:-$DEFAULT_MESSAGE}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Testing webhook notification...${NC}"
echo -e "${YELLOW}Title:${NC} $TITLE"
echo -e "${YELLOW}Message:${NC} $MESSAGE"
echo -e "${YELLOW}URL:${NC} $WEBHOOK_URL"
echo ""

# Check if shoutrrr exists
if [ ! -f "$SHOUTRRR_PATH" ]; then
    echo -e "${RED}❌ Error: shoutrrr not found at $SHOUTRRR_PATH${NC}"
    echo "Install shoutrrr first:"
    echo "  mkdir -p ~/.local/bin"
    echo "  cp shoutrrr ~/.local/bin/shoutrrr"
    echo "  chmod +x ~/.local/bin/shoutrrr"
    exit 1
fi

# Check if webhook listener is running
if ! curl -s "http://localhost:3001" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Webhook listener not running on localhost:3001${NC}"
    echo "Start the dev server first:"
    echo "  set -a && source .env.development && set +a && bun run dev"
    exit 1
fi

# Send notification
echo -e "${BLUE}📤 Sending notification...${NC}"
if "$SHOUTRRR_PATH" send --verbose --url "$WEBHOOK_URL" --title "$TITLE" --message "$MESSAGE"; then
    echo ""
    echo -e "${GREEN}✅ Notification sent successfully!${NC}"
    echo -e "${YELLOW}Check the dev server console for:${NC}"
    echo "  📧 Webhook received: $TITLE - $MESSAGE"
    echo ""
    echo -e "${YELLOW}Check the log file:${NC}"
    echo "  cat /tmp/daily-login-notifications.log"
else
    echo -e "${RED}❌ Failed to send notification${NC}"
    exit 1
fi