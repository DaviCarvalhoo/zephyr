import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

export default function HomeScreen() {
    const { colors } = useTheme();
    const { user, signed } = useAuth();
    const { t } = useTranslation();

    const name = user?.display_name ?? user?.name ?? user?.email ?? '';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <StatusBar
                barStyle={colors.statusBar}
                backgroundColor={colors.bg}
            />
            <ScrollView
                contentContainerStyle={s.content}
                showsVerticalScrollIndicator={false}
            >
                <Text
                    style={[s.eyebrow, { color: colors.textMuted }]}
                >
                    {t('home.eyebrow')}
                </Text>
                <Text style={[s.title, { color: colors.text }]}>
                    {signed
                        ? t('home.greetingSigned', { name })
                        : t('home.greetingAnonymous')}
                </Text>
                <Text style={[s.sub, { color: colors.textSec }]}>
                    {t('home.body')}
                    <Text
                        style={{
                            fontFamily: 'Menlo',
                            color: colors.text
                        }}
                    >
                        src/pages/main/Home.tsx
                    </Text>
                    {!signed && t('home.bodyAnonymousSuffix')}
                </Text>

                <View
                    style={[
                        s.card,
                        {
                            backgroundColor: colors.card,
                            borderColor: colors.border
                        }
                    ]}
                >
                    <Text
                        style={[
                            s.cardLabel,
                            { color: colors.textMuted }
                        ]}
                    >
                        {t('home.cardLabel')}
                    </Text>
                    <Text
                        style={[s.cardTitle, { color: colors.text }]}
                    >
                        {t('home.cardTitle')}
                    </Text>
                    <Text
                        style={[s.cardBody, { color: colors.textSec }]}
                    >
                        {t('home.cardBody')}
                    </Text>
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
    card: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 20,
        gap: 8
    },
    cardLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '500'
    },
    cardBody: {
        fontSize: 14,
        lineHeight: 20
    }
});
