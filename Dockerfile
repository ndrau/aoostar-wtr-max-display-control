ARG ASTERCTL_VERSION=v0.2.0

FROM node:20-bookworm-slim AS web-builder

WORKDIR /build
COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

FROM node:20-bookworm-slim

ARG ASTERCTL_VERSION

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      fonts-dejavu-core \
      smartmontools \
      sudo \
    && rm -rf /var/lib/apt/lists/* \
    && echo 'root ALL=(ALL) NOPASSWD: /usr/sbin/smartctl' > /etc/sudoers.d/smartctl \
    && chmod 440 /etc/sudoers.d/smartctl

RUN mkdir -p /tmp/asterctl /app/cfg /app/assets /app/fonts /app/scripts /data/uploads \
    && curl -fsSL "https://github.com/zehnm/aoostar-rs/releases/download/${ASTERCTL_VERSION}/asterctl-${ASTERCTL_VERSION}-Linux-x64.tar.gz" \
    | tar -xzf - -C /tmp/asterctl \
    && mv /tmp/asterctl/asterctl /usr/local/bin/asterctl \
    && mv /tmp/asterctl/aster-sysinfo /usr/local/bin/aster-sysinfo \
    && chmod +x /usr/local/bin/asterctl /usr/local/bin/aster-sysinfo \
    && cp -r /tmp/asterctl/cfg/. /app/cfg/ \
    && cp /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf /app/fonts/HarmonyOS_Sans_SC_Bold.ttf \
    && rm -rf /tmp/asterctl

COPY cfg/monitor.json /app/cfg/monitor.json
COPY cfg/sensor-mapping/truenas-default.cfg /app/cfg/sensor-mapping/truenas-default.cfg

COPY assets/truenas-scale.png /app/assets/truenas-scale.png
COPY scripts/apply-boot.mjs /app/scripts/apply-boot.mjs
COPY scripts/log-append.mjs /app/scripts/log-append.mjs
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY --from=web-builder /build/.next/standalone /app
COPY --from=web-builder /build/.next/static /app/.next/static

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATA_DIR=/data
ENV DEVICE=/dev/ttyACM0
ENV TRUENAS_LOGO_PATH=/app/assets/truenas-scale.png
ENV ASTERCTL_PATH=/usr/local/bin/asterctl
ENV FONT_DIR=/app/fonts
ENV SMARTCTL_ENABLED=true

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
