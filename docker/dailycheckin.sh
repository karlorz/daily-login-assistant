#!/usr/bin/env bash

# Daily Login Assistant - Native Installation Script
# License: MIT
# Usage: bash -c "$(curl -fsSL https://httpd.karldigi.dev/docker/dailycheckin.sh)"

set -e

function header_info {
    # Only clear if we have a proper terminal
    if [[ -t 1 ]] && command -v clear >/dev/null 2>&1; then
        clear
    fi
    cat <<"EOF"
    ____        _ __          __    ____  ___ _          __  _
   / __ \____ _(_) /_  __    / /   / __ \/ (_) /_____   / / (_)___
  / / / / __ `/ / / / / /   / /   / / / / / / __/ _ \ / / / / __ \
 / /_/ / /_/ / / / /_/ /   / /___/ /_/ / / / /_/  __// /_/ / / / /
/_____/\__,_/_/_/\__, /   /_____/\____/_/_/\__/\___(_)___/_/_/ /_/
                /____/
          Daily Check-In Assistant - Native Install
EOF
}

YW=$(echo "\033[33m")
GN=$(echo "\033[1;92m")
RD=$(echo "\033[01;31m")
BL=$(echo "\033[36m")
CL=$(echo "\033[m")
CM="${GN}✔${CL}"
CROSS="${RD}✖${CL}"
INFO="${BL}ℹ${CL}"

# Display header immediately
header_info

# Early environment detection
echo -e "${INFO} ${YW}Detecting environment...${CL}"

# Detect if running in container
IS_CONTAINER=false
if [[ -f "/.dockerenv" ]] || grep -q "docker\|lxc" /proc/1/cgroup 2>/dev/null; then
    IS_CONTAINER=true
    echo -e "${CM} ${GN}Container environment detected${CL}"
else
    echo -e "${CM} ${GN}Native environment detected${CL}"
fi

# Detect OS
if [[ -f "/etc/alpine-release" ]]; then
    OS="Alpine"
    PKG_MANAGER="apk add --no-cache"
    echo -e "${CM} ${GN}OS detected: Alpine Linux${CL}"
elif [[ -f "/etc/debian_version" ]]; then
    OS="Debian"
    PKG_MANAGER="apt-get install -y"
    echo -e "${CM} ${GN}OS detected: Debian/Ubuntu${CL}"
else
    echo -e "${CROSS} ${RD}Unsupported OS detected. Exiting.${CL}"
    exit 1
fi

APP="Daily-Login-Assistant"
REPO_URL="https://github.com/karlorz/daily-login-assistant.git"
INSTALL_DIR="/opt/daily-login-assistant"
SERVICE_PATH="/etc/systemd/system/daily-login-assistant.service"
DEFAULT_PORT=8001

# Get first non-loopback IP - handle containers without ip command
if command -v ip >/dev/null 2>&1; then
    IFACE=$(ip -4 route | awk '/default/ {print $5; exit}' 2>/dev/null || echo "")
    IP=$(ip -4 addr show "$IFACE" 2>/dev/null | awk '/inet / {print $2}' | cut -d/ -f1 | head -n 1)
    [[ -z "$IP" ]] && IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    [[ -z "$IP" ]] && IP="127.0.0.1"
else
    # Fallback for containers without ip command
    IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
fi

function msg_info() {
    local msg="$1"
    echo -e "${INFO} ${YW}${msg}...${CL}"
}

function msg_ok() {
    local msg="$1"
    echo -e "${CM} ${GN}${msg}${CL}"
}

function msg_error() {
    local msg="$1"
    echo -e "${CROSS} ${RD}${msg}${CL}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    msg_error "This script must be run as root"
    echo -e "${YW}Please run: sudo bash -c \"\$(curl -fsSL https://httpd.karldigi.dev/docker/dailycheckin.sh)\"${CL}"
    exit 1
fi

# Check if already installed
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YW}⚠️  ${APP} is already installed at ${INSTALL_DIR}${CL}"
    read -r -p "Would you like to uninstall ${APP}? (y/N): " uninstall_prompt
    if [[ "${uninstall_prompt,,}" =~ ^(y|yes)$ ]]; then
        msg_info "Uninstalling ${APP}"
        # Stop application if running
        if [[ -f "$INSTALL_DIR/app.pid" ]]; then
            kill $(cat "$INSTALL_DIR/app.pid") 2>/dev/null || true
            rm -f "$INSTALL_DIR/app.pid"
        fi
        # Stop systemd service if it exists
        systemctl disable --now daily-login-assistant.service &>/dev/null || true
        rm -f "$SERVICE_PATH"
        systemctl daemon-reload &>/dev/null || true
        rm -rf "$INSTALL_DIR"
        msg_ok "${APP} has been uninstalled."
        exit 0
    fi

    read -r -p "Would you like to update ${APP}? (y/N): " update_prompt
    if [[ "${update_prompt,,}" =~ ^(y|yes)$ ]]; then
        msg_info "Updating ${APP}"
        cd "$INSTALL_DIR"
        git fetch origin &>/dev/null
        git reset --hard origin/main &>/dev/null
        export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
        npm install &>/dev/null
        npm run build &>/dev/null

        # Restart based on environment
        if [[ -f "$INSTALL_DIR/app.pid" ]]; then
            # Container environment - restart process
            kill $(cat "$INSTALL_DIR/app.pid") 2>/dev/null || true
            cd "$INSTALL_DIR"
            nohup npm run start:node > /dev/null 2>&1 &
            echo $! > "$INSTALL_DIR/app.pid"
        else
            # Native environment - restart systemd service
            systemctl restart daily-login-assistant.service &>/dev/null
        fi

        msg_ok "Updated ${APP}"
        exit 0
    else
        echo -e "${YW}⚠️ Update skipped. Exiting.${CL}"
        exit 0
    fi
fi

# Branch selection
# Check for environment variables or non-interactive mode
if [[ -n "$INSTALL_BRANCH" ]]; then
    # Use environment variable if set
    BRANCH="$INSTALL_BRANCH"
    PORT="${INSTALL_PORT:-$DEFAULT_PORT}"
    echo -e "${YW}Using environment settings: branch=${BRANCH}, port=${PORT}${CL}"
elif [[ "$IS_CONTAINER" == "true" && ! -t 0 ]]; then
    # Container non-interactive mode
    BRANCH="main"  # Default to main in container
    PORT=$DEFAULT_PORT
    echo -e "${YW}Non-interactive mode detected: Using branch ${BRANCH} and port ${PORT}${CL}"
elif [[ ! -t 0 ]]; then
    # Non-interactive mode (piped input) - use defaults
    BRANCH="main"
    PORT=$DEFAULT_PORT
    echo -e "${YW}Non-interactive mode: Using branch ${BRANCH} and port ${PORT}${CL}"
else
    # Interactive mode - prompt user
    echo -e "${YW}Select branch to deploy:${CL}"
    echo -e "  ${GN}1)${CL} main (Production - Recommended)"
    echo -e "  ${GN}2)${CL} feat/Automation (Development)"
    read -r -p "Enter choice [1-2] (Default: 1): " branch_choice
    case "$branch_choice" in
        2) BRANCH="feat/Automation" ;;
        *) BRANCH="main" ;;
    esac

    # Port selection
    echo ""
    read -r -p "Enter PWA port number (Default: ${DEFAULT_PORT}): " PORT
    PORT=${PORT:-$DEFAULT_PORT}
fi

echo ""
msg_info "Starting installation with branch: ${BRANCH}"
echo ""

# Update system packages
msg_info "Updating system packages"
if [[ "$OS" == "Debian" ]]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq &>/dev/null
else
    apk update &>/dev/null
fi
msg_ok "System packages updated"

# Install system dependencies
msg_info "Installing system dependencies"
if [[ "$OS" == "Debian" ]]; then
    # Install systemd for containers if needed
    if [[ "$IS_CONTAINER" == "true" ]]; then
        msg_info "Installing systemd for container environment"
        apt-get install -y -qq systemd systemd-sysv dbus &>/dev/null
    fi

    apt-get install -y -qq \
        curl \
        git \
        ca-certificates \
        gnupg \
        lsb-release \
        wget \
        unzip \
        xz-utils \
        build-essential \
        python3 \
        python3-pip \
        openssh-server \
        htop \
        nano \
        ufw &>/dev/null
else
    apk add --no-cache \
        curl \
        git \
        ca-certificates \
        wget \
        unzip \
        xz \
        build-base \
        python3 \
        py3-pip \
        openssh \
        htop \
        nano \
        ufw &>/dev/null
fi
msg_ok "System dependencies installed"

# Install Bun runtime (for production)
if ! command -v bun &>/dev/null; then
    msg_info "Installing Bun runtime"

    # Install Bun using the official installer
    curl -fsSL https://bun.sh/install | bash &>/dev/null

    # Set up Bun environment variables
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    echo 'export BUN_INSTALL="$HOME/.bun"' >> /etc/profile
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> /etc/profile

    # Verify installation
    if command -v bun &>/dev/null; then
        msg_ok "Bun runtime installed: $(bun --version)"
    else
        msg_error "Bun installation failed, falling back to Node.js"

        # Fallback to Node.js if Bun fails
        if [[ "$OS" == "Debian" ]]; then
            curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh
            bash /tmp/nodesource_setup.sh &>/dev/null
            apt-get install -y nodejs &>/dev/null
            rm -f /tmp/nodesource_setup.sh
        else
            apk add --no-cache nodejs npm &>/dev/null
        fi
        msg_ok "Node.js runtime installed as fallback: $(node --version)"
    fi
else
    msg_ok "Bun runtime already installed ($(bun --version))"
fi

# Configure SSH (if needed)
msg_info "Configuring SSH"
if [[ "$OS" == "Debian" ]]; then
    # Skip systemd commands in containers
    if [[ "$IS_CONTAINER" == "false" ]]; then
        if ! systemctl is-active --quiet ssh; then
            systemctl enable --now ssh &>/dev/null
        fi
        systemctl restart sshd &>/dev/null
    fi

    # Basic SSH security configuration
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config &>/dev/null || true
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config &>/dev/null || true
else
    rc-update add sshd default &>/dev/null
    rc-service sshd start &>/dev/null
fi
msg_ok "SSH configured"

# Clone repository
msg_info "Cloning repository (branch: ${BRANCH})"
git clone -b "$BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR" &>/dev/null
msg_ok "Repository cloned"

# Install application dependencies
msg_info "Installing application dependencies"
cd "$INSTALL_DIR"
export PATH="$BUN_INSTALL/bin:$PATH"

# Use Bun if available, otherwise npm
if command -v bun &>/dev/null; then
    bun install &>/dev/null
else
    npm install &>/dev/null
fi
msg_ok "Application dependencies installed"

# Install Playwright browsers (skip in container for faster testing)
if [[ "$IS_CONTAINER" == "true" ]]; then
    msg_info "Skipping Playwright installation in container (faster testing)"
    msg_ok "Playwright browsers skipped (container mode)"
else
    msg_info "Installing Playwright browsers"
    npx playwright install chromium &>/dev/null
    msg_ok "Playwright browsers installed"
fi

# Build application
msg_info "Building application"
npm run build &>/dev/null
msg_ok "Application built"

# Create necessary directories
msg_info "Creating application directories"
mkdir -p "$INSTALL_DIR/profiles"
mkdir -p "$INSTALL_DIR/logs"
mkdir -p "$INSTALL_DIR/config"
chown -R root:root "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR"
chmod -R 777 "$INSTALL_DIR/profiles" "$INSTALL_DIR/logs" "$INSTALL_DIR/config"
msg_ok "Application directories created"

# Create environment file
msg_info "Creating environment configuration"
cat > "$INSTALL_DIR/.env" <<EOF
# Daily Login Assistant Environment Variables
NODE_ENV=production
LOG_LEVEL=info

# PWA Server Configuration
PWA_PORT=${PORT}
PWA_HOST=0.0.0.0

# Notification URLs (comma-separated)
# NOTIFICATION_URLS=discord://token@channel,slack://token@channel

# Website credentials (add as needed)
# SITE1_USERNAME=your_username
# SITE1_PASSWORD=your_password
EOF
msg_ok "Environment configuration created"

# Handle service creation based on environment
# Check if FORCE_SYSTEMD is set to override container detection
if [[ "$FORCE_SYSTEMD" == "true" ]] || [[ "$IS_CONTAINER" == "false" ]]; then
    # Create systemd service for native systems or forced systemd in containers
    if [[ "$FORCE_SYSTEMD" == "true" ]] && [[ "$IS_CONTAINER" == "true" ]]; then
        msg_info "FORCE_SYSTEMD enabled: Creating systemd service in container"
    else
        msg_info "Creating systemd service"
    fi
    
    # Detect runtime (Bun or Node.js)
    if command -v bun &>/dev/null; then
        RUNTIME_CMD="$BUN_INSTALL/bin/bun"
        RUNTIME_NAME="Bun"
    else
        RUNTIME_CMD="/usr/bin/node"
        RUNTIME_NAME="Node.js"
    fi

    cat <<EOF >"$SERVICE_PATH"
[Unit]
Description=Daily Login Assistant
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=${INSTALL_DIR}
Environment=NODE_ENV=production
Environment=PWA_PORT=${PORT}
Environment=PWA_HOST=0.0.0.0
Environment=PATH=${BUN_INSTALL}/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=${RUNTIME_CMD} run dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=daily-login-assistant

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=${INSTALL_DIR}/profiles ${INSTALL_DIR}/logs ${INSTALL_DIR}/config

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    systemctl daemon-reload &>/dev/null
    systemctl enable -q --now daily-login-assistant.service
    msg_ok "Systemd service created and started (using ${RUNTIME_NAME})"

else
    # Container mode without FORCE_SYSTEMD - use direct startup
    msg_info "Container detected: Creating startup script for direct launch"
    msg_info "Tip: Use FORCE_SYSTEMD=true to enable systemd service instead"

    # Create startup script for container environments
    cat <<EOF >"$INSTALL_DIR/start-app.sh"
#!/usr/bin/env bash
cd ${INSTALL_DIR}
export PATH=/usr/local/bin:/usr/bin:/bin
npm run build
npm run start:node
EOF
    chmod +x "$INSTALL_DIR/start-app.sh"

    # Start the application directly
    msg_info "Starting application directly"
    cd "$INSTALL_DIR"
    export PATH="/usr/local/bin:/usr/bin:/bin"
    nohup npm run start:node > /dev/null 2>&1 &
    echo $! > "$INSTALL_DIR/app.pid"
    msg_ok "Application started with PID $(cat $INSTALL_DIR/app.pid)"
fi

# Configure firewall (skip in containers)
if [[ "$IS_CONTAINER" == "false" ]]; then
    msg_info "Configuring firewall"
    if [[ "$OS" == "Debian" ]]; then
        if ! command -v ufw &>/dev/null; then
            apt-get install -y -qq ufw &>/dev/null
        fi
        ufw --force enable &>/dev/null
        ufw allow ${PORT}/tcp &>/dev/null
        ufw allow 22/tcp &>/dev/null
    else
        rc-update add ufw default &>/dev/null
        rc-service ufw start &>/dev/null
        ufw allow ${PORT}/tcp &>/dev/null
        ufw allow 22/tcp &>/dev/null
    fi
    msg_ok "Firewall configured"
else
    msg_info "Skipping firewall configuration in container environment"
fi

# Wait a moment for service to start
sleep 3

# Check if service is running based on startup method
if [[ "$FORCE_SYSTEMD" == "true" ]] || [[ "$IS_CONTAINER" == "false" ]]; then
    # Check systemd service
    if systemctl is-active --quiet daily-login-assistant.service; then
        msg_ok "Service is running"
    else
        msg_error "Service failed to start"
        echo -e "${YW}Check logs with: journalctl -u daily-login-assistant.service -f${CL}"
    fi
else
    # Check if application is running via direct startup
    if [[ -f "$INSTALL_DIR/app.pid" ]] && kill -0 $(cat "$INSTALL_DIR/app.pid") 2>/dev/null; then
        msg_ok "Application is running (PID: $(cat $INSTALL_DIR/app.pid))"
    else
        msg_error "Application failed to start"
        echo -e "${YW}Check logs with: tail -f ${INSTALL_DIR}/logs/app.log${CL}"
    fi
fi

# Display success message
echo ""
echo -e "${CM} ${GN}========================================${CL}"
echo -e "${CM} ${GN}${APP} installed successfully!${CL}"
echo -e "${CM} ${GN}========================================${CL}"
echo ""
echo -e "${BL}Installation Details:${CL}"
echo -e "  ${GN}•${CL} Installation Path: ${YW}${INSTALL_DIR}${CL}"
echo -e "  ${GN}•${CL} Branch: ${YW}${BRANCH}${CL}"
if [[ "$FORCE_SYSTEMD" == "true" ]] || [[ "$IS_CONTAINER" == "false" ]]; then
    echo -e "  ${GN}•${CL} Startup Mode: ${YW}Systemd Service${CL}"
else
    echo -e "  ${GN}•${CL} Startup Mode: ${YW}Direct Launch (Container Mode)${CL}"
fi
echo -e "  ${GN}•${CL} PWA Web UI: ${BL}http://${IP}:${PORT}${CL}"
echo -e "  ${GN}•${CL} Runtime: ${YW}Node.js $(node --version)${CL}"
echo ""
echo -e "${BL}Next Steps:${CL}"
echo -e "  ${GN}1.${CL} Configure environment variables:"
echo -e "     ${YW}nano ${INSTALL_DIR}/.env${CL}"
echo ""
echo -e "  ${GN}2.${CL} Set up login profiles via PWA:"
echo -e "     ${YW}Visit http://${IP}:${PORT} in your browser${CL}"
echo ""
echo -e "  ${GN}3.${CL} Test check-ins:"
echo -e "     ${YW}cd ${INSTALL_DIR} && npm run profiles list${CL}"
echo -e "     ${YW}cd ${INSTALL_DIR} && npm run profiles checkin-all${CL}"
echo ""

# Show appropriate log viewing commands based on startup mode
if [[ "$FORCE_SYSTEMD" == "true" ]] || [[ "$IS_CONTAINER" == "false" ]]; then
    echo -e "  ${GN}4.${CL} View logs:"
    echo -e "     ${YW}journalctl -u daily-login-assistant.service -f${CL}"
    echo ""
    echo -e "${BL}Service Management:${CL}"
    echo -e "  ${GN}•${CL} Status: ${YW}systemctl status daily-login-assistant${CL}"
    echo -e "  ${GN}•${CL} Restart: ${YW}systemctl restart daily-login-assistant${CL}"
    echo -e "  ${GN}•${CL} Stop: ${YW}systemctl stop daily-login-assistant${CL}"
    echo -e "  ${GN}•${CL} Start: ${YW}systemctl start daily-login-assistant${CL}"
    echo ""
    echo -e "${BL}Useful Commands:${CL}"
    echo -e "  ${GN}•${CL} Update: ${YW}cd ${INSTALL_DIR} && git pull && npm install && npm run build && systemctl restart daily-login-assistant${CL}"
else
    echo -e "  ${GN}4.${CL} View logs:"
    echo -e "     ${YW}tail -f ${INSTALL_DIR}/logs/app.log${CL}"
    echo -e "     ${YW}docker logs -f <container-name>${CL}"
    echo ""
    echo -e "${BL}Container Management:${CL}"
    echo -e "  ${GN}•${CL} Check process: ${YW}ps aux | grep node${CL}"
    echo -e "  ${GN}•${CL} Restart: ${YW}${INSTALL_DIR}/start-app.sh${CL}"
    echo -e "  ${GN}•${CL} Stop: ${YW}kill \$(cat ${INSTALL_DIR}/app.pid)${CL}"
    echo ""
    echo -e "${BL}Useful Commands:${CL}"
    echo -e "  ${GN}•${CL} Update: ${YW}cd ${INSTALL_DIR} && git pull && npm install && ${INSTALL_DIR}/start-app.sh${CL}"
    echo -e "  ${GN}•${CL} Enable systemd: ${YW}FORCE_SYSTEMD=true /path/to/dailycheckin.sh${CL}"
fi
echo -e "  ${GN}•${CL} Logs: ${YW}tail -f ${INSTALL_DIR}/logs/app.log${CL}"
echo -e "  ${GN}•${CL} SSH access: ${YW}ssh root@${IP}${CL}"
echo ""
echo -e "${CM} ${GN}Documentation: ${BL}${INSTALL_DIR}/CLAUDE.md${CL}"
echo ""