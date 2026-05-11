#!/usr/bin/env bash
#
# run-ios — build and run on iOS without opening Xcode.
#
# Default: physical device if connected, otherwise simulator.
#
# Usage:
#   ./scripts/run-ios.sh                     # auto
#   ./scripts/run-ios.sh --simulator         # force simulator
#   ./scripts/run-ios.sh --device            # interactive device picker
#   ./scripts/run-ios.sh --device "iPhone X" # specific device by name
#   ./scripts/run-ios.sh --clean             # wipe ios/build first

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../mobile/{{PROJECT_SLUG}}" && pwd)"

CLEAN=0
FORCE_SIM=0
FORCE_DEVICE=0
DEVICE_NAME=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --clean)
            CLEAN=1
            shift
            ;;
        --simulator|--sim)
            FORCE_SIM=1
            shift
            ;;
        --device)
            FORCE_DEVICE=1
            shift
            if [[ $# -gt 0 && "$1" != --* ]]; then
                DEVICE_NAME="$1"
                shift
            fi
            ;;
        -h|--help)
            sed -n '2,15p' "$0" | sed 's/^# \?//'
            exit 0
            ;;
        *)
            echo "Unknown flag: $1" >&2
            echo "Try: $0 --help" >&2
            exit 1
            ;;
    esac
done

cd "$APP_DIR"

if [[ $CLEAN -eq 1 ]]; then
    echo "==> Cleaning iOS build artifacts..."
    rm -rf ios/build
fi

# Auto-detect: is a physical device attached?
has_device() {
    xcrun xctrace list devices 2>&1 \
        | grep -v -E 'Simulator|^==|^$' \
        | grep -E '\([A-F0-9]{8}-[A-F0-9]{16}\)' >/dev/null
}

if [[ $FORCE_SIM -eq 1 ]]; then
    echo "==> Target: iOS simulator"
    exec npx expo run:ios
fi

if [[ $FORCE_DEVICE -eq 1 ]]; then
    if [[ -n "$DEVICE_NAME" ]]; then
        echo "==> Target: device '$DEVICE_NAME'"
        exec npx expo run:ios --device "$DEVICE_NAME" --configuration Release
    else
        echo "==> Target: physical device (interactive picker)"
        exec npx expo run:ios --device --configuration Release
    fi
fi

if has_device; then
    echo "==> Physical device detected, installing on device..."
    exec npx expo run:ios --device --configuration Release
fi

echo "==> No device detected, falling back to simulator..."
exec npx expo run:ios
