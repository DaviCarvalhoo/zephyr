#!/bin/bash
# Bump version across every file that holds it: package.json, app.json,
# android/app/build.gradle, ios/Info.plist, ios/<slug>.xcodeproj.
# App extensions on iOS (Widget targets, Live Activity, etc.) MUST share
# the parent app's CFBundleVersion or codesigning fails — this script
# walks ios/* looking for any extra Info.plist files and updates them too.
#
# Usage:
#   ./scripts/bump-version.sh                    # auto: +1 patch, +1 build
#   ./scripts/bump-version.sh patch              # +1 patch, +1 build
#   ./scripts/bump-version.sh minor              # +1 minor, reset patch, +1 build
#   ./scripts/bump-version.sh major              # +1 major, reset minor+patch
#   ./scripts/bump-version.sh <version> <build>  # explicit (e.g. 1.0.6 7)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../mobile/{{PROJECT_SLUG}}" && pwd)"

CURRENT_VERSION=$(grep -m1 '"version":' "$APP_DIR/app.json" | sed -E 's/.*"version": *"([^"]+)".*/\1/')
CURRENT_BUILD=$(grep -m1 '"versionCode":' "$APP_DIR/app.json" | sed -E 's/.*"versionCode": *([0-9]+).*/\1/')

if [ -z "$CURRENT_VERSION" ] || [ -z "$CURRENT_BUILD" ]; then
    echo "ERROR: could not read current version from $APP_DIR/app.json" >&2
    exit 1
fi

IFS='.' read -r CUR_MAJOR CUR_MINOR CUR_PATCH <<< "$CURRENT_VERSION"

case "${1:-patch}" in
    major)
        VERSION="$((CUR_MAJOR + 1)).0.0"
        BUILD="$((CURRENT_BUILD + 1))"
        ;;
    minor)
        VERSION="${CUR_MAJOR}.$((CUR_MINOR + 1)).0"
        BUILD="$((CURRENT_BUILD + 1))"
        ;;
    patch)
        VERSION="${CUR_MAJOR}.${CUR_MINOR}.$((CUR_PATCH + 1))"
        BUILD="$((CURRENT_BUILD + 1))"
        ;;
    *.*.*)
        VERSION="$1"
        BUILD="${2:-}"
        if [ -z "$BUILD" ]; then
            echo "ERROR: explicit version requires build number as second arg" >&2
            echo "Example: $0 1.0.6 7" >&2
            exit 1
        fi
        ;;
    *)
        echo "Usage:" >&2
        echo "  $0                     # auto (patch + build)" >&2
        echo "  $0 patch|minor|major" >&2
        echo "  $0 <version> <build>   # e.g. 1.0.6 7" >&2
        exit 1
        ;;
esac

echo "Current:  $CURRENT_VERSION (build $CURRENT_BUILD)"
echo "Next:     $VERSION (build $BUILD)"

# Use BSD-style sed -i '' on macOS, GNU-style sed -i on Linux.
if [[ "$(uname)" == "Darwin" ]]; then
    SED_INPLACE=(sed -i '')
else
    SED_INPLACE=(sed -i)
fi

# package.json
"${SED_INPLACE[@]}" "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$APP_DIR/package.json"
echo "  package.json -> $VERSION"

# app.json
"${SED_INPLACE[@]}" "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$APP_DIR/app.json"
"${SED_INPLACE[@]}" "s/\"versionCode\": [0-9]*/\"versionCode\": $BUILD/" "$APP_DIR/app.json"
echo "  app.json -> $VERSION (versionCode $BUILD)"

# android/app/build.gradle (only after expo prebuild has run)
if [ -f "$APP_DIR/android/app/build.gradle" ]; then
    "${SED_INPLACE[@]}" "s/versionCode [0-9]*/versionCode $BUILD/" "$APP_DIR/android/app/build.gradle"
    "${SED_INPLACE[@]}" "s/versionName \"[^\"]*\"/versionName \"$VERSION\"/" "$APP_DIR/android/app/build.gradle"
    echo "  android/app/build.gradle -> $VERSION (versionCode $BUILD)"
fi

# ios/**/Info.plist (parent app + every extension)
if [ -d "$APP_DIR/ios" ]; then
    while IFS= read -r plist; do
        "${SED_INPLACE[@]}" "/<key>CFBundleShortVersionString<\/key>/{n;s/<string>[^<]*<\/string>/<string>$VERSION<\/string>/;}" "$plist"
        "${SED_INPLACE[@]}" "/<key>CFBundleVersion<\/key>/{n;s/<string>[^<]*<\/string>/<string>$BUILD<\/string>/;}" "$plist"
        echo "  $plist -> $VERSION (build $BUILD)"
    done < <(find "$APP_DIR/ios" -name 'Info.plist' -not -path '*/build/*' -not -path '*/Pods/*')

    # ios/<slug>.xcodeproj/project.pbxproj
    PBXPROJ=$(find "$APP_DIR/ios" -name 'project.pbxproj' -not -path '*/build/*' | head -n1 || true)
    if [ -n "$PBXPROJ" ]; then
        "${SED_INPLACE[@]}" "s/MARKETING_VERSION = [^;]*/MARKETING_VERSION = $VERSION/" "$PBXPROJ"
        "${SED_INPLACE[@]}" "s/CURRENT_PROJECT_VERSION = [0-9]*/CURRENT_PROJECT_VERSION = $BUILD/" "$PBXPROJ"
        echo "  $PBXPROJ -> $VERSION (build $BUILD)"
    fi
fi

echo ""
echo "Done. Bumped to $VERSION / build $BUILD."
