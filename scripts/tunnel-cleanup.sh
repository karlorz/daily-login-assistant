#!/bin/bash
# Clean up all SSH tunnels and Chrome instances for port 9222

echo "🧹 Cleaning up SSH tunnels and Chrome instances..."

# Kill SSH tunnels
pkill -f "ssh.*-R.*9222.*tunnel@localhost" 2>/dev/null && echo "✅ Killed SSH tunnel processes" || echo "ℹ️  No SSH tunnels to kill"

# Kill Chrome with debug port
pkill -f "Chrome.*remote-debugging-port.*9222" 2>/dev/null && echo "✅ Killed Chrome debug processes" || echo "ℹ️  No Chrome debug processes to kill"

# Restart SSH container to clear port bindings
docker compose restart ssh-tunnel >/dev/null 2>&1 && echo "✅ Restarted SSH container" || echo "⚠️  Could not restart SSH container"

echo ""
echo "✅ Cleanup complete! You can now run the launcher script."
