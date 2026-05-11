#!/bin/bash

# dev — start every service this project ships with.
#
# Mobile is started by default (Metro pops up alongside the API/UI).
# Pass --no-mobile if you don't want Metro on this run.
#
# Each service runs in the background; Ctrl+C tears them all down
# via the EXIT trap. Sections only fire when their directory exists,
# so this script is preset-agnostic: web-only, mobile+server,
# just-mobile, and the full stack all run cleanly.

set -e

START_MOBILE=1
for arg in "$@"; do
    case "$arg" in
        --no-mobile) START_MOBILE=0 ;;
        # --mobile kept for backwards-compat (was opt-in before).
        --mobile) START_MOBILE=1 ;;
    esac
done

echo "Starting services"
echo "================="
echo ""

trap 'kill $(jobs -p) 2>/dev/null' EXIT

if [ -d server ] && [ ! -f server/.env ]; then
    echo "Warning: server/.env not found"
    echo "Run ./install.sh first"
    exit 1
fi

if [ -d server ]; then
    echo "  Admin API   (port {{API_PORT}})"
    (cd server && npm run dev) &

    echo "  Site API    (port {{SITE_API_PORT}})"
    (cd server && npm run dev:site-api) &
fi

if [ -d ui/admin ]; then
    echo "  Admin Panel (port {{ADMIN_UI_PORT}})"
    (cd ui/admin && npm run dev) &
fi

if [ -d ui/site ]; then
    echo "  Site        (port {{SITE_PORT}})"
    (cd ui/site && npm run dev) &
fi

if [ -d "mobile/{{PROJECT_SLUG}}" ] && [ "$START_MOBILE" = "1" ]; then
    echo "  Mobile      (Expo Metro)"
    (cd "mobile/{{PROJECT_SLUG}}" && npm run start) &
fi

echo ""
echo "Press Ctrl+C to stop all services"
echo ""

if [ -d server ]; then
    echo "  Admin API:    http://localhost:{{API_PORT}}"
    echo "  Site API:     http://localhost:{{SITE_API_PORT}}"
fi
if [ -d ui/admin ]; then
    echo "  Admin Panel:  http://localhost:{{ADMIN_UI_PORT}}"
fi
if [ -d ui/site ]; then
    echo "  Site:         http://localhost:{{SITE_PORT}}"
fi
if [ -d "mobile/{{PROJECT_SLUG}}" ] && [ "$START_MOBILE" = "1" ]; then
    echo "  Mobile:       Expo Metro UI in this terminal"
fi
if [ -d "mobile/{{PROJECT_SLUG}}" ] && [ "$START_MOBILE" != "1" ]; then
    echo ""
    echo "  (Mobile skipped — drop --no-mobile to include it.)"
fi
echo ""

wait
