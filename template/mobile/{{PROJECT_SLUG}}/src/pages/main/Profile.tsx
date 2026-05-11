import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    ScrollView,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import {
    ChevronRight,
    LogIn,
    LogOut,
    Moon,
    Sun,
    Sparkles
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentLocale } from '../../i18n';
import LanguagePicker from '../../components/LanguagePicker';
import { AppStackParamList } from '../../routes/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;

// Flag per locale — Profile renders the active one inline next to
// the language label so the user can see what's selected without
// opening the picker.
const LOCALE_FLAGS: Record<string, string> = {
    'pt-BR': '🇧🇷',
    en: '🇺🇸'
};

export default function ProfileScreen() {
    const { colors, isDark, toggle } = useTheme();
    const { signed, user, signOut, isPremium } = useAuth();
    const { t } = useTranslation();
    // useTranslation re-renders on locale change so reading directly
    // here always yields the current locale.
    const currentLocale = getCurrentLocale();
    const [languageOpen, setLanguageOpen] = useState<boolean>(false);
    // The Profile screen is a tab inside MainTabs which is itself a
    // child of AppStack. To present the AuthStack modal, walk up to
    // AppStack via getParent().
    const navigation = useNavigation<Nav>();

    function openAuth() {
        navigation.navigate('AuthStack');
    }

    function confirmSignOut() {
        Alert.alert(
            t('common.signOutConfirmTitle'),
            t('common.signOutConfirmBody'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.signOut'),
                    style: 'destructive',
                    onPress: () => {
                        signOut().catch(err => {
                            console.warn(
                                '[profile] signOut error:',
                                err
                            );
                        });
                    }
                }
            ]
        );
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
                    {t('profile.eyebrow')}
                </Text>
                <Text style={[s.title, { color: colors.text }]}>
                    {t('profile.title')}
                </Text>

                {!signed && (
                    <View
                        style={[
                            s.signInCard,
                            {
                                backgroundColor: colors.primary + '12',
                                borderColor: colors.primary + '40'
                            }
                        ]}
                    >
                        <View
                            style={[
                                s.signInBubble,
                                {
                                    backgroundColor:
                                        colors.primary + '25'
                                }
                            ]}
                        >
                            <Sparkles
                                size={18}
                                color={colors.primary}
                            />
                        </View>
                        <Text
                            style={[
                                s.signInTitle,
                                { color: colors.text }
                            ]}
                        >
                            {t('profile.signInCard.title')}
                        </Text>
                        <Text
                            style={[
                                s.signInBody,
                                { color: colors.textSec }
                            ]}
                        >
                            {t('profile.signInCard.body')}
                        </Text>
                        <TouchableOpacity
                            style={[
                                s.signInBtn,
                                { backgroundColor: colors.primary }
                            ]}
                            onPress={openAuth}
                            activeOpacity={0.85}
                        >
                            <LogIn size={16} color="#0B0D0F" />
                            <Text style={s.signInBtnText}>
                                {t('profile.signInCard.cta')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {signed && (
                    <View
                        style={[
                            s.card,
                            {
                                backgroundColor: colors.card,
                                borderColor: colors.border
                            }
                        ]}
                    >
                        <View style={s.row}>
                            <Text
                                style={[
                                    s.label,
                                    { color: colors.textMuted }
                                ]}
                            >
                                {t('profile.nameLabel')}
                            </Text>
                            <Text
                                style={[
                                    s.value,
                                    { color: colors.text }
                                ]}
                            >
                                {user?.display_name ?? user?.name ?? '—'}
                            </Text>
                        </View>
                        <View
                            style={[
                                s.row,
                                s.rowDivider,
                                { borderTopColor: colors.border }
                            ]}
                        >
                            <Text
                                style={[
                                    s.label,
                                    { color: colors.textMuted }
                                ]}
                            >
                                {t('profile.emailLabel')}
                            </Text>
                            <Text
                                style={[
                                    s.value,
                                    { color: colors.text }
                                ]}
                            >
                                {user?.email ?? '—'}
                            </Text>
                        </View>
                        <View
                            style={[
                                s.row,
                                s.rowDivider,
                                { borderTopColor: colors.border }
                            ]}
                        >
                            <Text
                                style={[
                                    s.label,
                                    { color: colors.textMuted }
                                ]}
                            >
                                {t('profile.planLabel')}
                            </Text>
                            <Text
                                style={[
                                    s.value,
                                    {
                                        color: isPremium
                                            ? colors.primary
                                            : colors.text
                                    }
                                ]}
                            >
                                {isPremium
                                    ? t('profile.planPremium')
                                    : t('profile.planFree')}
                            </Text>
                        </View>
                    </View>
                )}

                <TouchableOpacity
                    style={[
                        s.button,
                        {
                            backgroundColor: colors.card,
                            borderColor: colors.border
                        }
                    ]}
                    onPress={toggle}
                    activeOpacity={0.85}
                >
                    {isDark
                        ? <Sun size={18} color={colors.text} />
                        : <Moon size={18} color={colors.text} />
                    }
                    <Text
                        style={[
                            s.buttonText,
                            { color: colors.text }
                        ]}
                    >
                        {isDark
                            ? t('profile.themeLight')
                            : t('profile.themeDark')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        s.button,
                        {
                            backgroundColor: colors.card,
                            borderColor: colors.border
                        }
                    ]}
                    onPress={() => setLanguageOpen(true)}
                    activeOpacity={0.85}
                >
                    <Text style={s.flag}>
                        {LOCALE_FLAGS[currentLocale] ?? '🌐'}
                    </Text>
                    <Text
                        style={[
                            s.buttonText,
                            { color: colors.text, flex: 1 }
                        ]}
                    >
                        {t('profile.languageLabel')}
                    </Text>
                    <Text
                        style={[
                            s.buttonValue,
                            { color: colors.textSec }
                        ]}
                    >
                        {currentLocale === 'pt-BR'
                            ? t('profile.languagePt')
                            : t('profile.languageEn')}
                    </Text>
                    <ChevronRight
                        size={16}
                        color={colors.textMuted}
                    />
                </TouchableOpacity>

                {signed && (
                    <TouchableOpacity
                        style={[
                            s.button,
                            {
                                backgroundColor: colors.card,
                                borderColor: colors.border
                            }
                        ]}
                        onPress={confirmSignOut}
                        activeOpacity={0.85}
                    >
                        <LogOut size={18} color="#F87171" />
                        <Text
                            style={[
                                s.buttonText,
                                { color: '#F87171' }
                            ]}
                        >
                            {t('profile.signOut')}
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            <LanguagePicker
                visible={languageOpen}
                currentLocale={currentLocale}
                onClose={() => setLanguageOpen(false)}
            />
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
        // Same rhythm as Library/Home/Explore: title→content gap is
        // 28px (those screens use `sub` with marginBottom:28; we have
        // no sub, so the spacing lives on the title).
        marginBottom: 28
    },
    signInCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 24,
        gap: 8,
        alignItems: 'flex-start',
        marginBottom: 16
    },
    signInBubble: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    signInTitle: {
        fontSize: 17,
        fontWeight: '600'
    },
    signInBody: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 6
    },
    signInBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 12,
        marginTop: 4
    },
    signInBtnText: {
        color: '#0B0D0F',
        fontSize: 14,
        fontWeight: '700'
    },
    card: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 8,
        marginBottom: 16
    },
    row: {
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    rowDivider: {
        borderTopWidth: StyleSheet.hairlineWidth
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        letterSpacing: 0.3
    },
    value: {
        fontSize: 14,
        fontWeight: '500'
    },
    button: {
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '500'
    },
    buttonValue: {
        fontSize: 14,
        fontWeight: '500'
    },
    flag: {
        fontSize: 22,
        lineHeight: 26
    }
});
