### `jrei/systemd-ubuntu` Ubuntu image with systemd enabled

You can use this image as a base container to run systemd services inside.

Supported tags

25.04, latest
24.04
22.04
20.04
18.04
16.04
Usage

The "Failed to connect to bus" error in your `jrei/systemd-ubuntu` container on macOS with Colima (the latest versions of which default to cgroup v2 and an Ubuntu-based VM) stems from systemd's inability to properly initialize D-Bus and cgroups in the containerized environment. This is exacerbated by macOS's virtualized setup via Colima/Lima, where the default read-only cgroup mount and namespace isolation prevent systemd from accessing or modifying the necessary hierarchies.

### Updated Fix for Colima on macOS
Since Colima v0.6.0+, it uses an Ubuntu hypervisor (with systemd enabled) by default, which provides the required `/sys/fs/cgroup/systemd` path. However, for cgroup v2 compatibility, you need to adjust the mount to read-write (`:rw`) and add the `--cgroupns=host` flag to share the host's cgroup namespace. Keep `--privileged` for capability access.

1. **Ensure Colima is up to date**:
   ```
   brew upgrade colima
   colima start  # Or restart if already running: colima stop && colima start
   ```
   Verify it's using Ubuntu: `colima ssh -- uname -a` (should show Ubuntu).

2. **Run the container with these flags**:
   ```
   docker run -d \
     --name my-systemd-ubuntu \
     --privileged \
     --cgroupns=host \
     --tmpfs /tmp \
     --tmpfs /run \
     --tmpfs /run/lock \
     -v /sys/fs/cgroup:/sys/fs/cgroup:rw \
     jrei/systemd-ubuntu:22.04 /sbin/init
   ```

3. **Test inside the container**:
   ```
   docker exec -it my-systemd-ubuntu /bin/bash
   systemctl status  # Should show systemd running without bus errors
   ```

### If Issues Persist
- **Cgroup v1 fallback**: If your setup or image strictly requires cgroup v1 (e.g., older systemd), stop Colima (`colima stop`), edit `~/.colima/default/colima.yaml` to add under the `docker` section: `cgroupDriver: cgroupfs`, then restart (`colima start`). Revert the mount to `:ro` and remove `--cgroupns=host`.
- **Apple Silicon (M-series) quirks**: On M1/M2/M3 Macs, emulation might interfere—add `--platform linux/amd64` to the `docker run` if using an x86 image, but test with native arm64 where possible.
- **Logs for debugging**: Check `docker logs my-systemd-ubuntu` for specific cgroup or D-Bus errors, or Colima VM logs via `colima ssh journalctl -u docker`.
- **Alternative**: If Colima proves finicky, consider Podman as a drop-in replacement on macOS—it handles systemd containers more natively without Docker flags.

This setup works reliably on recent Colima versions for testing/Ansible scenarios. Share your Colima version (`colima version`) or exact error logs if it doesn't resolve!