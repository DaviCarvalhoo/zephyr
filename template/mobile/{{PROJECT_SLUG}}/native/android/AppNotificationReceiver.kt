/*
 * Receives the AlarmManager broadcast when a scheduled notification
 * fires, builds + posts the system Notification, and packs the
 * "tap-launches-app" PendingIntent so MainActivity sees the payload
 * via getIntent().getExtras() on next launch.
 *
 * Replace `package <ANDROID_PACKAGE>` with your reverse-DNS package.
 */

package <ANDROID_PACKAGE>

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat

class AppNotificationReceiver : BroadcastReceiver() {

    override fun onReceive(ctx: Context, intent: Intent) {
        val id    = intent.getStringExtra("id")    ?: return
        val title = intent.getStringExtra("title") ?: return
        val body  = intent.getStringExtra("body")  ?: return
        val data  = intent.getStringExtra("data")  ?: ""

        // Build the launch intent. The extras we set here will be
        // visible to MainActivity.onCreate / onNewIntent and routed
        // to AppNotificationsModule.notifyTap there.
        val launchIntent = Intent(
            ctx, ctx.packageManager
                .getLaunchIntentForPackage(ctx.packageName)?.component?.run {
                    Class.forName(this.className)
                } ?: return
        ).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("from_notification", true)
            putExtra("notif_title", title)
            putExtra("notif_body",  body)
            putExtra("notif_data",  data)
        }

        val pi = PendingIntent.getActivity(
            ctx, id.hashCode(), launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notif = NotificationCompat.Builder(ctx, "app_notifications")
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(
                ctx.applicationInfo.icon.takeIf { it != 0 }
                    ?: android.R.drawable.ic_dialog_info
            )
            .setAutoCancel(true)
            .setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE)
            as NotificationManager
        nm.notify(id.hashCode(), notif)
    }
}
