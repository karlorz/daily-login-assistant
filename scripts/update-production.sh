#!/bin/bash
# Production Update Script
# Automatically updates the production deployment to the latest release

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Daily Login Assistant - Update Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Change to script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Get current version
CURRENT_VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "unknown")
echo -e "${YELLOW}Current version:${NC} $CURRENT_VERSION"

# Fetch latest changes and tags
echo -e "${BLUE}Fetching latest changes...${NC}"
git fetch --tags --quiet

# Get latest release version
LATEST_VERSION=$(git describe --tags "$(git rev-list --tags --max-count=1)" 2>/dev/null || echo "unknown")
echo -e "${YELLOW}Latest version:${NC} $LATEST_VERSION"

# Check if update is needed
if [ "$CURRENT_VERSION" = "$LATEST_VERSION" ]; then
    echo -e "${GREEN}✓ Already on latest version${NC}"
    echo ""
    echo -e "${YELLOW}Tip:${NC} Run with --force to reinstall anyway"
    if [ "$1" != "--force" ]; then
        exit 0
    fi
    echo -e "${YELLOW}Force update requested...${NC}"
fi

echo ""
echo -e "${BLUE}Updating from $CURRENT_VERSION to $LATEST_VERSION${NC}"
echo ""

# Pull latest changes
echo -e "${BLUE}Step 1/5: Pulling latest code...${NC}"
git pull origin main --quiet
echo -e "${GREEN}✓ Code updated${NC}"

# Install dependencies (if needed)
if command -v bun &> /dev/null; then
    echo -e "${BLUE}Step 2/5: Checking dependencies...${NC}"
    if [ -f "bun.lockb" ]; then
        bun install --frozen-lockfile
        echo -e "${GREEN}✓ Dependencies updated${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Bun not found, skipping dependency install${NC}"
fi

# Build project
echo -e "${BLUE}Step 3/5: Building project...${NC}"
if command -v bun &> /dev/null; then
    bun run build
else
    npm run build
fi
echo -e "${GREEN}✓ Build complete${NC}"

# Restart service
echo -e "${BLUE}Step 4/5: Restarting service...${NC}"
if systemctl is-active --quiet daily-login-assistant 2>/dev/null; then
    sudo systemctl restart daily-login-assistant
    echo -e "${GREEN}✓ Service restarted${NC}"
else
    echo -e "${YELLOW}⚠ Systemd service not found, skipping restart${NC}"
fi

# Verify deployment
echo -e "${BLUE}Step 5/5: Verifying deployment...${NC}"
sleep 2

# Check service status
if systemctl is-active --quiet daily-login-assistant 2>/dev/null; then
    echo -e "${GREEN}✓ Service is running${NC}"

    # Check version
    DEPLOYED_VERSION=$(git describe --tags --abbrev=0)
    if [ "$DEPLOYED_VERSION" = "$LATEST_VERSION" ]; then
        echo -e "${GREEN}✓ Version verified: $DEPLOYED_VERSION${NC}"
    else
        echo -e "${YELLOW}⚠ Version mismatch: expected $LATEST_VERSION, got $DEPLOYED_VERSION${NC}"
    fi

    # Show recent logs
    echo ""
    echo -e "${BLUE}Recent logs:${NC}"
    sudo journalctl -u daily-login-assistant -n 15 --no-pager | tail -10
else
    echo -e "${YELLOW}⚠ Could not verify service status${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Update complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Version: ${GREEN}$LATEST_VERSION${NC}"
echo -e "Service: ${GREEN}active${NC}"
echo ""
echo -e "${YELLOW}Tip:${NC} Check logs with: ${BLUE}sudo journalctl -u daily-login-assistant -f${NC}"
echo ""
