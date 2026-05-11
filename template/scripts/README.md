# scripts/

Top-level helper scripts. Anything mobile-related is in here too — the
mobile sub-project never has its own `scripts/` folder, by design, so
you find every command in one place.

## Mobile

| Script | What it does |
|---|---|
| `prebuild.sh` | Safe `expo prebuild` (refuses `--clean` to protect committed native code). Run this before any iOS/Android build. |
| `install-native.sh` | After prebuild, copy `native/{ios,android}/*` into the generated project dirs and print the manual AppDelegate/MainActivity patches. |
| `run-ios.sh` | Build + run on iOS without opening Xcode. Auto-detects connected device; falls back to simulator. `--simulator`, `--device "Name"`, `--clean`. |
| `release-android.sh` | EAS local build → submit to Play Store internal track → delete the AAB. Reads service-account key from `server/.env` if available. |
| `bump-version.sh` | Walks every file that holds the version (`package.json`, `app.json`, `android/.../build.gradle`, every `ios/**/Info.plist` including extensions, `project.pbxproj`) and updates them in lockstep. `patch` (default), `minor`, `major`, or explicit `<version> <build>`. |
| `generate-icons.sh` | (Re)generate the icon/splash asset set. From-scratch (uses primary color + first letter) or from a source PNG. |
| `extract-play-key.js` | Pull `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` out of `server/.env` and write it to `mobile/<slug>/google-play-key.json` for `eas submit`. Called automatically by `release-android.sh`. |

## Server / web stack

These live at the project root (one level up from this dir):

| Script | What it does |
|---|---|
| `install.sh` | Install npm deps for every sub-project. Pass `--native` to also run `expo prebuild`, `pod install`, and `install-native.sh` for mobile. |
| `seed.sh` | Create the database, run migrations, seed admin user. |
| `dev.sh` | Start every service that exists (server, admin UI, site UI). Pass `--mobile` to also start Expo Metro. |

## Conventions

- Every script has a comment block at the top explaining what it does
  and what flags it takes. `--help` exits with that comment block as
  its output.
- Path-prefix `SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"` is the
  start of every shell script — keeps them runnable from anywhere.
- macOS-vs-Linux `sed -i` differences are handled inline; no
  bash-on-mac cross-compat issues.
