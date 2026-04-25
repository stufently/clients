#!/bin/bash
# Build bitwarden-cli .deb inside a Debian Docker container.
# Usage: ARCH=amd64|arm64 ./scripts/build-deb.sh
set -e

ARCH="${ARCH:-amd64}"
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-$HOME/github}"

if [ "$ARCH" != "amd64" ] && [ "$ARCH" != "arm64" ]; then
  echo "ARCH must be amd64 or arm64" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "=== Building bitwarden-cli .deb for $ARCH ==="
echo "Source: $SRC_DIR"
echo "Output: $OUTPUT_DIR"

docker run --rm --platform "linux/$ARCH" \
  -v "$SRC_DIR:/src:ro" \
  -v "$OUTPUT_DIR:/output" \
  -w /build \
  -e DEBIAN_FRONTEND=noninteractive \
  debian:trixie bash -c '
    set -e
    apt-get update -qq
    apt-get install -y --no-install-recommends \
      debhelper dpkg-dev devscripts lintian \
      nodejs npm python3 make g++ git ca-certificates \
      build-essential rsync
    rsync -a --exclude=.git --exclude=node_modules --exclude="**/dist" /src/ /build/
    cd /build
    dpkg-buildpackage -us -uc -b
    cp ../bitwarden-cli_*.deb /output/
    ls -la /output/bitwarden-cli_*.deb
  '
