// AppNotificationsModule
// Custom-native local notifications with cold-start tap dispatch.
//
// Lifecycle:
//   1. AppDelegate registers an UNUserNotificationCenterDelegate
//      AT BOOT (see AppDelegate.swift in this folder). That's the only
//      reliable way to capture taps that arrive before JS is ready.
//   2. The delegate writes the tap into UserDefaults via
//      `notifyTap(title:body:data:)` and posts a deep link
//      `<scheme>://notif` so the JS layer's Linking listener wakes up.
//   3. JS calls `consumePending()` from cold-start AND from the
//      Linking handler. Reads from UserDefaults, clears the slot,
//      returns it.
//
// RCTBridgeModule conformance is in AppNotificationsModule.m via
// RCT_EXTERN_MODULE — Swift's @objc isn't enough on its own.

import UserNotifications

private let kPendingTitle = "app_pending_notif_title"
private let kPendingBody  = "app_pending_notif_body"
private let kPendingData  = "app_pending_notif_data"

@objc(AppNotifications)
class AppNotificationsModule: NSObject {

    // Called by AppDelegate when ANY notification is tapped. Writes
    // into UserDefaults so consumePending() can read it whenever JS
    // wakes up next (cold-start, foreground, or Linking).
    static func notifyTap(
        title: String,
        body: String,
        data: [String: String]
    ) {
        let ud = UserDefaults.standard
        ud.set(title, forKey: kPendingTitle)
        ud.set(body,  forKey: kPendingBody)
        ud.set(data,  forKey: kPendingData)
    }

    // MARK: - JS-callable

    @objc func requestPermission(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .badge, .sound]
        ) { granted, err in
            if let err = err {
                reject("permission_error", err.localizedDescription, err)
                return
            }
            resolve(granted ? "granted" : "denied")
        }
    }

    @objc func getStatus(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        UNUserNotificationCenter.current().getNotificationSettings {
            settings in
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral:
                resolve("granted")
            case .denied:
                resolve("denied")
            case .notDetermined:
                resolve("undetermined")
            @unknown default:
                resolve("undetermined")
            }
        }
    }

    @objc func schedule(
        _ args: NSDictionary,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard
            let id = args["id"] as? String,
            let title = args["title"] as? String,
            let body = args["body"] as? String,
            let fireAt = (args["fireAt"] as? NSNumber)?.doubleValue
        else {
            reject("bad_args", "id, title, body, fireAt are required", nil)
            return
        }
        let data = (args["data"] as? [String: String]) ?? [:]

        let content = UNMutableNotificationContent()
        content.title    = title
        content.body     = body
        content.sound    = .default
        content.userInfo = data

        // fireAt arrives in ms-since-epoch from JS — convert to seconds
        // and clamp to "now" so a stale request fires immediately.
        let interval = max(0.1, (fireAt / 1000.0) - Date().timeIntervalSince1970)
        let trigger = UNTimeIntervalNotificationTrigger(
            timeInterval: interval,
            repeats: false
        )

        let request = UNNotificationRequest(
            identifier: id,
            content: content,
            trigger: trigger
        )
        UNUserNotificationCenter.current().add(request) { err in
            if let err = err {
                reject("schedule_error", err.localizedDescription, err)
                return
            }
            resolve(nil)
        }
    }

    @objc func cancel(
        _ id: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        UNUserNotificationCenter.current()
            .removePendingNotificationRequests(withIdentifiers: [id])
        resolve(nil)
    }

    @objc func cancelAll(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        UNUserNotificationCenter.current()
            .removeAllPendingNotificationRequests()
        resolve(nil)
    }

    @objc func consumePending(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        let ud = UserDefaults.standard
        guard
            let title = ud.string(forKey: kPendingTitle),
            let body = ud.string(forKey: kPendingBody)
        else {
            resolve(nil)
            return
        }
        let data = (ud.dictionary(forKey: kPendingData) as? [String: String]) ?? [:]

        ud.removeObject(forKey: kPendingTitle)
        ud.removeObject(forKey: kPendingBody)
        ud.removeObject(forKey: kPendingData)

        resolve([
            "title": title,
            "body":  body,
            "data":  data
        ])
    }

    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
