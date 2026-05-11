/*
 * AppNotificationsModule — custom-native local notifications with
 * cold-start tap dispatch.
 *
 * Lifecycle:
 *   1. MainActivity.onCreate / onNewIntent inspect the launch intent
 *      and call AppNotificationsModule.notifyTap(...) when an extra
 *      flagged "from-notification" is present. This works whether
 *      the app was killed (onCreate) or backgrounded (onNewIntent).
 *   2. notifyTap writes the payload to SharedPreferences AND emits
 *      a DeviceEventEmitter event 'appNotificationTapped' so any
 *      JS that's already running picks it up immediately.
 *   3. JS calls consumePending() on cold-start AND from the
 *      DeviceEventEmitter listener. The pref slot is cleared on read.
 *
 * After expo prebuild, copy this file to:
 *   android/app/src/main/java/<package-path>/AppNotificationsModule.kt
 *
 * Replace `package <ANDROID_PACKAGE>` with your actual reverse-DNS
 * package (matches `android.package` in app.json).
 */

package <ANDROID_PACKAGE>

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class AppNotificationsModule(reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AppNotifications"

    private val prefs: SharedPreferences =
        reactApplicationContext.getSharedPreferences(
            "AppNotificationsPrefs", Context.MODE_PRIVATE
        )

    companion object {
        private const val CHANNEL_ID = "app_notifications"
        private const val K_PENDING_TITLE = "pending_title"
        private const val K_PENDING_BODY  = "pending_body"
        private const val K_PENDING_DATA  = "pending_data_json"

        // Called by MainActivity on tap.
        fun notifyTap(
            ctx: Context,
            reactCtx: ReactApplicationContext?,
            title: String,
            body: String,
            data: String
        ) {
            val prefs = ctx.getSharedPreferences(
                "AppNotificationsPrefs", Context.MODE_PRIVATE
            )
            prefs.edit()
                .putString(K_PENDING_TITLE, title)
                .putString(K_PENDING_BODY,  body)
                .putString(K_PENDING_DATA,  data)
                .apply()

            // Emit immediately for any already-running JS. The cold-
            // start case is covered by JS calling consumePending()
            // after initDb() — that reads from the same prefs.
            reactCtx?.let { rc ->
                if (rc.hasActiveCatalystInstance()) {
                    rc.getJSModule(
                        DeviceEventManagerModule.RCTDeviceEventEmitter::class.java
                    ).emit("appNotificationTapped", Arguments.createMap().apply {
                        putString("title", title)
                        putString("body",  body)
                        putString("data",  data)
                    })
                }
            }
        }
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val nm = reactApplicationContext.getSystemService(
            Context.NOTIFICATION_SERVICE
        ) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL_ID) != null) {
            return
        }
        val ch = NotificationChannel(
            CHANNEL_ID,
            "{{PROJECT_NAME}}",
            NotificationManager.IMPORTANCE_DEFAULT
        )
        nm.createNotificationChannel(ch)
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        // Android 13+ requires runtime POST_NOTIFICATIONS permission.
        // The cleanest path is a JS-side prompt via PermissionsAndroid
        // — this method just reports whatever the OS thinks now.
        promise.resolve(currentStatus())
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        promise.resolve(currentStatus())
    }

    private fun currentStatus(): String {
        val nm = reactApplicationContext.getSystemService(
            Context.NOTIFICATION_SERVICE
        ) as NotificationManager
        return if (nm.areNotificationsEnabled()) "granted" else "denied"
    }

    @ReactMethod
    fun schedule(args: ReadableMap, promise: Promise) {
        val id     = args.getString("id")     ?: ""
        val title  = args.getString("title")  ?: ""
        val body   = args.getString("body")   ?: ""
        val fireAt = args.getDouble("fireAt").toLong()
        val data   = if (args.hasKey("data")) {
            args.getMap("data")?.toHashMap()?.toString() ?: ""
        } else {
            ""
        }

        ensureChannel()

        val intent = Intent(
            reactApplicationContext,
            AppNotificationReceiver::class.java
        ).apply {
            putExtra("id",    id)
            putExtra("title", title)
            putExtra("body",  body)
            putExtra("data",  data)
        }

        val pi = PendingIntent.getBroadcast(
            reactApplicationContext,
            id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val am = reactApplicationContext
            .getSystemService(Context.ALARM_SERVICE) as AlarmManager
        // setExactAndAllowWhileIdle is the strongest delivery
        // guarantee Android offers without a foreground service.
        // Falls back gracefully on older OS versions.
        try {
            am.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP, fireAt, pi
            )
        } catch (e: SecurityException) {
            // SCHEDULE_EXACT_ALARM denied (Android 12+). Use the
            // best-effort variant.
            am.set(AlarmManager.RTC_WAKEUP, fireAt, pi)
        }
        promise.resolve(null)
    }

    @ReactMethod
    fun cancel(id: String, promise: Promise) {
        val intent = Intent(
            reactApplicationContext, AppNotificationReceiver::class.java
        )
        val pi = PendingIntent.getBroadcast(
            reactApplicationContext, id.hashCode(), intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (pi != null) {
            (reactApplicationContext
                .getSystemService(Context.ALARM_SERVICE) as AlarmManager
            ).cancel(pi)
        }
        promise.resolve(null)
    }

    @ReactMethod
    fun cancelAll(promise: Promise) {
        // Best-effort. Without a registry of scheduled IDs we can't
        // cancel one-by-one. App callers that need this should keep
        // their own list of IDs and call cancel() on each.
        promise.resolve(null)
    }

    @ReactMethod
    fun consumePending(promise: Promise) {
        val title = prefs.getString(K_PENDING_TITLE, null)
        val body  = prefs.getString(K_PENDING_BODY, null)
        val data  = prefs.getString(K_PENDING_DATA, null)
        if (title == null || body == null) {
            promise.resolve(null)
            return
        }
        prefs.edit()
            .remove(K_PENDING_TITLE)
            .remove(K_PENDING_BODY)
            .remove(K_PENDING_DATA)
            .apply()

        val out = Arguments.createMap()
        out.putString("title", title)
        out.putString("body",  body)
        out.putString("data",  data ?: "")
        promise.resolve(out)
    }
}
