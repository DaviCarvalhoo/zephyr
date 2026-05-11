import { ReactNode } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet
} from 'react-native';
import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
    children: ReactNode;
    onUpgrade?: () => void;
    headline?: string;
    description?: string;
}

/**
 * Renders `children` if the user is premium; otherwise renders a
 * gentle paywall card with an "Upgrade" CTA. Wrap any premium feature
 * in this — keeps the gating logic out of the feature's own code.
 *
 * Headline / description default to translated strings under
 * `premiumGate.*` so most callers don't need to pass them.
 */
export default function PremiumGate({
    children,
    onUpgrade,
    headline,
    description
}: Props) {
    const { user } = useAuth();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const finalHeadline =
        headline ?? t('premiumGate.defaultHeadline');
    const finalDescription =
        description ?? t('premiumGate.defaultDescription');

    if (user?.is_premium) {
        return <>{children}</>;
    }

    return (
        <View
            style={[
                s.card,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.border
                }
            ]}
        >
            <View
                style={[
                    s.lockBubble,
                    { backgroundColor: colors.primary + '15' }
                ]}
            >
                <Lock size={20} color={colors.primary} />
            </View>
            <Text style={[s.title, { color: colors.text }]}>
                {finalHeadline}
            </Text>
            <Text style={[s.body, { color: colors.textSec }]}>
                {finalDescription}
            </Text>
            {onUpgrade && (
                <TouchableOpacity
                    style={[
                        s.btn,
                        { backgroundColor: colors.primary }
                    ]}
                    onPress={onUpgrade}
                    activeOpacity={0.85}
                >
                    <Text style={s.btnText}>
                        {t('premiumGate.cta')}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 24,
        gap: 12,
        alignItems: 'center'
    },
    lockBubble: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center'
    },
    title: {
        fontSize: 18,
        fontWeight: '600'
    },
    body: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center'
    },
    btn: {
        marginTop: 4,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12
    },
    btnText: {
        color: '#0B0D0F',
        fontWeight: '600',
        fontSize: 15
    }
});
