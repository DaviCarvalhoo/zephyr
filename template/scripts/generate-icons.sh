#!/usr/bin/env bash
#
# generate-icons — (re)generate the full icon/splash asset set.
#
# Two modes:
#   ./scripts/generate-icons.sh                  # from scratch (uses
#                                                # primary color + first
#                                                # letter of the project)
#   ./scripts/generate-icons.sh path/to/logo.png # from a single PNG
#                                                # (square 1024×1024 ideal)
#
# Outputs into ./assets/, overwriting:
#   icon.png, adaptive-icon.png, splash-icon.png, favicon.png,
#   appstore.png, playstore.png
#
# Backed by `zephyr icons` from the zephyr-cli — the same generator
# used at scaffold time, so the result is consistent.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../mobile/{{PROJECT_SLUG}}" && pwd)"

cd "$APP_DIR"

PRIMARY_COLOR="{{PRIMARY_COLOR}}"
LETTER="{{PROJECT_NAME_INITIAL}}"
ASSETS_DIR="./assets"
SOURCE_FLAG=""

if [[ $# -gt 0 ]]; then
    SOURCE_FLAG="--from $1"
fi

# Prefer a globally-installed zephyr; fall back to npx.
if command -v zephyr >/dev/null 2>&1; then
    zephyr icons \
        --out "$ASSETS_DIR" \
        --primary "$PRIMARY_COLOR" \
        --letter "$LETTER" \
        $SOURCE_FLAG
else
    npx zephyr icons \
        --out "$ASSETS_DIR" \
        --primary "$PRIMARY_COLOR" \
        --letter "$LETTER" \
        $SOURCE_FLAG
fi

echo "Icons regenerated in $ASSETS_DIR"
