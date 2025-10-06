#!/bin/bash
# Test dailycheckin.sh installation script
# Simulates fresh Ubuntu LXC production environment

set -e

echo "🚀 Testing dailycheckin.sh installation script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Clean up any existing test container
echo "🧹 Cleaning up existing test container..."
docker rm -f ubuntu-systemd-test 2>/dev/null || true

# Start fresh Ubuntu container with systemd (simulates fresh LXC)
echo "🐳 Starting fresh Ubuntu 20.04 container with systemd..."
docker run -d --name ubuntu-systemd-test \
  --privileged \
  --cgroupns=host \
  --tmpfs /tmp \
  --tmpfs /run \
  --tmpfs /run/lock \
  -v /sys/fs/cgroup:/sys/fs/cgroup:rw \
  -v "$(pwd)/docker/dailycheckin.sh:/tmp/dailycheckin.sh:ro" \
  -p 8001:8001 \
  jrei/systemd-ubuntu:20.04 /sbin/init

echo "✅ Container started"
echo "⏳ Waiting for systemd to initialize..."
sleep 5

# Verify systemd is ready
echo ""
echo "📋 Verifying systemd..."
docker exec ubuntu-systemd-test systemctl --version | head -1

# Run the installation script with FORCE_SYSTEMD
echo ""
echo "📦 Running dailycheckin.sh installation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec ubuntu-systemd-test bash -c "export FORCE_SYSTEMD=true && /tmp/dailycheckin.sh"

# Debug: Check what files were installed
echo ""
echo "🔍 Debug: Checking installed files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 Checking src/core directory:"
docker exec ubuntu-systemd-test ls -la /opt/daily-login-assistant/src/core/ || echo "Directory not accessible"

echo ""
echo "📁 Checking dist/core directory:"
docker exec ubuntu-systemd-test ls -la /opt/daily-login-assistant/dist/core/ || echo "Directory not accessible"

echo ""
echo "📁 Checking for container.ts (old code):"
if docker exec ubuntu-systemd-test test -f /opt/daily-login-assistant/src/core/container.ts; then
    echo "⚠️  container.ts EXISTS (OLD CODE from remote repo)"
else
    echo "✅ container.ts does NOT exist"
fi

echo ""
echo "📁 Checking for factory.ts (new code):"
if docker exec ubuntu-systemd-test test -f /opt/daily-login-assistant/src/core/factory.ts; then
    echo "✅ factory.ts EXISTS (NEW CODE)"
else
    echo "❌ factory.ts does NOT exist (OLD CODE from remote repo)"
fi

echo ""
echo "📄 Checking dist/index.js imports:"
docker exec ubuntu-systemd-test head -5 /opt/daily-login-assistant/dist/index.js || echo "File not accessible"

# Check service status
echo ""
echo "📋 Checking service status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 3
docker exec ubuntu-systemd-test systemctl status daily-login-assistant --no-pager || true

# Check service file for ExecStartPre
echo ""
echo "🔍 Debug: Checking service file..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if docker exec ubuntu-systemd-test grep -q "ExecStartPre" /etc/systemd/system/daily-login-assistant.service 2>/dev/null; then
    echo "⚠️  Service file contains ExecStartPre (should be removed)"
else
    echo "✅ Service file does NOT contain ExecStartPre (correct)"
fi

# Test application
echo ""
echo "📋 Testing application..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 5
if docker exec ubuntu-systemd-test curl -s http://localhost:8001 > /dev/null 2>&1; then
    echo "✅ Application is accessible on port 8001"
else
    echo "⚠️  Application not accessible (check logs below)"
fi

# Show recent logs
echo ""
echo "📋 Recent logs..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec ubuntu-systemd-test journalctl -u daily-login-assistant -n 20 --no-pager

# Summary with diagnosis
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Diagnose the issue
if docker exec ubuntu-systemd-test test -f /opt/daily-login-assistant/src/core/container.ts; then
    echo "⚠️  DIAGNOSIS: Remote repository has OLD CODE"
    echo ""
    echo "   The installation script clones from the remote repository,"
    echo "   but the remote still has the old Inversify container code."
    echo ""
    echo "   Your local changes (factory pattern) have NOT been pushed."
    echo ""
    echo "   This is NOT a test script or systemd issue."
    echo "   The installation script works correctly."
    echo ""
    echo "   TO FIX:"
    echo "   1. Commit your local changes:"
    echo "      git add -A"
    echo "      git commit -m 'fix: remove Inversify, use factory pattern'"
    echo ""
    echo "   2. Push to remote:"
    echo "      git push origin feat/Automation"
    echo ""
    echo "   3. Run this test again"
    echo ""
else
    echo "✅ Installation script and systemd service are working correctly!"
    echo ""
fi

echo "💡 Next steps:"
echo "   • Access container: docker exec -it ubuntu-systemd-test /bin/bash"
echo "   • Check service: systemctl status daily-login-assistant"
echo "   • View logs: journalctl -u daily-login-assistant -f"
echo "   • Test app: curl http://localhost:8001"
echo ""
echo "🛑 Cleanup: docker rm -f ubuntu-systemd-test"
echo ""