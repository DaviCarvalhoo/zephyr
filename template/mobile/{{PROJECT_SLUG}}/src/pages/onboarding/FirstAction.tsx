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
import { Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { OnboardingStackParamList } from '../../routes/types';

type Props = NativeStackScreenProps<
    OnboardingStackParamList,
    'FirstAction'
>;

/**
 * Last screen of the onboarding stack. Shows the user "you're in"
 * and triggers the gate flip.
 *
 * In tranqs this is "First Practice" — a guided first try of the
 * core product loop. Adapt to your product: a first journal entry,
 * a first task, a first import, etc. The pattern is "show me you
 * understand the user's first need" before asking for anything.
 */
export default function FirstActionScreen(_props: Props) {
    const { colors } = useTheme();
    const { completeOnboarding } = useAuth();
    const { t } = useTranslation();

    const fade  = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.92)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, {
                toValue: 1, duration: 600,
                useNativeDriver: true
            }),
            Animated.spring(scale, {
                toValue: 1, friction: 7, tension: 40,
                useNativeDriver: true
            })
        ]).start();
    }, []);

    function handleStart() {
        // Mark onboarding done. Routes flips to AppStack on the next
        // render. We don't navigate manually — Routes does the swap
        // via hasCompletedOnboarding state in AuthContext.
        completeOnboarding({ source: 'first-action' }).catch(err => {
            console.warn(
                '[onboarding] complete error:',
                (err as Error).message
            );
        });
    }

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
                        transform: [{ scale }]
                    }
                ]}
            >
                <View
                    style={[
                        s.bubble,
                        {
                            backgroundColor: colors.primary + '15',
                            borderColor: colors.primary + '40'
                        }
                    ]}
                >
                    <Sparkles size={28} color={colors.primary} />
                </View>

                <Text style={[s.title, { color: colors.text }]}>
                    {t('onboarding.firstAction.title')}
                </Text>
                <Text style={[s.body, { color: colors.textSec }]}>
                    {t('onboarding.firstAction.body')}
                </Text>
            </Animated.View>

            <View style={s.footer}>
                <TouchableOpacity
                    style={[
                        s.btn,
                        {
                            backgroundColor: colors.primary,
                            shadowColor: colors.primary
                        }
                    ]}
                    onPress={handleStart}
                    activeOpacity={0.87}
                >
                    <Text style={s.btnText}>
                        {t('onboarding.firstAction.cta')}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1 },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 36,
        gap: 14
    },
    bubble: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12
    },
    title: {
        fontSize: 32,
        fontWeight: '300'
    },
    body: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center'
    },
    footer: {
        paddingHorizontal: 32,
        paddingBottom: 52
    },
    btn: {
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
    }
});
