import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';

// i18n imported for its side-effect (init must run before any t()
// is evaluated).
import './src/i18n';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import Routes from './src/routes';
import AnimatedSplash from './src/components/AnimatedSplash';
import { toastConfig } from './src/components/ToastConfig';
import { initDb } from './src/services/db';
import { syncAllContent } from './src/services/content';

// Hide the native splash screen so our AnimatedSplash takes over the
// transition. Best-effort — if the call fails (rare), we just continue.
SplashScreen.preventAutoHideAsync().catch(() => { /* best-effort */ });

export default function App() {
    const [splashDone, setSplashDone] = useState<boolean>(false);

    useEffect(() => {
        // Init runs in the background. App rendering doesn't wait on
        // any of this — the splash overlay covers the boot until
        // `splashDone` flips, and screens read from SQLite which
        // serves cached data while the network sync runs.
        SplashScreen.hideAsync().catch(() => { /* best-effort */ });
        (async () => {
            try {
                await initDb();
                syncAllContent().catch(err => {
                    console.warn(
                        '[startup] content sync error:',
                        (err as Error).message
                    );
                });
            } catch (err) {
                console.warn('[startup] init error:', err);
            }
        })();

        // Foreground sync — every time the app comes back to active,
        // probe the version and pull if it changed. Cheap when nothing
        // moved server-side.
        const sub = AppState.addEventListener('change', state => {
            if (state === 'active') {
                syncAllContent().catch(err => {
                    console.warn(
                        '[foreground] content sync error:',
                        (err as Error).message
                    );
                });
            }
        });
        return () => sub.remove();
    }, []);

    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <AuthProvider>
                    <Routes />
                    <Toast config={toastConfig} />
                </AuthProvider>
            </ThemeProvider>

            {!splashDone && (
                <AnimatedSplash onDone={() => setSplashDone(true)} />
            )}
        </SafeAreaProvider>
    );
}
