import { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Animated,
    Platform,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import Toast from 'react-native-toast-message';
import { Svg, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import config from '../../config';
import { AuthStackParamList } from '../../routes/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'AuthLanding'>;
type ProviderId = 'google' | 'apple' | null;

export default function AuthLandingScreen({ navigation }: Props) {
    const { continueWithToken, signInWithApple } = useAuth();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const [provider, setProvider] = useState<ProviderId>(null);
    const [error, setError]       = useState<string>('');
    const [appleAvailable, setAppleAvailable] = useState<boolean>(false);

    const fade  = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(28)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, {
                toValue: 1, duration: 480, delay: 80,
                useNativeDriver: true
            }),
            Animated.timing(slide, {
                toValue: 0, duration: 400, delay: 80,
                useNativeDriver: true
            })
        ]).start();

        if (Platform.OS === 'ios') {
            AppleAuthentication.isAvailableAsync()
                .then(setAppleAvailable)
                .catch(() => setAppleAvailable(false));
        }
    }, []);

    function showError(msg: string) {
        setError(msg);
        Toast.show({
            type: 'error',
            text1: t('auth.landing.signInFailed'),
            text2: msg,
            position: 'top'
        });
    }

    async function handleGoogle() {
        if (provider) {
            return;
        }
        setError('');
        setProvider('google');
        try {
            // Server-side OAuth: hits the API which redirects to Google,
            // then back to a deep link of the form
            // `<scheme>://auth?token=<JWT>&refreshToken=<RT>`.
            // Using the server side keeps the client_secret out of the app
            // bundle and lets web + iOS + Android share one OAuth client.
            const authUrl = `${config.baseApiUrl}/api/auth/google/app`;
            const result = await WebBrowser.openAuthSessionAsync(
                authUrl,
                `${config.scheme}://`
            );

            if (result.type !== 'success' || !result.url) {
                // type === 'cancel' or 'dismiss' — user closed the browser
                return;
            }

            const tokenMatch = result.url.match(/[?&]token=([^&]+)/);
            const refreshMatch = result.url.match(
                /[?&]refreshToken=([^&]+)/
            );
            const errMatch = result.url.match(/[?&]error=([^&]+)/);

            if (!tokenMatch) {
                showError(
                    errMatch
                        ? decodeURIComponent(errMatch[1])
                        : t('auth.landing.errors.tokenMissing')
                );
                return;
            }

            const jwt = decodeURIComponent(tokenMatch[1]);
            const rt = refreshMatch
                ? decodeURIComponent(refreshMatch[1])
                : null;
            const r = await continueWithToken(jwt, rt);
            if (!r.success) {
                showError(r.error);
                return;
            }
            Toast.show({
                type: 'success',
                text1: t('auth.landing.success'),
                position: 'top',
                visibilityTime: 2000
            });
            // Dismiss the AuthStack modal back to MainTabs.
            navigation.getParent()?.goBack();
        } catch (err) {
            console.warn('[auth] google error:', err);
            showError(t('auth.landing.errors.googleStart'));
        } finally {
            setProvider(null);
        }
    }

    async function handleApple() {
        if (provider) {
            return;
        }
        setError('');
        setProvider('apple');
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL
                ]
            });

            if (!credential.identityToken) {
                showError(t('auth.landing.errors.appleNoToken'));
                return;
            }

            const r = await signInWithApple({
                id_token: credential.identityToken,
                firstName: credential.fullName?.givenName ?? null,
                lastName: credential.fullName?.familyName ?? null
            });

            if (!r.success) {
                showError(r.error);
                return;
            }
            Toast.show({
                type: 'success',
                text1: t('auth.landing.success'),
                position: 'top',
                visibilityTime: 2000
            });
            // Dismiss the AuthStack modal back to MainTabs.
            navigation.getParent()?.goBack();
        } catch (err) {
            // ERR_CANCELED = user dismissed the sheet — silent
            const code = (err as { code?: string }).code;
            if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') {
                return;
            }
            console.warn('[auth] apple error:', err);
            showError(t('auth.landing.errors.appleGeneric'));
        } finally {
            setProvider(null);
        }
    }

    const busy = !!provider;

    function dismiss() {
        // Pop the whole AuthStack modal back to wherever it was opened
        // from. Works whether the user is in MainTabs or any nested
        // screen.
        const parent = navigation.getParent();
        if (parent) {
            parent.goBack();
            return;
        }
        navigation.goBack();
    }

    return (
        <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}>
            <StatusBar
                barStyle={colors.statusBar}
                backgroundColor={colors.bg}
            />

            <TouchableOpacity
                style={[
                    s.closeBtn,
                    {
                        backgroundColor: colors.card,
                        borderColor: colors.border
                    }
                ]}
                onPress={dismiss}
                activeOpacity={0.7}
                disabled={busy}
            >
                <Text style={[s.closeX, { color: colors.textMuted }]}>
                    ✕
                </Text>
            </TouchableOpacity>

            <Animated.View
                style={[
                    s.content,
                    {
                        opacity: fade,
                        transform: [{ translateY: slide }]
                    }
                ]}
            >
                <View style={s.mark}>
                    <View
                        style={[
                            s.ring,
                            { borderColor: colors.primary + '30' }
                        ]}
                    >
                        <Text style={[s.dot, { color: colors.primary }]}>
                            ●
                        </Text>
                    </View>
                    <Text
                        style={[s.wordmark, { color: colors.textMuted }]}
                    >
                        {t('auth.landing.wordmark')}
                    </Text>
                </View>
                <Text style={[s.headline, { color: colors.text }]}>
                    {t('auth.landing.title')}
                </Text>
                <Text style={[s.sub, { color: colors.textSec }]}>
                    {t('auth.landing.subtitle')}
                </Text>
            </Animated.View>

            <Animated.View style={[s.footer, { opacity: fade }]}>
                {!!error && (
                    <View style={s.errorBox}>
                        <Text style={s.errorTxt}>{error}</Text>
                    </View>
                )}

                {Platform.OS === 'ios' && appleAvailable && (
                    <TouchableOpacity
                        style={[
                            s.appleBtn,
                            busy && s.btnDisabled
                        ]}
                        onPress={handleApple}
                        activeOpacity={0.88}
                        disabled={busy}
                    >
                        {provider === 'apple' ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <AppleIcon />
                                <Text style={s.appleTxt}>
                                    {t('auth.landing.apple')}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[
                        s.googleBtn,
                        {
                            backgroundColor: colors.card,
                            borderColor: colors.border
                        },
                        busy && s.btnDisabled
                    ]}
                    onPress={handleGoogle}
                    activeOpacity={0.88}
                    disabled={busy}
                >
                    {provider === 'google' ? (
                        <ActivityIndicator color={colors.text} />
                    ) : (
                        <>
                            <GoogleIcon />
                            <Text
                                style={[
                                    s.googleTxt,
                                    { color: colors.text }
                                ]}
                            >
                                {t('auth.landing.google')}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={s.divRow}>
                    <View
                        style={[
                            s.divLine,
                            { backgroundColor: colors.border }
                        ]}
                    />
                    <Text
                        style={[
                            s.divLabel,
                            { color: colors.textMuted }
                        ]}
                    >
                        {t('auth.landing.divider')}
                    </Text>
                    <View
                        style={[
                            s.divLine,
                            { backgroundColor: colors.border }
                        ]}
                    />
                </View>

                <TouchableOpacity
                    style={[
                        s.emailBtn,
                        {
                            backgroundColor: colors.primary + '12',
                            borderColor: colors.primary + '30'
                        },
                        busy && s.btnDisabled
                    ]}
                    onPress={() => navigation.navigate('Signup')}
                    activeOpacity={0.82}
                    disabled={busy}
                >
                    <Text
                        style={[s.emailTxt, { color: colors.primary }]}
                    >
                        {t('auth.landing.createWithEmail')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={s.loginLink}
                    onPress={() => navigation.navigate('Login')}
                    activeOpacity={0.75}
                    disabled={busy}
                >
                    <Text
                        style={[s.loginTxt, { color: colors.textSec }]}
                    >
                        {t('auth.landing.loginWithEmail')}
                    </Text>
                </TouchableOpacity>

                <Text style={[s.terms, { color: colors.textMuted }]}>
                    {t('auth.landing.terms')}
                </Text>
            </Animated.View>
        </SafeAreaView>
    );
}

function AppleIcon() {
    return (
        <Svg width={18} height={22} viewBox="0 0 814 1000">
            <Path
                d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.5-57.2-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.5 135.4-317.1 269-317.1 71 0 130.5 46.4 174.9 46.4 42.7 0 109.2-49.1 189.4-49.1 30.8 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"
                fill="#fff"
            />
        </Svg>
    );
}

function GoogleIcon() {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <Path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <Path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
            />
            <Path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </Svg>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1 },
    closeBtn: {
        position: 'absolute',
        top: 56,
        right: 24,
        zIndex: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    closeX: {
        fontSize: 13,
        fontWeight: '600'
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 36
    },
    mark: { marginBottom: 40 },
    ring: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14
    },
    dot: { fontSize: 22 },
    wordmark: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 7
    },
    headline: {
        fontSize: 36,
        fontWeight: '300',
        lineHeight: 46,
        marginBottom: 14
    },
    sub: { fontSize: 14, lineHeight: 22 },

    footer: {
        paddingHorizontal: 28,
        paddingBottom: 44,
        gap: 10
    },
    errorBox: {
        backgroundColor: 'rgba(248,113,113,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(248,113,113,0.3)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10
    },
    errorTxt: {
        color: '#F87171',
        fontSize: 13,
        textAlign: 'center'
    },
    appleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderRadius: 16,
        height: 56,
        backgroundColor: '#000'
    },
    appleTxt: {
        fontSize: 16,
        fontWeight: '500',
        color: '#fff'
    },
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderRadius: 16,
        borderWidth: 1,
        height: 56
    },
    googleTxt: {
        fontSize: 16,
        fontWeight: '500'
    },
    divRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 2
    },
    divLine: { flex: 1, height: 1 },
    divLabel: { fontSize: 12, fontWeight: '500' },
    emailBtn: {
        borderRadius: 16,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1
    },
    emailTxt: { fontSize: 15, fontWeight: '600' },
    loginLink: {
        alignItems: 'center',
        paddingVertical: 8
    },
    loginTxt: { fontSize: 14 },
    terms: {
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 17,
        marginTop: 2
    },
    btnDisabled: { opacity: 0.5 }
});
