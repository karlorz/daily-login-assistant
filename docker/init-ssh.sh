#!/usr/bin/with-contenv bash
# LinuxServer init script to configure SSH for remote port forwarding

echo "[init-ssh] Configuring SSH for remote port forwarding..."

# Modify sshd_config before it starts
CONFIG_FILE="/config/sshd/sshd_config"

# Wait for config directory
mkdir -p /config/sshd

# If config doesn't exist yet, we'll modify it via sed replacement when container generates it
# The LinuxServer init creates the config, so we modify the template
if [ -f "$CONFIG_FILE" ]; then
    # Enable GatewayPorts for remote port forwarding
    # Use "yes" instead of "clientspecified" to allow binding to all interfaces
    if grep -q "^GatewayPorts no" "$CONFIG_FILE"; then
        sed -i 's/^GatewayPorts no/GatewayPorts yes/' "$CONFIG_FILE"
        echo "[init-ssh] GatewayPorts set to yes"
    elif grep -q "^GatewayPorts clientspecified" "$CONFIG_FILE"; then
        sed -i 's/^GatewayPorts clientspecified/GatewayPorts yes/' "$CONFIG_FILE"
        echo "[init-ssh] GatewayPorts changed from clientspecified to yes"
    fi

    # Enable AllowTcpForwarding (handle both commented and uncommented)
    if grep -q "^AllowTcpForwarding no" "$CONFIG_FILE"; then
        sed -i 's/^AllowTcpForwarding no/AllowTcpForwarding yes/' "$CONFIG_FILE"
        echo "[init-ssh] AllowTcpForwarding enabled (was disabled)"
    elif grep -q "^#AllowTcpForwarding yes" "$CONFIG_FILE"; then
        sed -i 's/^#AllowTcpForwarding yes/AllowTcpForwarding yes/' "$CONFIG_FILE"
        echo "[init-ssh] AllowTcpForwarding enabled (was commented)"
    fi
fi

echo "[init-ssh] SSH configuration complete"
