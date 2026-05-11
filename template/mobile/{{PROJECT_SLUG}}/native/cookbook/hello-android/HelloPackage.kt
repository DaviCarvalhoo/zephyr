/*
 * HelloPackage — registers HelloModule with the React Native bridge.
 *
 * This is the boilerplate every Kotlin module needs. To wire it up,
 * add a single line to MainApplication.kt's `getPackages()`:
 *
 *     packages.add(HelloPackage())
 *
 * Replace `package <ANDROID_PACKAGE>` with your reverse-DNS.
 */

package <ANDROID_PACKAGE>

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class HelloPackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> = listOf(HelloModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> = emptyList()
}
