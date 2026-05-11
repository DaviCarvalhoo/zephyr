import { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { OnboardingStackParamList } from '../../routes/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

// Three pillars — labels resolved via i18n, accent colors stay
// constant so the visual identity doesn't shift across locales.
const PILLAR_KEYS = [
    { key: 'discover' as const, accent: '#6EE7B7' },
    { key: 'decide'   as const, accent: '#60A5FA' },
    { key: 'advance'  as const, accent: '#8B5CF6' }
];

export default function WelcomeScreen({ navigation }: Props) {
    const { colors } = useTheme();
    const { t } = useTranslation();

    const fade  = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, {
                toValue: 1, duration: 900, delay: 200,
                useNativeDriver: true
            }),
            Animated.timing(slide, {
                toValue: 0, duration: 700, delay: 200,
                useNativeDriver: true
            })
        ]).start();
    }, []);

    return (
        <SafeAreaView
            style={[s.safe, { backgroundColor: colors.bg }]}
        >
            <StatusBar
                barStyle={colors.statusBar}
                backgroundColor={colors.bg}
            />

            <Animated.View
                style={[
                    s.content,
                    {
                        opacity: fade,
                        transform: [{ translateY: slide }]
                    }
                ]}
            >
                <View style={s.markArea}>
                    <View
                        style={[
                            s.ring,
                            {
                                borderColor: colors.primary + '35',
                                shadowColor: colors.primary
                            }
                        ]}
                    >
                        <Text
                            style={[s.dot, { color: colors.primary }]}
                        >
                            ●
                        </Text>
                    </View>
                    <Text
                        style={[
                            s.wordmark,
                            { color: colors.textMuted }
                        ]}
                    >
                        {t('onboarding.welcome.wordmark')}
                    </Text>
                </View>

                <View style={s.copy}>
                    <Text
                        style={[s.headline, { color: colors.text }]}
                    >
                        {t('onboarding.welcome.title')}
                    </Text>
                    <Text style={[s.body, { color: colors.textSec }]}>
                        {t('onboarding.welcome.subtitle')}
                    </Text>
                </View>

                <View style={s.pillars}>
                    {PILLAR_KEYS.map(p => (
                        <View key={p.key} style={s.pillarRow}>
                            <View
                                style={[
                                    s.pillarDot,
                                    { backgroundColor: p.accent }
                                ]}
                            />
                            <Text
                                style={[
                                    s.pillarLabel,
                                    { color: p.accent }
                                ]}
                            >
                                {t(`onboarding.welcome.pillars.${p.key}`)}
                            </Text>
                        </View>
                    ))}
                </View>
            </Animated.View>

            <Animated.View style={[s.footer, { opacity: fade }]}>
                <TouchableOpacity
                    style={[
                        s.btn,
                        {
                            backgroundColor: colors.primary,
                            shadowColor: colors.primary
                        }
                    ]}
                    onPress={() => navigation.navigate('Onboarding')}
                    activeOpacity={0.87}
                >
                    <Text style={s.btnText}>
                        {t('onboarding.welcome.cta')}
                    </Text>
                </TouchableOpacity>
                <Text
                    style={[s.hint, { color: colors.textMuted }]}
                >
                    {t('onboarding.welcome.hint')}
                </Text>
            </Animated.View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1 },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 36
    },
    markArea: {
        alignItems: 'flex-start',
        marginBottom: 56
    },
    ring: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowOpacity: 0.2,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 0 }
    },
    dot: { fontSize: 26 },
    wordmark: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 7
    },
    copy: { marginBottom: 52 },
    headline: {
        fontSize: 36,
        fontWeight: '300',
        lineHeight: 46,
        marginBottom: 20
    },
    body: {
        fontSize: 15,
        lineHeight: 26
    },
    pillars: { gap: 14 },
    pillarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14
    },
    pillarDot: {
        width: 6,
        height: 6,
        borderRadius: 3
    },
    pillarLabel: {
        fontSize: 16,
        fontWeight: '300',
        letterSpacing: 0.5
    },
    footer: {
        paddingHorizontal: 32,
        paddingBottom: 52,
        gap: 14,
        alignItems: 'center'
    },
    btn: {
        width: '100%',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        shadowOpacity: 0.3,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 6 }
    },
    btnText: {
        color: '#0B0D0F',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3
    },
    hint: { fontSize: 12 }
});
