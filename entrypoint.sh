#!/bin/sh
set -e

device="${DEVICE:-/dev/ttyACM0}"

if [ "$1" = "--" ]; then
  shift
fi

if [ $# -eq 0 ]; then
  set -- --off
fi

case "$1" in
  --device)
    /usr/local/bin/asterctl "$@"
    ;;
  --help|-h|--version|-V)
    /usr/local/bin/asterctl "$@"
    ;;
  --*)
    /usr/local/bin/asterctl --device "$device" "$@"
    ;;
  *)
    /usr/local/bin/asterctl --device "$device" "$@"
    ;;
esac

if [ "${KEEP_ALIVE:-true}" = "true" ]; then
  exec sleep infinity
fi
