/**
 * LanguagePicker — modal bottom-sheet for choosing the app language.
 *
 * Why a custom select instead of the OS picker:
 *   - Native pickers don't render emoji flags consistently across
 *     platforms (Android renders flag emoji as letter pairs).
 *   - We want the picker themed with the app's palette and to live
 *     inside the same modal pattern the rest of the app uses
 *     (consistent UX with the AuthStack modal).
 *
 * Locale labels are stored in i18n itself — `profile.languagePt` is
 * "Português (Brasil)" in BOTH locales (the language is presented in
 * its own name, not translated to the user's current language).
 * That's the standard convention and what users expect: an English
 * speaker discovering the picker should see "Português (Brasil)" so
 * they recognize the option without already knowing Portuguese.
 */

import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import {
    setLocale,
    SupportedLocale
} from '../i18n';

interface Option {
    locale: SupportedLocale;
    flag: string;
    labelKey: 'profile.languagePt' | 'profile.languageEn';
}

// Flag emoji + locale code. Order is the order users see — pt-BR
// first because that's the default. Flag emojis render via the OS
// font on iOS; on Android we get a letter pair fallback (BR/US),
// which is why some apps ship SVG flags. Acceptable for a barebones
// template — swap to react-native-svg flags if it bothers you.
const OPTIONS: Option[] = [
    { locale: 'pt-BR', flag: '🇧🇷', labelKey: 'profile.languagePt' },
    { locale: 'en',    flag: '🇺🇸', labelKey: 'profile.languageEn' }
];

interface Props {
    visible: boolean;
    currentLocale: SupportedLocale;
    onClose: () => void;
}

export default function LanguagePicker({
    visible,
    currentLocale,
    onClose
}: Props) {
    const { colors } = useTheme();
    const { t } = useTranslation();

    function pick(locale: SupportedLocale) {
        if (locale !== currentLocale) {
            setLocale(locale).catch(err => {
                console.warn(
                    '[language-picker] setLocale error:',
                    (err as Error).message
                );
            });
        }
        onClose();
    }

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={onClose}
        >
            {/* Backdrop — taps outside the sheet close the picker. */}
            <Pressable style={s.backdrop} onPress={onClose}>
                {/* Stop the press from bubbling so taps inside the
                    sheet don't dismiss it. */}
                <Pressable
                    style={[
                        s.sheet,
                        {
                            backgroundColor: colors.card,
                            borderColor: colors.border
                        }
                    ]}
                    onPress={() => { /* swallow */ }}
                >
                    <View style={s.handle}>
                        <View
                            style={[
                                s.handleBar,
                                { backgroundColor: colors.textMuted }
                            ]}
                        />
                    </View>

                    <Text
                        style={[
                            s.eyebrow,
                            { color: colors.textMuted }
                        ]}
                    >
                        {t('profile.languagePicker.title').toUpperCase()}
                    </Text>
                    <Text
                        style={[s.subtitle, { color: colors.textSec }]}
                    >
                        {t('profile.languagePicker.subtitle')}
                    </Text>

                    <View style={s.optionList}>
                        {OPTIONS.map(opt => {
                            const active = opt.locale === currentLocale;
                            return (
                                <TouchableOpacity
                                    key={opt.locale}
                                    style={[
                                        s.option,
                                        {
                                            backgroundColor: active
                                                ? colors.primary + '15'
                                                : 'transparent',
                                            borderColor: active
                                                ? colors.primary + '40'
                                                : colors.border
                                        }
                                    ]}
                                    onPress={() => pick(opt.locale)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={s.flag}>
                                        {opt.flag}
                                    </Text>
                                    <Text
                                        style={[
                                            s.optionLabel,
                                            { color: colors.text }
                                        ]}
                                    >
                                        {t(opt.labelKey)}
                                    </Text>
                                    {active && (
                                        <Check
                                            size={18}
                                            color={colors.primary}
                                        />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const s = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        paddingHorizontal: 24,
        paddingBottom: 36,
        gap: 4
    },
    handle: {
        alignItems: 'center',
        paddingVertical: 12
    },
    handleBar: {
        width: 36,
        height: 4,
        borderRadius: 2,
        opacity: 0.3
    },
    eyebrow: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginTop: 4
    },
    subtitle: {
        fontSize: 13,
        marginTop: 4,
        marginBottom: 20
    },
    optionList: {
        gap: 10
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderRadius: 14,
        borderWidth: 1
    },
    flag: {
        fontSize: 26,
        lineHeight: 30
    },
    optionLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500'
    }
});
