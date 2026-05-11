import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * The center-tab CTA screen. Replace this with the primary action of
 * your product — start a session, create an entry, scan something,
 * etc. Tranqs uses this slot for the "Practice" flow.
 *
 * Free for everyone. Premium gates apply to specific *features* of
 * the action, not the action itself — keep the front door open so
 * users get value before they pay.
 */
export default function ActionScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <StatusBar
                barStyle={colors.statusBar}
                backgroundColor={colors.bg}
            />
            <View style={s.content}>
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
                    {t('action.title')}
                </Text>
                <Text style={[s.body, { color: colors.textSec }]}>
                    {t('action.body')}
                </Text>

                <TouchableOpacity
                    style={[
                        s.btn,
                        {
                            backgroundColor: colors.primary,
                            shadowColor: colors.primary
                        }
                    ]}
                    activeOpacity={0.87}
                >
                    <Text style={s.btnText}>
                        {t('action.cta')}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
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
        fontSize: 28,
        fontWeight: '300'
    },
    body: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 16
    },
    btn: {
        paddingVertical: 16,
        paddingHorizontal: 36,
        borderRadius: 16,
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
