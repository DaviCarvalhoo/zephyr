// HelloModule — canonical iOS native module.
//
// The whole pattern in 80 lines. Every other Swift module in this
// project (notifications, Live Activity, etc.) follows this exact
// shape; if you understand this file, you understand all of them.
//
// Three pieces work together:
//   1. .swift file (this one) — the actual implementation, marked
//      @objc so Objective-C can call it.
//   2. .m bridge — declares each method to the React Native runtime
//      via RCT_EXTERN_METHOD. RN's macros are Objective-C, so we
//      can't put them in Swift; the bridge is the only reason this
//      isn't pure Swift.
//   3. requiresMainQueueSetup — false unless the module touches UIKit
//      at init time. False is faster (lets RN init us off the main
//      thread); flip to true if you need it.

import Foundation

@objc(Hello)
class HelloModule: NSObject {

    // Sync export — JS calls Hello.greet(name) and gets a string back
    // immediately. Sync calls are blocking; reserve for fast/cheap ops.
    @objc func greet(_ name: String) -> String {
        return "Hello, \(name)!"
    }

    // Promise-based async export — the standard pattern for anything
    // that does I/O, file ops, or network. JS sees this as
    // `Hello.echoAsync(value)` returning a Promise.
    @objc func echoAsync(
        _ value: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        // Pretend we did something async.
        DispatchQueue.global().async {
            // Reject pattern when something goes wrong:
            //   reject("error_code", "Human message", error)
            resolve(value)
        }
    }

    // Constants exported to JS at module-load time. Read in JS as
    // `NativeModules.Hello.SOME_CONSTANT`. Keys must be string-safe
    // for the JS bridge.
    @objc func constantsToExport() -> [AnyHashable: Any] {
        return [
            "platform": "ios",
            "version":  "1.0.0"
        ]
    }

    // Set this to true if the module must be initialized on the main
    // thread (anything that touches UIKit at init time qualifies).
    // false unblocks RN's bridge bootstrap → faster cold-starts.
    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
