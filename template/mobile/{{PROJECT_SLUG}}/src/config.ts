import Constants from 'expo-constants';
import { Platform } from 'react-native';

const LOCAL_PORT = {{API_PORT}};

// Force local server even in production builds (toggle for dev-on-device).
const FORCE_LOCAL = false;

const isExpoGo = Constants.appOwnership === 'expo';
const isPhysicalDevice = Constants.isDevice === true;

// Constants.expoConfig.hostUri gives "192.168.x.x:8081" when running via Expo
// Go on a physical device. Replace Metro's port with our API port so the
// device can reach the dev machine on the LAN.
function getLocalApiUrl(): string {
    const hostUri = Constants.expoConfig?.hostUri
        ?? (Constants as unknown as { manifest?: { debuggerHost?: string } })
            .manifest?.debuggerHost;
    if (hostUri) {
        const ip = hostUri.split(':')[0];
        return `http://${ip}:${LOCAL_PORT}`;
    }
    // Android emulator / iOS simulator fallbacks
    return Platform.OS === 'android'
        ? `http://10.0.2.2:${LOCAL_PORT}`
        : `http://localhost:${LOCAL_PORT}`;
}

const isProdBuild = !FORCE_LOCAL && !__DEV__;
const baseApiUrl = isProdBuild
    ? 'https://api.{{DOMAIN}}'
    : getLocalApiUrl();

const APP_VERSION = '0.1.0';

// Google OAuth client IDs.
// Create at: console.cloud.google.com → Credentials → OAuth 2.0
//   Web client    → used as the audience in the server-side flow
//   iOS client    → bundle identifier must match {{IOS_BUNDLE_ID}}
// Both are public values (safe to ship in the app bundle).
const GOOGLE_CLIENT_ID = 'TODO_GOOGLE_WEB_CLIENT_ID';
const GOOGLE_IOS_CLIENT_ID = 'TODO_GOOGLE_IOS_CLIENT_ID';

if (__DEV__) {
    console.log(
        `[config] API: ${baseApiUrl} | prod=${isProdBuild} `
        + `| expoGo=${isExpoGo} | physical=${isPhysicalDevice}`
    );
}

export default {
    isProd: isProdBuild,
    baseApiUrl,
    isExpoGo,
    isPhysicalDevice,
    version: APP_VERSION,
    googleClientId: GOOGLE_CLIENT_ID,
    googleIosClientId: GOOGLE_IOS_CLIENT_ID,
    scheme: '{{MOBILE_SCHEME}}'
};
