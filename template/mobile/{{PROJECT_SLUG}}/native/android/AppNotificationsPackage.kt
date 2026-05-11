/*
 * ReactPackage for AppNotificationsModule. Has to be added to
 * MainApplication.getPackages() — see install-native.sh for the
 * exact line to insert.
 *
 * Replace `package <ANDROID_PACKAGE>` with your reverse-DNS package.
 */

package <ANDROID_PACKAGE>

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AppNotificationsPackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> = listOf(
        AppNotificationsModule(reactContext)
    )

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> = emptyList()
}
