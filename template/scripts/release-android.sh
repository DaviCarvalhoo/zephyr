#!/usr/bin/env bash
#
# release-android — build a production AAB locally with EAS, submit it
# to Google Play (internal track), then delete the AAB on success.
#
# Pre-requisites:
#   - eas-cli installed and logged in (`npx eas login`)
#   - google-play-key.json present at the project root (service account
#     with the Google Play Developer API enabled). The path is read
#     from eas.json under submit.production.android.serviceAccountKeyPath.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../mobile/{{PROJECT_SLUG}}" && pwd)"

cd "$APP_DIR"

# If server/.env defines GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, refresh
# google-play-key.json from there so a rotated key is picked up
# automatically. Otherwise the manually-placed file is used as-is.
if [[ -f "$SCRIPT_DIR/../server/.env" ]] && grep -q '^GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=' "$SCRIPT_DIR/../server/.env"; then
    echo "==> Extracting Play service account key from server/.env..."
    node "$SCRIPT_DIR/extract-play-key.js"
fi

if [[ ! -f google-play-key.json ]]; then
    echo "ERROR: google-play-key.json not found at $APP_DIR/google-play-key.json" >&2
    echo "       Either drop a service account JSON there manually, or" >&2
    echo "       set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON in server/.env" >&2
    echo "       so this script can extract it on each run." >&2
    exit 1
fi

shopt -s nullglob

# Snapshot existing artifacts so we can identify the new one.
# macOS ships bash 3.2 which lacks associative arrays — use a plain array.
before=()
for f in build-*.aab; do
    before+=("$f")
done

echo "==> Building Android production AAB locally..."
eas build --platform android --profile production --local --non-interactive

new_aab=""
for f in build-*.aab; do
    seen=0
    if (( ${#before[@]} > 0 )); then
        for b in "${before[@]}"; do
            if [[ "$f" == "$b" ]]; then
                seen=1
                break
            fi
        done
    fi
    if [[ $seen -eq 0 ]]; then
        new_aab="$f"
        break
    fi
done

if [[ -z "$new_aab" ]]; then
    echo "ERROR: build completed but no new build-*.aab was created" >&2
    exit 1
fi

echo "==> Built: $new_aab ($(du -h "$new_aab" | cut -f1))"
echo "==> Submitting to Google Play (track: internal)..."

if eas submit --platform android --profile production --path "$new_aab" --non-interactive; then
    echo "==> Submit succeeded — deleting $new_aab"
    rm "$new_aab"
    echo "Done."
else
    echo "ERROR: submit failed. Keeping $new_aab so you can retry." >&2
    exit 1
fi
