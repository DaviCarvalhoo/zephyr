#!/usr/bin/env bash
#
# prebuild — safe wrapper around `npx expo prebuild`.
#
# Once you generate ios/ and android/ directories you own them. Common
# additions you'll lose to `--clean`: custom Swift modules (audio, push,
# Live Activity), AppDelegate edits, MainActivity edits, Widget targets,
# additional Info.plist keys, custom Gradle config.
#
# This wrapper refuses --clean. To genuinely reset native state, move
# your customizations into config plugins under ./plugins/ first, then
# delete ios/ and android/ manually and re-run `npm run prebuild`.

set -euo pipefail

for arg in "$@"; do
    case "$arg" in
        --clean|--clean=*)
            echo "ERROR: 'expo prebuild --clean' wipes hand-written native code." >&2
            echo "       Run 'npm run prebuild' (no flag) for a safe additive prebuild," >&2
            echo "       or migrate your custom edits into config plugins first." >&2
            exit 1
            ;;
    esac
done

cd "$(dirname "$0")/../mobile/{{PROJECT_SLUG}}"
exec npx expo prebuild "$@"
