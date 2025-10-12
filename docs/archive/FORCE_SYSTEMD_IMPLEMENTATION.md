# FORCE_SYSTEMD Implementation

## Overview
Implemented `FORCE_SYSTEMD` environment variable support in `docker/dailycheckin.sh` to allow forcing systemd service creation in container environments for testing purposes.

## Changes Made

### 1. Fixed Duplicate Service File Creation Bug
**Before:** The script created the systemd service file twice - once before the container check and once inside the native system branch.

**After:** Service file is created only once, based on the startup mode selected.

### 2. Implemented FORCE_SYSTEMD Logic
Added conditional logic that checks `FORCE_SYSTEMD` environment variable to override container detection:

```bash
if [[ "$FORCE_SYSTEMD" == "true" ]] || [[ "$IS_CONTAINER" == "false" ]]; then
    # Create and enable systemd service
else
    # Use direct launch with start-app.sh script
fi
```

### 3. Updated Service Status Checking
The script now checks service status based on the startup mode:
- **Systemd mode:** Uses `systemctl is-active`
- **Direct launch mode:** Uses PID file and `kill -0` check

### 4. Context-Aware Installation Instructions
The installation success message now displays different instructions based on startup mode:

**Systemd Mode:**
- Service management commands (systemctl)
- journalctl for logs
- systemd-based restart commands

**Direct Launch Mode:**
- Container management commands
- docker logs / tail -f for logs
- Process-based restart commands
- Tip about enabling FORCE_SYSTEMD

## Usage Examples

### Default Container Mode (Direct Launch)
```bash
docker exec container-name /tmp/dailycheckin.sh
```
- Creates `/opt/daily-login-assistant/start-app.sh`
- Starts app directly with nohup
- Creates `app.pid` file
- No systemd service enabled

### Forced Systemd Mode in Container
```bash
docker exec container-name bash -c "export FORCE_SYSTEMD=true && /tmp/dailycheckin.sh"
```
- Creates systemd service file
- Enables and starts the service via systemctl
- No `app.pid` file created
- Service managed by systemd

### Native System (Automatic Systemd)
```bash
sudo bash dailycheckin.sh
```
- Automatically uses systemd (IS_CONTAINER=false)
- Same behavior as FORCE_SYSTEMD=true in containers

## Testing

### Test Script Created
Created `docker/test-local-dailycheckin.sh` to test both modes:

```bash
# Test both modes
./docker/test-local-dailycheckin.sh
```

This script:
1. Tests default container mode (direct launch)
2. Verifies no systemd service is enabled
3. Checks for start-app.sh and app.pid
4. Cleans up and tests FORCE_SYSTEMD mode
5. Verifies systemd service is created and enabled
6. Checks that app.pid is NOT created

### Manual Testing

**Test Default Mode:**
```bash
./docker/test-dailycheckin.sh
# Check: should see "Container detected: Creating startup script for direct launch"
docker exec ubuntu-systemd-test ls -l /opt/daily-login-assistant/start-app.sh
docker exec ubuntu-systemd-test cat /opt/daily-login-assistant/app.pid
```

**Test FORCE_SYSTEMD Mode:**
```bash
docker exec ubuntu-systemd-test bash -c "export FORCE_SYSTEMD=true && /tmp/dailycheckin.sh"
# Check: should see "FORCE_SYSTEMD enabled: Creating systemd service in container"
docker exec ubuntu-systemd-test systemctl status daily-login-assistant
```

## Key Benefits

1. **Flexibility:** Allows testing systemd integration in containers
2. **Clear Separation:** Distinct startup modes for different environments
3. **Better UX:** Context-aware instructions based on startup mode
4. **Bug Fix:** Eliminates duplicate service file creation
5. **Documentation:** Includes helpful tips in output about switching modes

## Files Modified

- `docker/dailycheckin.sh` - Main installation script with FORCE_SYSTEMD logic
- `docker/test-dailycheckin.sh` - Updated test instructions
- `docker/test-local-dailycheckin.sh` - New comprehensive test script (created)

## Notes

- The `FORCE_SYSTEMD` variable is optional and defaults to false
- In native (non-container) environments, systemd is always used
- The script provides helpful tips when in direct launch mode
- Both modes are fully functional and production-ready
