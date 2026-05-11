const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Health Connect on Android — adds the right manifest entries:
 *
 *   - `<uses-permission>` for each requested data type.
 *   - `<queries>` so the app can detect whether the Health Connect
 *     app is installed (pre-installed on Android 14+).
 *   - `<intent>` for the permissions-rationale action so users can
 *     review what the app is asking for.
 *
 * Pass an array of permission names (without the `android.permission.health.`
 * prefix). Edit `app.json` plugins entry like:
 *
 *   "plugins": [
 *     ["./plugins/withAndroidHealthConnect", {
 *       "permissions": ["READ_STEPS", "WRITE_EXERCISE"]
 *     }]
 *   ]
 *
 * Health Connect requires Android 9 (API 28)+. Combined with
 * minSdkVersion 26 in expo-build-properties, the app still installs
 * on older devices but health features no-op there.
 */
module.exports = function withAndroidHealthConnect(config, props) {
    const requestedPermissions = (props?.permissions ?? []).map(
        p => `android.permission.health.${p}`
    );

    return withAndroidManifest(config, (config) => {
        const manifest = config.modResults.manifest;

        if (!manifest['uses-permission']) {
            manifest['uses-permission'] = [];
        }
        const perms = manifest['uses-permission'];
        for (const perm of requestedPermissions) {
            const exists = perms.find(p =>
                p.$?.['android:name'] === perm
            );
            if (!exists) {
                perms.push({ $: { 'android:name': perm } });
            }
        }

        if (!manifest['queries']) {
            manifest['queries'] = [{}];
        }
        const q = manifest['queries'][0];

        if (!q['package']) {
            q['package'] = [];
        }
        const HEALTHDATA_PKG = 'com.google.android.apps.healthdata';
        if (!q['package'].find(p =>
            p.$?.['android:name'] === HEALTHDATA_PKG
        )) {
            q['package'].push({
                $: { 'android:name': HEALTHDATA_PKG }
            });
        }

        if (!q['intent']) {
            q['intent'] = [];
        }
        const rationaleAction =
            'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE';
        const hasRationale = q['intent'].find(i =>
            i['action']?.[0]?.['$']?.['android:name'] === rationaleAction
        );
        if (!hasRationale) {
            q['intent'].push({
                action: [{ $: { 'android:name': rationaleAction } }]
            });
        }

        return config;
    });
};
