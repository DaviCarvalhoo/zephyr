#!/usr/bin/env bash
#
# install-native — copy native modules from `native/` into the
# expo-prebuilt `ios/` and `android/` directories, and print the
# remaining manual patches.
#
# Run AFTER `./scripts/prebuild.sh`. Re-run any time you sync new
# code into native/.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../mobile/{{PROJECT_SLUG}}" && pwd)"

ANDROID_PACKAGE="{{ANDROID_PACKAGE}}"

if [[ "$(uname)" == "Darwin" ]]; then
    SED_INPLACE=(sed -i '')
else
    SED_INPLACE=(sed -i)
fi

echo "==> Installing native modules..."

# ── iOS ─────────────────────────────────────────────────────────────
# Expo names the iOS project after `expo.name` from app.json (often
# PascalCase) — not the slug. Auto-detect by looking for the .xcodeproj.
IOS_DEST=""
if [[ -d "$APP_DIR/ios" ]]; then
    XCODEPROJ=$(find "$APP_DIR/ios" -maxdepth 2 -name '*.xcodeproj' -type d | head -n1 || true)
    if [[ -n "$XCODEPROJ" ]]; then
        IOS_PROJECT_NAME=$(basename "$XCODEPROJ" .xcodeproj)
        IOS_DEST="$APP_DIR/ios/$IOS_PROJECT_NAME"
    fi
fi

if [[ -n "$IOS_DEST" && -d "$IOS_DEST" ]]; then
    echo "  iOS: copying to $IOS_DEST"
    cp "$APP_DIR/native/ios/"*.swift "$IOS_DEST/"
    cp "$APP_DIR/native/ios/"*.m     "$IOS_DEST/"
else
    echo "  iOS: skipping ($IOS_DEST not found — run prebuild first)" >&2
fi

# ── Android ─────────────────────────────────────────────────────────
ANDROID_PKG_PATH="${ANDROID_PACKAGE//.//}"
ANDROID_DEST="$APP_DIR/android/app/src/main/java/$ANDROID_PKG_PATH"

if [[ -d "$ANDROID_DEST" ]]; then
    echo "  Android: copying to $ANDROID_DEST"
    cp "$APP_DIR/native/android/"*.kt "$ANDROID_DEST/"
    # Substitute <ANDROID_PACKAGE> placeholder in the copied files.
    # Substitute <ANDROID_PACKAGE> across every Kotlin file we copied
    # — Module + Package + Receiver all need it.
    for f in "$ANDROID_DEST/"AppNotification*.kt; do
        "${SED_INPLACE[@]}" "s|<ANDROID_PACKAGE>|$ANDROID_PACKAGE|g" "$f"
    done
else
    echo "  Android: skipping ($ANDROID_DEST not found — run prebuild first)" >&2
fi

# ── Manual patches ──────────────────────────────────────────────────
cat <<'PATCH'

==> Manual patches needed (the install script never edits AppDelegate
    or MainActivity automatically — Expo and other plugins regenerate
    those files, and clobbering them would lose other customizations).

────────────────────────────────────────────────────────────────────
ios/<slug>/AppDelegate.swift
  Add at the bottom of `application(_:didFinishLaunchingWithOptions:)`:

      UNUserNotificationCenter.current().delegate = self

  Add this extension at the bottom of the file:

      extension AppDelegate: UNUserNotificationCenterDelegate {
          func userNotificationCenter(
              _ center: UNUserNotificationCenter,
              didReceive response: UNNotificationResponse,
              withCompletionHandler completionHandler:
                  @escaping () -> Void
          ) {
              let req = response.notification.request
              let title = req.content.title
              let body  = req.content.body
              let data  = (req.content.userInfo as? [String: String])
                  ?? [:]
              AppNotificationsModule.notifyTap(
                  title: title, body: body, data: data
              )
              // Wake the JS layer so it consumes immediately if running.
              if let url = URL(string: "{{MOBILE_SCHEME}}://notif") {
                  RCTLinkingManager.application(
                      UIApplication.shared,
                      open: url,
                      options: [:]
                  )
              }
              completionHandler()
          }
      }

  Make sure RCTLinkingManager is imported:

      #import <React/RCTLinkingManager.h>

  ...in your bridging header (ios/<slug>/<slug>-Bridging-Header.h).

────────────────────────────────────────────────────────────────────
android/app/src/main/java/<your-package>/MainApplication.kt

  Inside `getPackages()`, append:

      add(AppNotificationsPackage())

────────────────────────────────────────────────────────────────────
android/app/src/main/java/<your-package>/MainActivity.kt

  Override onNewIntent + handle the launch intent in onCreate. Add:

      override fun onCreate(savedInstanceState: Bundle?) {
          super.onCreate(savedInstanceState)
          consumeNotifIntent(intent)
      }

      override fun onNewIntent(intent: Intent) {
          super.onNewIntent(intent)
          setIntent(intent)
          consumeNotifIntent(intent)
      }

      private fun consumeNotifIntent(intent: Intent?) {
          if (intent?.getBooleanExtra("from_notification", false) != true) {
              return
          }
          val title = intent.getStringExtra("notif_title") ?: ""
          val body  = intent.getStringExtra("notif_body")  ?: ""
          val data  = intent.getStringExtra("notif_data")  ?: ""
          val rc = (application as ReactApplication)
              .reactNativeHost
              .reactInstanceManager
              .currentReactContext
          AppNotificationsModule.notifyTap(this, rc, title, body, data)
      }

────────────────────────────────────────────────────────────────────
android/app/src/main/AndroidManifest.xml
  Add inside <application>:

      <receiver
          android:name=".AppNotificationReceiver"
          android:exported="false" />

  And ensure the parent <manifest> has:

      <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
      <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />

────────────────────────────────────────────────────────────────────

When done, do a clean build:

  ./scripts/run-ios.sh --clean         # iOS
  npx expo run:android --clean         # Android

PATCH

echo "Done."
