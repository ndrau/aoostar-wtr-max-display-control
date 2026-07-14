# AOOSTAR WTR Max Display

Docker image and Compose stack to control the embedded LCD on the **AOOSTAR WTR Max** (and GEM12+ PRO) from Linux — e.g. **TrueNAS Scale** via Portainer.

Uses [`asterctl`](https://github.com/zehnm/aoostar-rs) under the hood. The display is reached over USB serial (`/dev/ttyACM0`).

## Quick start (Portainer / TrueNAS)

1. Create a stack from `docker-compose.yml`
2. Adjust the `devices` path if your USB by-id differs:

```bash
ls -la /dev/serial/by-id/
```

3. Deploy

Default behaviour: **display off** on container start.

Published image:

```text
ghcr.io/ndrau/aoostar-wtr-max-display:latest
```

## Local build

```bash
docker build -t aoostar-wtr-max-display:local .
docker run --rm \
  --device /dev/serial/by-id/usb-Synwit_USB_Virtual_COM-if00:/dev/ttyACM0 \
  aoostar-wtr-max-display:local --off
```

## Compose examples

### Turn display on

```yaml
command: ["--on"]
```

### Show a custom image

Mount your image and point `command` at it:

```yaml
volumes:
  - /mnt/AndysFastStorage/scripts/aoostar:/data:ro
command: ["--image", "/data/logo.png"]
```

Target resolution: **960×376** (other sizes are scaled).

### Sensor dashboard (experimental)

The image ships with default AOOSTAR-X config under `/app/cfg/`:

```yaml
command: ["--config", "monitor.json", "--config-dir", "/app/cfg", "--sensor-path", "/app/cfg/sensors"]
```

Sensor values must be supplied as text files (see [aoostar-rs docs](https://zehnm.github.io/aoostar-rs/)).

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DEVICE` | `/dev/ttyACM0` | Serial device inside the container |
| `KEEP_ALIVE` | `true` | Keep container running after `asterctl` exits |

## Security

- No `privileged` mode
- Only one serial device is passed through (`devices:`)
- Prefer `/dev/serial/by-id/...` over `/dev/ttyACM0` for stable mapping

## GitHub Container Registry

On push to `main` or tag `v*`, GitHub Actions publishes to GHCR.

After the first publish, make the package **public** (or authenticate Portainer with a GitHub PAT) under:

`https://github.com/ndrau?tab=packages`

### Portainer with private GHCR package

1. GitHub → Settings → Developer settings → PAT with `read:packages`
2. Portainer → Registries → Add registry → `ghcr.io`
3. Username: GitHub username, Password: PAT

## Credits

- Display protocol and `asterctl`: [zehnm/aoostar-rs](https://github.com/zehnm/aoostar-rs) (MIT / Apache-2.0)
