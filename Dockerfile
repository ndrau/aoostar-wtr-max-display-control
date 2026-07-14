ARG ASTERCTL_VERSION=v0.2.0

FROM debian:bookworm-slim

ARG ASTERCTL_VERSION

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /tmp/asterctl /app/cfg \
    && curl -fsSL "https://github.com/zehnm/aoostar-rs/releases/download/${ASTERCTL_VERSION}/asterctl-${ASTERCTL_VERSION}-Linux-x64.tar.gz" \
    | tar -xzf - -C /tmp/asterctl \
    && mv /tmp/asterctl/asterctl /usr/local/bin/asterctl \
    && chmod +x /usr/local/bin/asterctl \
    && cp -r /tmp/asterctl/cfg/. /app/cfg/ \
    && rm -rf /tmp/asterctl

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV DEVICE=/dev/ttyACM0
ENV KEEP_ALIVE=true

ENTRYPOINT ["/entrypoint.sh"]
CMD ["--off"]
