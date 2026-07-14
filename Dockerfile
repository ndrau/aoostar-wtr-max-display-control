ARG ASTERCTL_VERSION=v0.2.0

FROM node:20-bookworm-slim AS web-builder

WORKDIR /build
COPY web/package.json ./
RUN npm install

COPY web/ ./
RUN npm run build

FROM node:20-bookworm-slim

ARG ASTERCTL_VERSION

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /tmp/asterctl /app/cfg /app/assets /app/scripts /data/uploads \
    && curl -fsSL "https://github.com/zehnm/aoostar-rs/releases/download/${ASTERCTL_VERSION}/asterctl-${ASTERCTL_VERSION}-Linux-x64.tar.gz" \
    | tar -xzf - -C /tmp/asterctl \
    && mv /tmp/asterctl/asterctl /usr/local/bin/asterctl \
    && chmod +x /usr/local/bin/asterctl \
    && cp -r /tmp/asterctl/cfg/. /app/cfg/ \
    && rm -rf /tmp/asterctl

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

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
