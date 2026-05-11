import { useCallback, useEffect, useRef } from 'react';
import {
    NavigationContainer,
    DefaultTheme,
    DarkTheme
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
    ActivityIndicator,
    AppState,
    StyleSheet,
    View,
    StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Home,
    Compass,
    BookOpen,
    User,
    Sparkles
} from 'lucide-react-native';

import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { backupToCloud } from '../services/backup';
import {
    AuthStackParamList,
    AppStackParamList,
    MainTabsParamList,
    OnboardingStackParamList
} from './types';

import WelcomeScreen from '../pages/onboarding/Welcome';
import OnboardingScreen from '../pages/onboarding/Onboarding';
import FirstActionScreen from '../pages/onboarding/FirstAction';

import AuthLandingScreen from '../pages/auth/AuthLanding';
import LoginScreen from '../pages/auth/Login';
import SignupScreen from '../pages/auth/Signup';
import ForgotPasswordScreen from '../pages/auth/ForgotPassword';

import HomeScreen from '../pages/main/Home';
import ExploreScreen from '../pages/main/Explore';
import ActionScreen from '../pages/main/Action';
import LibraryScreen from '../pages/main/Library';
import ProfileScreen from '../pages/main/Profile';

const OnboardingNav = createNativeStackNavigator<OnboardingStackParamList>();
const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const AppStackNav  = createNativeStackNavigator<AppStackParamList>();
const TabsNav      = createBottomTabNavigator<MainTabsParamList>();

// ── Stacks ────────────────────────────────────────────────────────────

function OnboardingStack() {
    return (
        <OnboardingNav.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right'
            }}
        >
            <OnboardingNav.Screen
                name="Welcome"
                component={WelcomeScreen}
                options={{ animation: 'fade' }}
            />
            <OnboardingNav.Screen
                name="Onboarding"
                component={OnboardingScreen}
            />
            <OnboardingNav.Screen
                name="FirstAction"
                component={FirstActionScreen}
                options={{ animation: 'fade' }}
            />
        </OnboardingNav.Navigator>
    );
}

function AuthStack() {
    return (
        <AuthStackNav.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right'
            }}
        >
            <AuthStackNav.Screen
                name="AuthLanding"
                component={AuthLandingScreen}
                options={{ animation: 'fade' }}
            />
            <AuthStackNav.Screen
                name="Login"
                component={LoginScreen}
            />
            <AuthStackNav.Screen
                name="Signup"
                component={SignupScreen}
            />
            <AuthStackNav.Screen
                name="ForgotPassword"
                component={ForgotPasswordScreen}
            />
        </AuthStackNav.Navigator>
    );
}

// Center tab — overlapping CTA button. Sticks above the tab bar
// because that's the canonical product-app pattern for "primary
// action" (Tranqs, Strava, Instagram, etc.). Lift via negative top
// + a soft shadow tinted with the primary color.
function CenterButton() {
    const { colors } = useTheme();
    return (
        <View
            style={[
                tabStyles.centerBtn,
                {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary
                }
            ]}
        >
            <Sparkles size={22} color="#0B0D0F" strokeWidth={1.8} />
        </View>
    );
}

function TabIcon({
    Icon,
    focused,
    color
}: {
    Icon: typeof Home;
    focused: boolean;
    color: string;
}) {
    return (
        <Icon
            size={22}
            color={color}
            strokeWidth={focused ? 2 : 1.6}
            opacity={focused ? 1 : 0.55}
        />
    );
}

function MainTabs() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t } = useTranslation();

    const tabBarHeight = 64 + Math.max(insets.bottom, 8);

    return (
        <TabsNav.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarShowLabel: true,
                tabBarStyle: {
                    backgroundColor: colors.tabBg,
                    borderTopWidth: 0.5,
                    borderTopColor: colors.tabBorder,
                    paddingBottom: Math.max(insets.bottom, 6),
                    paddingTop: 8,
                    height: tabBarHeight
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    letterSpacing: 0.3,
                    marginTop: 0
                }
            }}
        >
            <TabsNav.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    title: t('tabs.home'),
                    tabBarIcon: props => (
                        <TabIcon Icon={Home} {...props} />
                    )
                }}
            />
            <TabsNav.Screen
                name="Explore"
                component={ExploreScreen}
                options={{
                    title: t('tabs.explore'),
                    tabBarIcon: props => (
                        <TabIcon Icon={Compass} {...props} />
                    )
                }}
            />
            <TabsNav.Screen
                name="Action"
                component={ActionScreen}
                options={{
                    title: '',
                    tabBarLabel: () => null,
                    tabBarIcon: () => <CenterButton />
                }}
            />
            <TabsNav.Screen
                name="Library"
                component={LibraryScreen}
                options={{
                    title: t('tabs.library'),
                    tabBarIcon: props => (
                        <TabIcon Icon={BookOpen} {...props} />
                    )
                }}
            />
            <TabsNav.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    title: t('tabs.profile'),
                    tabBarIcon: props => (
                        <TabIcon Icon={User} {...props} />
                    )
                }}
            />
        </TabsNav.Navigator>
    );
}

const tabStyles = StyleSheet.create({
    centerBtn: {
        position: 'absolute',
        top: -22,
        width: 58,
        height: 58,
        borderRadius: 29,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 18,
        elevation: 14
    }
});

// AppStack hosts the tab navigator and the AuthStack as a modal.
// `navigation.navigate('AuthStack')` from anywhere inside MainTabs
// presents the auth flow without unmounting the tab tree.
function AppStack() {
    const { colors } = useTheme();
    return (
        <AppStackNav.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg }
            }}
        >
            <AppStackNav.Screen
                name="MainTabs"
                component={MainTabs}
            />
            <AppStackNav.Screen
                name="AuthStack"
                component={AuthStack}
                options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom'
                }}
            />
        </AppStackNav.Navigator>
    );
}

// ── Cross-cutting concerns ────────────────────────────────────────────

// Re-check premium status on every foreground transition — catches
// cancellations the user did externally (App Store / Play Store /
// settings). Apple and Google never push us a webhook so we poll.
function PremiumStatusRefresher() {
    const { refreshPremiumStatus, signed } = useAuth();
    const ref = useRef(refreshPremiumStatus);
    ref.current = refreshPremiumStatus;

    useEffect(() => {
        if (!signed) {
            return;
        }
        const sub = AppState.addEventListener('change', state => {
            if (state === 'active') {
                ref.current().catch(() => { /* swallow — silent */ });
            }
        });
        return () => sub.remove();
    }, [signed]);

    return null;
}

// Premium-gated cloud backup. Runs silently on cold-start and on every
// foreground return. Throttled to once per hour. Errors are swallowed
// — backup is best-effort and must never block the UI.
const AUTO_BACKUP_INTERVAL_MS = 60 * 60 * 1000;
let _lastAutoBackupAt = 0;

function useAutoBackup() {
    const { signed, user, ensureFreshToken } = useAuth();
    const isPremium = !!user?.is_premium;

    const tryBackup = useCallback(async () => {
        if (!signed || !isPremium) {
            return;
        }
        const now = Date.now();
        if (now - _lastAutoBackupAt < AUTO_BACKUP_INTERVAL_MS) {
            return;
        }
        _lastAutoBackupAt = now;
        try {
            const t = await ensureFreshToken();
            if (t) {
                await backupToCloud(t);
            }
        } catch (err) {
            console.warn(
                '[auto-backup] error:',
                (err as Error).message
            );
        }
    }, [signed, isPremium, ensureFreshToken]);

    useEffect(() => { tryBackup(); }, [tryBackup]);

    useEffect(() => {
        const sub = AppState.addEventListener('change', state => {
            if (state === 'active') {
                tryBackup();
            }
        });
        return () => sub.remove();
    }, [tryBackup]);
}

// ── Root ──────────────────────────────────────────────────────────────

export default function Routes() {
    const { loading, hasCompletedOnboarding } = useAuth();
    const { colors, isDark, ready } = useTheme();
    useAutoBackup();

    if (loading || !ready) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: colors.bg
                }}
            >
                <ActivityIndicator
                    size="small"
                    color={colors.primary}
                />
            </View>
        );
    }

    const navTheme = isDark
        ? {
            ...DarkTheme,
            colors: {
                ...DarkTheme.colors,
                background: colors.bg,
                card: colors.card,
                primary: colors.primary,
                text: colors.text,
                border: colors.border
            }
        }
        : {
            ...DefaultTheme,
            colors: {
                ...DefaultTheme.colors,
                background: colors.bg,
                card: colors.card,
                primary: colors.primary,
                text: colors.text,
                border: colors.border
            }
        };

    return (
        <>
            <StatusBar
                barStyle={colors.statusBar}
                backgroundColor={colors.bg}
            />
            <NavigationContainer theme={navTheme}>
                {hasCompletedOnboarding ? <AppStack /> : <OnboardingStack />}
            </NavigationContainer>
            <PremiumStatusRefresher />
        </>
    );
}
