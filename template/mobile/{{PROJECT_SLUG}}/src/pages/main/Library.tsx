import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import PremiumGate from '../../components/PremiumGate';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../routes/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;

/**
 * Mixed free + premium content. The library tab is the canonical
 * place to surface premium features alongside free ones, so users
 * see "what they're missing" without being walled off from the rest
 * of the app.
 */
export default function LibraryScreen() {
    const { colors } = useTheme();
    const { signed, isPremium } = useAuth();
    const { t } = useTranslation();
    const navigation = useNavigation<Nav>();

    function openAuth() {
        navigation.navigate('AuthStack');
    }

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
                    {t('library.eyebrow')}
                </Text>
                <Text style={[s.title, { color: colors.text }]}>
                    {t('library.title')}
                </Text>
                <Text style={[s.sub, { color: colors.textSec }]}>
                    {t('library.sub')}
                </Text>

                <Text
                    style={[
                        s.sectionLabel,
                        { color: colors.textMuted }
                    ]}
                >
                    {t('library.sectionFree')}
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
                        style={[s.cardTitle, { color: colors.text }]}
                    >
                        {t('library.freeCard.title')}
                    </Text>
                    <Text
                        style={[
                            s.cardBody,
                            { color: colors.textSec }
                        ]}
                    >
                        {t('library.freeCard.body')}
                    </Text>
                </View>

                <Text
                    style={[
                        s.sectionLabel,
                        { color: colors.textMuted, marginTop: 24 }
                    ]}
                >
                    <Lock
                        size={11}
                        color={colors.textMuted}
                    />
                    {'  '}{t('library.sectionPremium')}
                </Text>

                <PremiumGate
                    headline={t('library.gateHeadline')}
                    description={signed
                        ? t('library.gateDescriptionSigned')
                        : t('library.gateDescriptionAnonymous')}
                    onUpgrade={openAuth}
                >
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
                                s.cardTitle,
                                { color: colors.text }
                            ]}
                        >
                            {t('library.premiumCard.title')}
                        </Text>
                        <Text
                            style={[
                                s.cardBody,
                                { color: colors.textSec }
                            ]}
                        >
                            {t('library.premiumCard.body')}
                        </Text>
                    </View>
                </PremiumGate>

                {!signed && (
                    <Text
                        style={[
                            s.note,
                            { color: colors.textMuted }
                        ]}
                    >
                        {t('library.anonymousNote')}
                    </Text>
                )}
                {signed && !isPremium && (
                    <Text
                        style={[
                            s.note,
                            { color: colors.textMuted }
                        ]}
                    >
                        {t('library.freeAccountNote')}
                    </Text>
                )}
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
        marginBottom: 28
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 10
    },
    card: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 18,
        gap: 6
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '500'
    },
    cardBody: {
        fontSize: 13,
        lineHeight: 18
    },
    note: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 24,
        textAlign: 'center'
    }
});
