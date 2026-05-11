import { useMemo, useRef, useState } from 'react';
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

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Onboarding'>;

// Accent colors keyed by option id — kept here so they don't shift
// across locales (text translates, accent identity stays).
const OPTION_ACCENT: Record<string, string> = {
    curious:    '#6EE7B7',
    work:       '#60A5FA',
    learn:      '#8B5CF6',
    other:      '#F59E0B',
    speed:      '#F472B6',
    depth:      '#60A5FA',
    breadth:    '#6EE7B7',
    simplicity: '#F59E0B'
};

interface StepShape {
    eyebrow: string;
    question: string;
    sub: string;
    options: Array<{ id: string; label: string; sub: string }>;
}

export default function OnboardingScreen({ navigation }: Props) {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const [step, setStep] = useState<number>(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [selected, setSelected] = useState<string | null>(null);

    const fade = useRef(new Animated.Value(1)).current;
    const slide = useRef(new Animated.Value(0)).current;

    // returnObjects: true gives us the full subtree as JS instead of
    // a stringified version. Memoized per-language so changing locale
    // rebuilds the steps.
    const STEPS = useMemo(
        () => t('onboarding.questionnaire.steps', {
            returnObjects: true
        }) as unknown as StepShape[],
        [t]
    );

    const current = STEPS[step];

    function animateNext(callback: () => void) {
        Animated.parallel([
            Animated.timing(fade, {
                toValue: 0, duration: 160, useNativeDriver: true
            }),
            Animated.timing(slide, {
                toValue: -20, duration: 160, useNativeDriver: true
            })
        ]).start(() => {
            callback();
            slide.setValue(20);
            Animated.parallel([
                Animated.timing(fade, {
                    toValue: 1, duration: 200, useNativeDriver: true
                }),
                Animated.timing(slide, {
                    toValue: 0, duration: 200, useNativeDriver: true
                })
            ]).start();
        });
    }

    function handleSelect(optionId: string) {
        setSelected(optionId);
        const newAnswers = { ...answers, [step]: optionId };

        // Brief delay so the visual selection registers before the
        // transition kicks in.
        setTimeout(() => {
            if (step < STEPS.length - 1) {
                animateNext(() => {
                    setAnswers(newAnswers);
                    setStep(step + 1);
                    setSelected(null);
                });
                return;
            }
            // Done — pass the answers along to FirstAction which
            // calls completeOnboarding(). Using replace so the back
            // gesture from FirstAction can't re-enter the questions.
            setAnswers(newAnswers);
            navigation.replace('FirstAction');
        }, 220);
    }

    function skip() {
        navigation.replace('FirstAction');
    }

    return (
        <SafeAreaView
            style={[s.safe, { backgroundColor: colors.bg }]}
        >
            <StatusBar
                barStyle={colors.statusBar}
                backgroundColor={colors.bg}
            />

            <View style={s.topBar}>
                <View style={s.progressRow}>
                    {STEPS.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                s.bar,
                                {
                                    backgroundColor:
                                        i <= step
                                            ? colors.primary
                                            : colors.border
                                },
                                i === step && {
                                    backgroundColor: colors.primary
                                }
                            ]}
                        />
                    ))}
                </View>
                <TouchableOpacity
                    onPress={skip}
                    style={s.skipBtn}
                    activeOpacity={0.7}
                >
                    <Text
                        style={[s.skipTxt, { color: colors.textMuted }]}
                    >
                        {t('onboarding.questionnaire.skip')}
                    </Text>
                </TouchableOpacity>
            </View>

            <Animated.View
                style={[
                    s.content,
                    {
                        opacity: fade,
                        transform: [{ translateY: slide }]
                    }
                ]}
            >
                <Text
                    style={[s.eyebrow, { color: colors.textMuted }]}
                >
                    {current.eyebrow}
                </Text>
                <Text
                    style={[s.question, { color: colors.text }]}
                >
                    {current.question}
                </Text>
                <Text style={[s.sub, { color: colors.textSec }]}>
                    {current.sub}
                </Text>

                <View style={s.options}>
                    {current.options.map(o => {
                        const isSelected = selected === o.id;
                        const accent =
                            OPTION_ACCENT[o.id] ?? colors.primary;
                        return (
                            <TouchableOpacity
                                key={o.id}
                                style={[
                                    s.option,
                                    {
                                        backgroundColor: colors.card,
                                        borderColor: isSelected
                                            ? accent
                                            : colors.border
                                    }
                                ]}
                                onPress={() => handleSelect(o.id)}
                                activeOpacity={0.85}
                                disabled={!!selected}
                            >
                                <View
                                    style={[
                                        s.optionDot,
                                        { backgroundColor: accent }
                                    ]}
                                />
                                <View style={s.optionText}>
                                    <Text
                                        style={[
                                            s.optionLabel,
                                            { color: colors.text }
                                        ]}
                                    >
                                        {o.label}
                                    </Text>
                                    <Text
                                        style={[
                                            s.optionSub,
                                            { color: colors.textSec }
                                        ]}
                                    >
                                        {o.sub}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1 },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16
    },
    progressRow: {
        flexDirection: 'row',
        gap: 6,
        flex: 1
    },
    bar: {
        flex: 1,
        height: 3,
        borderRadius: 2
    },
    skipBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    skipTxt: {
        fontSize: 13,
        fontWeight: '500'
    },
    content: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 24
    },
    eyebrow: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 12
    },
    question: {
        fontSize: 32,
        fontWeight: '300',
        lineHeight: 40,
        marginBottom: 12
    },
    sub: {
        fontSize: 14,
        marginBottom: 36
    },
    options: { gap: 12 },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 18,
        borderWidth: 1,
        borderRadius: 16
    },
    optionDot: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    optionText: { flex: 1 },
    optionLabel: {
        fontSize: 16,
        fontWeight: '500'
    },
    optionSub: {
        fontSize: 13,
        marginTop: 2
    }
});
