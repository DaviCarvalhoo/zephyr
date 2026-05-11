# Live Activity scaffold (iOS WidgetKit)

Live Activities are pinned to the Lock Screen + Dynamic Island. They
run in their own app-extension target, separate from the main app
process — pieces communicate via a shared App Group container.

## Why a separate target?

WidgetKit extensions can't import any of the main app's code that
isn't in a shared framework. Most projects keep the extension lean:
a `Widget` struct, an `ActivityAttributes` struct shared by both
sides, and platform-glue code that opens/updates/ends activities.

## Files in this scaffold

| File | Purpose |
|---|---|
| `AppLiveActivityAttributes.swift` | Shape of the activity's state (per-update payload). Must be importable by both targets. |
| `AppLiveActivityWidget.swift` | The Widget implementation — Lock Screen views + Dynamic Island regions. Lives only in the extension target. |
| `AppLiveActivityModule.swift` + `.m` | RN bridge: start/update/end. Lives in the main app target. |
| `Info.plist` | Extension target's plist. Replaces nothing — it's added to the new target. |

## Setup steps

After `expo prebuild`:

1. **Create the Widget target in Xcode.**
   - File → New → Target → Widget Extension.
   - Name it `<Slug>Widget`. Uncheck "Include Live Activity" so we
     can add ours rather than the auto-generated one.
   - Move `AppLiveActivityAttributes.swift` into a folder both
     targets compile (typically the main app target's "Shared" group,
     with target membership ticked for both).

2. **Wire the App Group** (only needed if you pass data between the
   main app and the extension via UserDefaults).
   - Signing & Capabilities → + Capability → App Groups → enable on
     BOTH targets, with the same group ID
     (e.g. `group.{{IOS_BUNDLE_ID}}`).

3. **Add `NSSupportsLiveActivities = YES`** to Info.plist of the
   main app target.

4. **Drop `AppLiveActivityWidget.swift` + `Info.plist` into the
   widget target** (target membership = widget only).

5. **Drop `AppLiveActivityModule.{swift,m}` into the main app
   target**, then expose to JS like any other native module.

6. **Build the extension target once** so the activity registers.
   Then start one from JS:

   ```ts
   import { NativeModules } from 'react-native';
   const { AppLiveActivity } = NativeModules;

   await AppLiveActivity.start({ taskName: 'Focus session', endsAt: Date.now() + 25 * 60 * 1000 });
   await AppLiveActivity.update({ remainingSec: 1200 });
   await AppLiveActivity.end();
   ```

## Constraints to know about

- **iOS 16.1+** for Live Activities at all. The bridge module should
  guard on `if #available(iOS 16.1, *)` and no-op gracefully on older.
- Activities have a **system-imposed ~8 hour budget** per session
  before iOS auto-ends them. Plan UX around that.
- The Dynamic Island regions are NOT auto-shown on every device —
  only Pro models have it. Always implement the lock-screen view
  too as a fallback.
- Codesigning: the widget extension's `CFBundleVersion` MUST match
  the parent app's. `scripts/bump-version.sh` handles this; if you
  add another extension, make sure the bump script picks it up.
