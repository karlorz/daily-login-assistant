#!/bin/bash
# Auto-generated PWA Script Launcher
# Session: {{SESSION_TOKEN}}
set -e

# Configuration (server-injected)
SESSION_TOKEN="{{SESSION_TOKEN}}"
REMOTE_SSH_HOST="{{REMOTE_SSH_HOST}}"
REMOTE_SSH_PORT={{REMOTE_SSH_PORT}}
REMOTE_SSH_USER="{{REMOTE_SSH_USER}}"
API_ENDPOINT="{{API_ENDPOINT}}"
DEBUG_PORT=9222
SSH_PASSWORD="{{SSH_PASSWORD}}"

# 1. Find Chrome
echo "INFO: Locating Google Chrome..."
CHROME_PATHS=(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "/usr/bin/google-chrome-stable"
  "/usr/bin/google-chrome"
  "/usr/bin/chromium-browser"
)
for p in "${CHROME_PATHS[@]}"; do
  [ -x "$p" ] && CHROME_EXEC="$p" && break
done

if [ -z "$CHROME_EXEC" ]; then
  echo "ERROR: Google Chrome not found. Please install Chrome and try again."
  exit 1
fi

# 2. Check port availability
if lsof -i -P -n | grep -q ":${DEBUG_PORT}.*LISTEN"; then
    echo "ERROR: Port ${DEBUG_PORT} is already in use."
    echo "Please close the application using port ${DEBUG_PORT} and re-run the script."
    exit 1
fi

# 3. Launch Chrome with remote debugging
echo "INFO: Starting Chrome with remote debugging on port ${DEBUG_PORT}..."
# Use persistent profile directory (session-specific to avoid conflicts)
PROFILE_DIR="$HOME/.anyrouter-chrome-profile-${SESSION_TOKEN}"
mkdir -p "$PROFILE_DIR"

# Create "First Run" sentinel file to suppress first-run wizard
touch "$PROFILE_DIR/First Run"

# Create Preferences file with first-run suppression settings
cat > "$PROFILE_DIR/Preferences" <<'EOF'
{
  "distribution": {
    "skip_first_run_ui": true,
    "suppress_first_run_bubble": true,
    "do_not_launch_chrome": false
  },
  "browser": {
    "has_seen_welcome_page": true,
    "check_default_browser": false
  },
  "sync_promo": {
    "show_on_first_run_allowed": false
  },
  "profile": {
    "default_content_setting_values": {
      "notifications": 1
    }
  }
}
EOF

"$CHROME_EXEC" --remote-debugging-port=${DEBUG_PORT} \
  --user-data-dir="$PROFILE_DIR" \
  --remote-allow-origins={{ALLOWED_ORIGIN}},http://ssh-tunnel:9222 \
  --no-first-run \
  --disable-fre \
  --no-default-browser-check \
  --disable-sync \
  --disable-features=TranslateUI \
  --disable-popup-blocking &
CHROME_PID=$!

# 4. Establish SSH reverse tunnel
echo "INFO: Establishing secure tunnel to our servers..."

# Try SSH key authentication first (non-interactive)
if ssh -o BatchMode=yes -o ConnectTimeout=5 -p ${REMOTE_SSH_PORT} ${REMOTE_SSH_USER}@${REMOTE_SSH_HOST} exit 2>/dev/null; then
  echo "INFO: Using SSH key authentication"
  ssh -R 0.0.0.0:${DEBUG_PORT}:localhost:${DEBUG_PORT} \
    -N -f \
    -o BatchMode=yes \
    -o ExitOnForwardFailure=yes \
    -p ${REMOTE_SSH_PORT} \
    ${REMOTE_SSH_USER}@${REMOTE_SSH_HOST}
  SSH_PID=$!
elif [ -n "${SSH_PASSWORD}" ] && command -v sshpass >/dev/null 2>&1; then
  # Use sshpass for automated password authentication if password is provided
  echo "INFO: Using password authentication"
  sshpass -p "${SSH_PASSWORD}" ssh -R 0.0.0.0:${DEBUG_PORT}:localhost:${DEBUG_PORT} \
    -N -f \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ExitOnForwardFailure=yes \
    -p ${REMOTE_SSH_PORT} \
    ${REMOTE_SSH_USER}@${REMOTE_SSH_HOST}
  SSH_PID=$!
else
  # Fallback: Manual authentication (will use SSH agent or prompt for password)
  echo "INFO: Attempting manual authentication (SSH agent or password prompt)"
  ssh -R 0.0.0.0:${DEBUG_PORT}:localhost:${DEBUG_PORT} \
    -N -f \
    -o ExitOnForwardFailure=yes \
    -p ${REMOTE_SSH_PORT} \
    ${REMOTE_SSH_USER}@${REMOTE_SSH_HOST}
  SSH_PID=$!
fi

# Cleanup function to kill both Chrome and SSH tunnel
cleanup() {
  echo "INFO: Cleaning up..."

  # Kill local Chrome process
  if [ -n "$CHROME_PID" ]; then
    kill $CHROME_PID 2>/dev/null || true
  fi

  # Kill local SSH tunnel process
  pkill -f "ssh.*-R ${DEBUG_PORT}:localhost:${DEBUG_PORT}.*${REMOTE_SSH_PORT}.*${REMOTE_SSH_USER}@${REMOTE_SSH_HOST}" 2>/dev/null || true

  # CRITICAL: Kill remote SSH tunnel (the sshd process listening on port 9222)
  # This is necessary because -f daemonizes the SSH connection
  ssh -p ${REMOTE_SSH_PORT} ${REMOTE_SSH_USER}@${REMOTE_SSH_HOST} \
    "pkill -u ${REMOTE_SSH_USER} -f 'sshd.*${DEBUG_PORT}'" 2>/dev/null || true

  echo "INFO: Cleanup complete"
}
trap cleanup EXIT INT TERM

# 5. Notify server
echo "INFO: Connection established. Notifying server..."
curl -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionToken\":\"${SESSION_TOKEN}\",\"status\":\"ready\"}"

echo "SUCCESS: Your browser is connected. Please return to the web page to complete the process."

# Keep script alive until user is done
wait $CHROME_PID
