# AOOSTAR WTR Max Display

Docker image and web UI to control the embedded LCD on the **AOOSTAR WTR Max** (and GEM12+ PRO) from Linux — e.g. **TrueNAS Scale** via Portainer.

Uses [`asterctl`](https://github.com/zehnm/aoostar-rs) under the hood. The display is reached over USB serial (`/dev/ttyACM0`).

## Features

- **Default startup:** TrueNAS SCALE splash screen on the case display
- **Web UI (Next.js):** configure display mode, upload logos, quick on/off, daily timer
- **Modes:** TrueNAS logo · Original AOOSTAR image · Custom upload · Off
- **Secure container:** only the serial device is passed through — no `privileged` mode

Published image:

```text
ghcr.io/ndrau/aoostar-wtr-max-display:latest
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
| Display mode | TrueNAS logo, original firmware image, custom upload, or off |
| Quick actions | Instantly show logo, restore original, or turn display off |
| Custom upload | Upload PNG/JPG (960×376 recommended) |
| Timer | Daily on/off schedule |
| Activity log | Live log of boot, asterctl commands, scheduler, uploads, and errors |

Settings are stored in the mounted volume at `/data/config.json`. Logs are stored at `/data/logs/display.log`.

Set `API_TOKEN` in the container environment before exposing the UI on your network.

## Local build

```bash
docker build -t aoostar-wtr-max-display:local .
docker run --rm -p 3910:3000 \
  --device /dev/serial/by-id/usb-Synwit_USB_Virtual_COM-if00:/dev/ttyACM0 \
  -v "$(pwd)/data:/data" \
  aoostar-wtr-max-display:local
```

## Compose example

```yaml
services:
  aoostar-display:
    image: ghcr.io/ndrau/aoostar-wtr-max-display:latest
    container_name: aoostar-display
    restart: unless-stopped
    ports:
      - "3910:3000"
    devices:
      - /dev/serial/by-id/usb-Synwit_USB_Virtual_COM-if00:/dev/ttyACM0
    volumes:
      - /mnt/AndysFastStorage/docker/aoostar-display:/data
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
- It does **not** require host networking or additional host mounts
- It only talks to the AOOSTAR case display over USB serial
- Persistent files are limited to `/data` on your chosen dataset

Recommended: use a long random `API_TOKEN`, keep port `3910` on your LAN only, and avoid exposing the UI to the public internet.

## GitHub Container Registry

On push to `main` or tag `v*`, GitHub Actions publishes to GHCR.

After the first publish, make the package **public** once (GitHub Actions cannot do this automatically):

`https://github.com/users/ndrau/packages/container/package/aoostar-wtr-max-display/settings`

→ **Change visibility** → **Public**

Or from CLI after `gh auth refresh -h github.com -s read:packages,write:packages`:

```bash
gh api --method PATCH /user/packages/container/aoostar-wtr-max-display -f visibility=public
```

## Credits

- Display protocol and `asterctl`: [zehnm/aoostar-rs](https://github.com/zehnm/aoostar-rs) (MIT / Apache-2.0)
