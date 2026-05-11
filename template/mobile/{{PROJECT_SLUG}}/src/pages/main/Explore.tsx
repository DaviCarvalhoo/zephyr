import { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    ScrollView,
    TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

const ACCENTS = ['#6EE7B7', '#60A5FA', '#8B5CF6'];

export default function ExploreScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();

    // Cards from i18n; accent colors stay constant across locales so
    // the visual identity doesn't shift. returnObjects gets the array
    // as JS instead of a stringified blob.
    const cards = useMemo(() => {
        const list = t('explore.cards', { returnObjects: true }) as
            unknown as Array<{ title: string; body: string }>;
        return list.map((c, i) => ({
            ...c,
            accent: ACCENTS[i % ACCENTS.length]
        }));
    }, [t]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <StatusBar
                barStyle={colors.statusBar}
                backgroundColor={colors.bg}
            />
            <ScrollView contentContainerStyle={s.content}>
                <Text
                    style={[s.eyebrow, { color: colors.textMuted }]}
                >
                    {t('explore.eyebrow')}
                </Text>
                <Text style={[s.title, { color: colors.text }]}>
                    {t('explore.title')}
                </Text>
                <Text style={[s.sub, { color: colors.textSec }]}>
                    {t('explore.sub')}
                </Text>

                <View style={s.grid}>
                    {cards.map(c => (
                        <TouchableOpacity
                            key={c.title}
                            style={[
                                s.card,
                                {
                                    backgroundColor: colors.card,
                                    borderColor: colors.border
                                }
                            ]}
                            activeOpacity={0.85}
                        >
                            <View
                                style={[
                                    s.dot,
                                    { backgroundColor: c.accent }
                                ]}
                            />
                            <Text
                                style={[
                                    s.cardTitle,
                                    { color: colors.text }
                                ]}
                            >
                                {c.title}
                            </Text>
                            <Text
                                style={[
                                    s.cardBody,
                                    { color: colors.textSec }
                                ]}
                            >
                                {c.body}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    content: {
        paddingHorizontal: 28,
        paddingTop: 24,
        paddingBottom: 48
    },
    eyebrow: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 12
    },
    title: {
        fontSize: 32,
        fontWeight: '300',
        marginBottom: 8
    },
    sub: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 32
    },
    grid: { gap: 12 },
    card: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 20,
        gap: 8
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginBottom: 4
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '500'
    },
    cardBody: {
        fontSize: 14,
        lineHeight: 20
    }
});
