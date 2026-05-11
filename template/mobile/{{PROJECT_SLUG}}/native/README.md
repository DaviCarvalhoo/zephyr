# Native modules

Custom-native code that ships with this template — copied into the
right places after `expo prebuild` by `scripts/install-native.sh`.

## What ships here

| Module | iOS | Android | Notes |
|---|---|---|---|
| `AppNotifications` | `ios/AppNotificationsModule.{swift,m}` | `android/AppNotificationsModule.kt` + `AppNotificationsPackage.kt` + `AppNotificationReceiver.kt` | Local notifications with cold-start tap dispatch. Phase 5. |

## Install flow

```bash
# 1. Generate the native dirs (only needed if you don't have them yet)
./scripts/prebuild.sh

# 2. Copy our custom modules into the right places + patch
#    AppDelegate.swift / MainActivity.kt / MainApplication.kt
./scripts/install-native.sh
```

The install script:
- copies `native/ios/*.{swift,m}` to `ios/<slug>/`
- copies `native/android/*.kt` to
  `android/app/src/main/java/<package-path>/`
- substitutes `<ANDROID_PACKAGE>` in the Kotlin sources for the
  project's actual package
- prints **manual steps** that need a human eye:
  - register `UNUserNotificationCenterDelegate` in `AppDelegate.swift`
  - intercept `from_notification` extras in `MainActivity.kt`
  - add `AppNotificationsPackage()` to `MainApplication.getPackages()`
  - add the `<receiver>` declaration to `AndroidManifest.xml`

The patches are **not** auto-applied because the surrounding files
get edited frequently by Expo and other plugins; clobbering them
would lose work. The manual-step output gives you the exact diff.

## Why custom-native instead of expo-notifications?

The bottom line: cold-start tap dispatch + per-button action intents.

- `expo-notifications` surfaces a tap only after the JS bridge boots,
  which can be too late if your UX wants to react instantly to a
  cold-start tap.
- Our native module writes the tap into UserDefaults /
  SharedPreferences from the platform's *first* callback. JS calls
  `consumePendingNotification()` whenever it's ready and gets the tap.
- Action buttons get full per-button intents (so a "quick reply"
  button can flip state without launching the app at all).

If you don't need either feature, swap to `expo-notifications` and
delete this whole directory + the install-script lines that touch it.

## Cookbook (`native/cookbook/`)

Reference implementations of every common native pattern. **None of
these are auto-installed** — copy out what you need:

| Path | What | Audience |
|---|---|---|
| `hello-ios/HelloModule.{swift,m}` | Canonical Swift module + ObjC bridge. Sync export, async Promise export, exported constants, requiresMainQueueSetup. | Read once, you understand every iOS module in this codebase. |
| `hello-android/HelloModule.kt` + `HelloPackage.kt` | Canonical Kotlin module + ReactPackage. Sync, Promise, getConstants. | Same idea, Android side. |
| `live-activity/` | WidgetKit Live Activity scaffold — `AppLiveActivityAttributes.swift` shared between targets, plus a step-by-step Xcode setup README. | iOS-only; needs a separate widget target. |

## Gotchas (the ones we paid for so you don't have to)

- **Cold-start tap dispatch** — iOS surfaces tap callbacks via the
  UNUserNotificationCenter delegate, which runs *before* JS is ready.
  Stash the tap data into UserDefaults from the delegate, then
  dispatch a deep link (`<scheme>://notif`) so the JS Linking
  listener wakes the app's notification consumer. Android's
  equivalent is `MainActivity.onCreate / onNewIntent` reading the
  launch intent + emitting via `DeviceEventEmitter`.

- **`NativeEventEmitter` on iOS will crash** if the native module
  doesn't extend `RCTEventEmitter`. NSObject-based modules with
  `@objc` exports look like emitters from JS but blow up at
  construction. Use `Linking` events instead (the trick above).

- **App-extension CFBundleVersion mismatch** — Apple requires every
  app extension's CFBundleVersion to match the parent app's,
  otherwise codesigning fails with a confusing message.
  `scripts/bump-version.sh` walks `ios/**/Info.plist` to keep them
  in sync; if you add a new extension target, no extra config needed
  — it just works.

- **`expo prebuild --clean` will silently delete your native code.**
  `scripts/prebuild.sh` refuses `--clean`. To genuinely reset, move
  customizations into config plugins under `./plugins/` first.

- **NitroModules + Expo Go = crash on import.** Anything using nitro
  (e.g. react-native-iap v15) needs to be lazy-loaded with
  `try/require` so Expo Go doesn't blow up. See
  `src/services/iap/index.ts` for the pattern.

- **iOS HealthKit needs an entitlement.** It's wired in `app.json`
  via `ios.entitlements["com.apple.developer.healthkit"]: true`,
  but you also need to enable it in Apple Developer Portal under
  the App ID's capabilities. Without that the entitlement file
  generates fine but signing rejects it.

- **Android Health Connect requires API 28+.** App still installs on
  older devices but health features no-op there. Don't lower the
  `minSdkVersion: 26` in `expo-build-properties` without a plan
  for the missing platform.
