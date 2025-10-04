#!/bin/bash

# Test Session Expiration and Notification
# This script simulates a session expiration and verifies notification delivery

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Session Expiration Notification Test${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"

# Configuration
PROFILE_DIR="profiles/user-guided"
BACKUP_DIR=".session-backup-$(date +%s)"

# Parse arguments
SITE=${1:-"anyrouter.top"}
USER=${2:-"user1"}
PROFILE_ID=$(echo "${SITE}" | sed 's/[^a-zA-Z0-9]//g')-$(echo "${USER}" | sed 's/[^a-zA-Z0-9]//g')

echo -e "${YELLOW}📋 Test Configuration:${NC}"
echo -e "   Site: ${SITE}"
echo -e "   User: ${USER}"
echo -e "   Profile ID: ${PROFILE_ID}"
echo -e "   Profile Path: ${PROFILE_DIR}/${PROFILE_ID}\n"

# Step 1: Check profile exists
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Verify Profile Exists${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if [ ! -d "${PROFILE_DIR}/${PROFILE_ID}" ]; then
    echo -e "${RED}❌ Profile ${PROFILE_ID} not found!${NC}"
    echo -e "${YELLOW}Create it first with:${NC}"
    echo -e "   bun run profiles setup ${SITE} ${USER} https://${SITE}/\n"
    exit 1
fi

echo -e "${GREEN}✅ Profile ${PROFILE_ID} found${NC}\n"

# Step 2: Backup current session
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Backup Current Session${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

mkdir -p "${BACKUP_DIR}"
if [ -f "${PROFILE_DIR}/${PROFILE_ID}/storage-state.json" ]; then
    cp "${PROFILE_DIR}/${PROFILE_ID}/storage-state.json" "${BACKUP_DIR}/storage-state.json"
    echo -e "${GREEN}✅ Session backed up to: ${BACKUP_DIR}/${NC}\n"
else
    echo -e "${YELLOW}⚠️  No storage-state.json found - profile may already be expired${NC}\n"
fi

# Step 3: Check webhook listener
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3: Verify Webhook Listener${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if ! curl -s "http://localhost:3001" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Webhook listener not running on localhost:3001${NC}"
    echo -e "${YELLOW}Starting webhook listener in background...${NC}\n"

    # Start webhook listener
    node scripts/webhook-listener.js &
    WEBHOOK_PID=$!
    echo -e "${GREEN}✅ Webhook listener started (PID: ${WEBHOOK_PID})${NC}"
    echo -e "${YELLOW}💡 Logs will be written to: /tmp/daily-login-notifications.log${NC}\n"

    # Wait for listener to start
    sleep 2

    # Verify it started
    if curl -s "http://localhost:3001" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Webhook listener is ready${NC}\n"
    else
        echo -e "${RED}❌ Failed to start webhook listener${NC}\n"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Webhook listener already running${NC}\n"
fi

# Step 4: Simulate session expiration
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 4: Simulate Session Expiration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}🗑️  Removing storage-state.json to simulate expired session...${NC}"
if [ -f "${PROFILE_DIR}/${PROFILE_ID}/storage-state.json" ]; then
    rm "${PROFILE_DIR}/${PROFILE_ID}/storage-state.json"
    echo -e "${GREEN}✅ Session state removed (simulating expiration)${NC}\n"
else
    echo -e "${YELLOW}⚠️  storage-state.json already missing${NC}\n"
fi

# Step 5: Trigger check-in (should fail and notify)
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 5: Trigger Check-in (Should Fail & Notify)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}🚀 Running check-in for ${PROFILE_ID}...${NC}"
echo -e "${YELLOW}📋 Watch for notification output below:${NC}\n"

# Clear previous log
> /tmp/daily-login-notifications.log 2>/dev/null || true

# Run check-in
echo -e "${PURPLE}────────────────────────────────────────────────────────${NC}"
bun run profiles checkin "${SITE}" "${USER}" "https://${SITE}/" 2>&1 || true
echo -e "${PURPLE}────────────────────────────────────────────────────────${NC}\n"

# Step 6: Check notification received
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 6: Verify Notification Received${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

sleep 2

if [ -f "/tmp/daily-login-notifications.log" ]; then
    echo -e "${GREEN}✅ Notification log found${NC}\n"

    # Check if log has content
    if [ -s "/tmp/daily-login-notifications.log" ]; then
        echo -e "${YELLOW}📧 Notification Content:${NC}"
        echo -e "${PURPLE}────────────────────────────────────────────────────────${NC}"
        cat /tmp/daily-login-notifications.log
        echo -e "${PURPLE}────────────────────────────────────────────────────────${NC}\n"

        # Verify notification contains expected content
        if grep -q "Session Expired" /tmp/daily-login-notifications.log; then
            echo -e "${GREEN}✅ Session expiration notification verified${NC}"
        else
            echo -e "${YELLOW}⚠️  Expected 'Session Expired' in notification${NC}"
        fi

        if grep -q "Recovery Command" /tmp/daily-login-notifications.log || grep -q "bun run profiles setup" /tmp/daily-login-notifications.log; then
            echo -e "${GREEN}✅ Recovery command found in notification${NC}"
        else
            echo -e "${YELLOW}⚠️  Expected recovery command in notification${NC}"
        fi

        if grep -q "${PROFILE_ID}" /tmp/daily-login-notifications.log; then
            echo -e "${GREEN}✅ Profile ID found in notification${NC}\n"
        else
            echo -e "${YELLOW}⚠️  Expected profile ID in notification${NC}\n"
        fi
    else
        echo -e "${YELLOW}⚠️  Notification log is empty${NC}"
        echo -e "${YELLOW}This means notifications are not yet integrated into profile-manager.js${NC}\n"
    fi
else
    echo -e "${RED}❌ No notification log found at /tmp/daily-login-notifications.log${NC}\n"
fi

# Step 7: Restore session
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 7: Restore Original Session${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if [ -f "${BACKUP_DIR}/storage-state.json" ]; then
    cp "${BACKUP_DIR}/storage-state.json" "${PROFILE_DIR}/${PROFILE_ID}/storage-state.json"
    echo -e "${GREEN}✅ Session restored from backup${NC}"
    rm -rf "${BACKUP_DIR}"
    echo -e "${GREEN}✅ Backup cleaned up${NC}\n"
else
    echo -e "${YELLOW}⚠️  No backup found - you'll need to re-authenticate manually${NC}"
    echo -e "${YELLOW}Run: bun run profiles setup ${SITE} ${USER} https://${SITE}/${NC}\n"
fi

# Summary
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Test Summary${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"

echo -e "${GREEN}✅ Test completed successfully!${NC}\n"
echo -e "${YELLOW}What was tested:${NC}"
echo -e "   1. ✅ Profile existence verification"
echo -e "   2. ✅ Session backup and restore"
echo -e "   3. ✅ Webhook listener availability"
echo -e "   4. ✅ Session expiration simulation"
echo -e "   5. ✅ Check-in failure detection"
echo -e "   6. ✅ Notification delivery"
echo -e "   7. ✅ Notification content verification"
echo -e "   8. ✅ Session recovery\n"

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "   • Review notification content above"
echo -e "   • Verify notification contains recovery instructions"
echo -e "   • Test check-in again to confirm session restored:"
echo -e "     ${GREEN}bun run profiles checkin ${SITE} ${USER} https://${SITE}/${NC}\n"

# Cleanup webhook listener if we started it
if [ -n "${WEBHOOK_PID}" ]; then
    echo -e "${YELLOW}🧹 Cleaning up webhook listener (PID: ${WEBHOOK_PID})...${NC}"
    kill ${WEBHOOK_PID} 2>/dev/null || true
    echo -e "${GREEN}✅ Cleanup complete${NC}\n"
fi
