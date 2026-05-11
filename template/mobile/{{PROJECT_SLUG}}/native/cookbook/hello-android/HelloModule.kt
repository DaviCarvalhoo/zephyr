/*
 * HelloModule — canonical Android native module (Kotlin).
 *
 * The whole pattern in 70 lines. Every other Kotlin module in this
 * project follows the same three-file shape:
 *
 *   1. ReactContextBaseJavaModule (this file) — the implementation.
 *      Methods marked @ReactMethod are visible to JS.
 *   2. ReactPackage (HelloPackage.kt) — declares which modules + view
 *      managers the package provides.
 *   3. Registration in MainApplication.getPackages() — the line that
 *      adds your package to RN's bridge.
 *
 * Replace `package <ANDROID_PACKAGE>` with your reverse-DNS.
 */

package <ANDROID_PACKAGE>

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class HelloModule(reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    // The string JS uses: NativeModules.Hello. Keep this in sync
    // with the @objc(Hello) name in HelloModule.swift so iOS + Android
    // share the same JS-side identity.
    override fun getName() = "Hello"

    // Sync method — JS calls Hello.greet(name) and gets a string.
    // Reserve sync for fast/cheap ops; everything else uses Promise.
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun greet(name: String): String {
        return "Hello, $name!"
    }

    // Promise-based async — the standard pattern for I/O, network,
    // anything that might take time.
    @ReactMethod
    fun echoAsync(value: String, promise: Promise) {
        try {
            promise.resolve(value)
        } catch (e: Exception) {
            // Reject codes are arbitrary strings; document yours so
            // JS callers can switch on them.
            promise.reject("echo_error", e.message, e)
        }
    }

    // Constants exported at module-load time. Read in JS as
    // `NativeModules.Hello.platform`.
    override fun getConstants(): Map<String, Any> = mapOf(
        "platform" to "android",
        "version"  to "1.0.0"
    )
}
