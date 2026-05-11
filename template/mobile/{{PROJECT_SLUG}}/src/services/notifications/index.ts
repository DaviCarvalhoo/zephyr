/**
 * Local notifications — JS surface over the custom native modules
 * (`native/ios/AppNotifications*` and `native/android/AppNotifications*`).
 *
 * Why custom-native rather than expo-notifications?
 *   - Cold-start tap dispatch: when the user taps a notification while
 *     the app is killed, expo-notifications surfaces the tap only AFTER
 *     JS has fully booted, which can be too late if your UX wants to
 *     react instantly. Our native modules write the tap into
 *     UserDefaults / SharedPreferences from the platform's *first*
 *     callback (AppDelegate / MainActivity onCreate), and JS calls
 *     `consumePendingNotification()` the moment it's ready.
 *   - Action buttons: native APIs (`UNNotificationAction` /
 *     `Notification.Action`) get you per-button intents. Action taps
 *     are delivered without launching the app, which is what you want
 *     for "quick reply"-style flows.
 *
 * If you don't need either of those, you can replace this whole layer
 * with `expo-notifications` and delete `native/ios/AppNotifications*`
 * + `native/android/AppNotifications*`.
 */

import { NativeModules, Platform } from 'react-native';

interface NativeNotificationsModule {
    requestPermission: () => Promise<'granted' | 'denied' | 'undetermined'>;
    getStatus: () => Promise<'granted' | 'denied' | 'undetermined'>;
    schedule: (args: {
        id: string;
        title: string;
        body: string;
        fireAt: number;
        data?: Record<string, string>;
    }) => Promise<unknown>;
    cancel: (id: string) => Promise<unknown>;
    cancelAll: () => Promise<unknown>;
    consumePending: () => Promise<{
        title: string;
        body: string;
        data: Record<string, string>;
    } | null>;
}

const Native = NativeModules.AppNotifications as
    NativeNotificationsModule | undefined;

function isAvailable(): boolean {
    return !!Native;
}

export async function requestNotificationPermission(): Promise<
    'granted' | 'denied' | 'undetermined'
> {
    if (!isAvailable()) {
        return 'undetermined';
    }
    return Native!.requestPermission();
}

export async function getNotificationStatus(): Promise<
    'granted' | 'denied' | 'undetermined'
> {
    if (!isAvailable()) {
        return 'undetermined';
    }
    return Native!.getStatus();
}

export interface ScheduledNotification {
    /** Stable ID — re-using an ID replaces the existing schedule. */
    id: string;
    title: string;
    body: string;
    /** Fire time as a JS timestamp (ms since epoch). */
    fireAt: number;
    /** Optional payload delivered to the tap handler. */
    data?: Record<string, string>;
}

export async function scheduleNotification(
    n: ScheduledNotification
): Promise<void> {
    if (!isAvailable()) {
        return;
    }
    await Native!.schedule(n);
}

export async function cancelNotification(id: string): Promise<void> {
    if (!isAvailable()) {
        return;
    }
    await Native!.cancel(id);
}

export async function cancelAllNotifications(): Promise<void> {
    if (!isAvailable()) {
        return;
    }
    await Native!.cancelAll();
}

/**
 * Read + delete the most recently tapped notification, if any.
 *
 * Call from:
 *   - App.tsx cold-start (after initDb)
 *   - AppState 'active' transition (foreground after a tap)
 *   - iOS Linking handler for `<scheme>://notif`
 *   - Android DeviceEventEmitter for 'appNotificationTapped'
 *
 * Returns null if no tap is pending — that's the steady state.
 */
export async function consumePendingNotification(): Promise<{
    title: string;
    body: string;
    data: Record<string, string>;
} | null> {
    if (!isAvailable()) {
        return null;
    }
    return Native!.consumePending();
}

export const NotificationsAvailable = Platform.select({
    ios: true,
    android: true,
    default: false
});
