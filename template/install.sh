#!/bin/bash

# install — install dependencies for every sub-project this preset
# generated. Each block is guarded on directory existence so the same
# script runs cleanly across every preset.
#
# Flags:
#   --native   Also run `expo prebuild` and `pod install` for mobile.
#              Heavy and platform-specific (needs Xcode CLI for iOS).
#              Skip on first install if you're just kicking the tires.

set -e

WITH_NATIVE=0
for arg in "$@"; do
    case "$arg" in
        --native) WITH_NATIVE=1 ;;
    esac
done

echo "Installing Dependencies"
echo "======================="
echo ""

if [ -d server ]; then
    echo "Installing server dependencies..."
    (cd server && npm install)
    echo "Server dependencies installed"
    echo ""
fi

if [ -d ui/admin ]; then
    echo "Installing admin UI dependencies..."
    (cd ui/admin && npm install)
    echo "Admin UI dependencies installed"
    echo ""
fi

if [ -d ui/site ]; then
    echo "Installing site UI dependencies..."
    (cd ui/site && npm install)
    echo "Site UI dependencies installed"
    echo ""
fi

if [ -d "mobile/{{PROJECT_SLUG}}" ]; then
    echo "Installing mobile dependencies..."
    (cd "mobile/{{PROJECT_SLUG}}" && npm install)
    echo "Mobile dependencies installed"
    echo ""

    if [ "$WITH_NATIVE" = "1" ]; then
        echo "Generating native iOS / Android projects (expo prebuild)..."
        (cd "mobile/{{PROJECT_SLUG}}" && npm run prebuild)

        if [[ "$(uname)" == "Darwin" ]]; then
            if [ -d "mobile/{{PROJECT_SLUG}}/ios" ]; then
                echo "Installing iOS pods..."
                (cd "mobile/{{PROJECT_SLUG}}/ios" && pod install)
            fi
        fi

        echo "Copying custom native modules + printing manual patches..."
        (cd "mobile/{{PROJECT_SLUG}}" && ./scripts/install-native.sh)
        echo ""
    fi
fi

echo "Setting up environment files..."
echo ""

if [ -d server ] && [ ! -f server/.env ]; then
    cp server/.env.sample server/.env
    echo "Created server/.env"
elif [ -d server ]; then
    echo "server/.env already exists"
fi

if [ -d ui/site ] && [ ! -f ui/site/.env ]; then
    cp ui/site/.env.sample ui/site/.env
    echo "Created ui/site/.env"
elif [ -d ui/site ]; then
    echo "ui/site/.env already exists"
fi

echo ""
echo "======================="
echo "Installation Complete!"
echo ""
echo "Next steps:"
if [ -d server ]; then
    echo "  1. Edit server/.env with your database credentials"
    echo "  2. ./seed.sh       (create db + migrate + seed admin)"
    echo "  3. ./dev.sh        (start all services)"
fi
if [ -d "mobile/{{PROJECT_SLUG}}" ]; then
    echo "     ./dev.sh --mobile    (also start Expo Metro)"
    if [ "$WITH_NATIVE" != "1" ]; then
        echo ""
        echo "  When you need to build native iOS/Android:"
        echo "     ./install.sh --native    (prebuild + pod install)"
    fi
fi
echo ""
