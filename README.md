# AOOSTAR WTR Max Display Control

Docker image and web UI to control the embedded LCD on the **AOOSTAR WTR Max** (and GEM12+ PRO) from Linux — e.g. **TrueNAS Scale** via Portainer.

Uses [`asterctl`](https://github.com/zehnm/aoostar-rs) under the hood. The display is reached over USB serial (`/dev/ttyACM0`).

## Features

- **Default startup:** TrueNAS SCALE splash screen on the case display
- **Web UI (Next.js):** configure display mode, upload logos, quick on/off, daily timer
- **Modes:** TrueNAS logo · Live system dashboard · Text banner · Custom upload · Off
- **Secure container:** only the serial device is passed through — no `privileged` mode

Published image:

```text
ghcr.io/ndrau/aoostar-wtr-max-display-control:latest
```

## Quick start (Portainer / TrueNAS)

1. Create a stack from `docker-compose.yml`
2. Adjust paths if needed:
   - USB device under `devices`
   - volume mount for persistent settings/uploads
3. Deploy
4. Open the web UI at `http://<truenas-ip>:3910`

Default behaviour on container start: **show TrueNAS SCALE logo**.

### USB device path

```bash
ls -la /dev/serial/by-id/
```

Example from AOOSTAR WTR Max:

```text
/dev/serial/by-id/usb-Synwit_USB_Virtual_COM-if00
```

## Web UI

| Section | What it does |
|---|---|
| Display mode | TrueNAS logo, live dashboard, text banner, custom upload, or off |
| Quick actions | Instantly show logo, start dashboard, or turn display off |
| Custom upload | Upload PNG/JPG (960×376 recommended) |
| Timer | Daily on/off schedule |
| Activity log | Live log of boot, asterctl commands, scheduler, uploads, and errors |
| Live sensor data | Preview of values sent to the case display in dashboard mode |

Settings are stored in the mounted volume at `/data/config.json`. Logs are stored at `/data/logs/display.log`.

## Live system dashboard

The **System dashboard (live)** mode renders the original AOOSTAR-style panels using
[`asterctl --config`](https://zehnm.github.io/aoostar-rs/sensor/panel.html) and
[`aster-sysinfo`](https://zehnm.github.io/aoostar-rs/sensor/provider/sysinfo.html).

1. Select **System dashboard (live)** in the web UI and click **Apply settings**
2. The container starts `aster-sysinfo` (collects host metrics every 3s) and
   `asterctl` in panel mode (renders them on the LCD)
3. The web UI shows a live preview of the same sensor file

### Required compose mounts

Without host visibility, the dashboard would only show container stats.
Use host PID namespace plus a read-only `/sys` mount (do **not** bind-mount
`/proc:ro` — Docker fails to start with an AppArmor error on TrueNAS and other
hosts):

```yaml
pid: host
volumes:
  - /mnt/AndysFastStorage/docker/aoostar-wtr-max-display-control:/data
  - /sys:/sys:ro
```

`pid: host` lets `aster-sysinfo` read host CPU/RAM from the container's `/proc`.
Fan RPM values come from `/sys/class/hwmon` via the `/sys` mount.

Network speed, IP, and per-disk temperatures need interface-specific entries in
the sensor mapping file. The default mapping ships CPU/RAM/GPU fields; extend
`/app/cfg/sensor-mapping/truenas-default.cfg` or set `SENSOR_MAPPING` if your
NIC or pool layout needs custom labels.

## Text banner

The **Text banner** mode renders your own text as a 960×376 PNG and sends it to
the display. Pick text color and background color in the web UI, optionally assign
live system metrics to each corner (top/bottom, left/right), preview the layout,
then apply settings. Corner values refresh every 3 seconds when at least one
corner sensor is selected.

Corner options include **fans (RPM)**, **SSD/HDD usage and temperature**, motherboard
temperature, network, CPU/RAM/GPU, and uptime. Fan speeds are read from host
`/sys/class/hwmon` (requires the `/sys` mount). Disk usage bars use `aster-sysinfo
--disk-refresh` and appear on the system dashboard panel 2.
 The generated image is stored at
`/data/uploads/text-banner.png`.

Example corner config in `config.json`:

```json
"textBanner": {
  "text": "AndyNAS",
  "textColor": "#e8eef8",
  "backgroundColor": "#0b1220",
  "cornerColor": "#9aa8c2",
  "corners": {
    "topLeft": "cpu_usage_percent",
    "topRight": "temperature_cpu",
    "bottomLeft": "mem_usage_percent",
    "bottomRight": "network_primary_address"
  }
}
```


Set `API_TOKEN` in the container environment before exposing the UI on your network.

## Local build

```bash
docker build -t aoostar-wtr-max-display-control:local .
docker run --rm -p 3910:3000 \
  --device /dev/serial/by-id/usb-Synwit_USB_Virtual_COM-if00:/dev/ttyACM0 \
  -v "$(pwd)/data:/data" \
  aoostar-wtr-max-display-control:local
```

## Compose example

```yaml
services:
  aoostar-wtr-max-display-control:
    image: ghcr.io/ndrau/aoostar-wtr-max-display-control:latest
    container_name: aoostar-wtr-max-display-control
    restart: unless-stopped
    ports:
      - "3910:3000"
    devices:
      - /dev/serial/by-id/usb-Synwit_USB_Virtual_COM-if00:/dev/ttyACM0
    pid: host
    volumes:
      - /mnt/AndysFastStorage/docker/aoostar-wtr-max-display-control:/data
      - /sys:/sys:ro
    environment:
      API_TOKEN: change-me-to-a-long-random-token
      TZ: Europe/Berlin
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DEVICE` | `/dev/ttyACM0` | Serial device inside the container |
| `DATA_DIR` | `/data` | Persistent config and uploads |
| `PORT` | `3000` | Web UI port inside the container |
| `API_TOKEN` | unset | Protects all `/api/*` routes when set |
| `TZ` | UTC | Scheduler timezone, e.g. `Europe/Berlin` |
| `TRUENAS_LOGO_PATH` | `/app/assets/truenas-scale.png` | Built-in splash image |
| `SENSOR_MAPPING` | `sensor-mapping/truenas-default.cfg` | Maps aster-sysinfo keys to AOOSTAR panel labels |
| `CONFIG_DIR` | `/app/cfg` | asterctl configuration directory |

## Security

- No `privileged` mode
- Only one serial device is passed through (`devices:`)
- Only `/data` is bind-mounted on the host
- `asterctl` is executed with argument arrays, not shell commands
- Uploads are limited to 10 MB and restricted to `/data/uploads/`
- Custom image paths are validated and cannot escape the uploads directory
- Display commands are serialized to avoid concurrent serial port access
- Set `API_TOKEN` in the container environment to protect the web API

### TrueNAS safety

This container is intentionally narrow in scope:

- It does **not** modify TrueNAS system files, pools, datasets, or services
- It does **not** require host networking
- For live sensors use `pid: host` plus read-only `/sys` (no `privileged`, no `/proc` bind mount)
- It only talks to the AOOSTAR case display over USB serial
- Persistent files are limited to `/data` on your chosen dataset

Recommended: use a long random `API_TOKEN`, keep port `3910` on your LAN only, and avoid exposing the UI to the public internet.

## GitHub Container Registry

On push to `main` or tag `v*`, GitHub Actions publishes to GHCR.

After the first publish, make the package **public** once (GitHub Actions cannot do this automatically):

https://github.com/ndrau/aoostar-wtr-max-display-control/pkgs/container/aoostar-wtr-max-display-control

→ **Change visibility** → **Public**

Or from CLI after `gh auth refresh -h github.com -s read:packages,write:packages`:

```bash
gh api --method PATCH /user/packages/container/aoostar-wtr-max-display-control -f visibility=public
```

## Credits

- Display protocol and `asterctl`: [zehnm/aoostar-rs](https://github.com/zehnm/aoostar-rs) (MIT / Apache-2.0)
