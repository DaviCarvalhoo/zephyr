
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ACCENTS } from '../theme/colors';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    text1?: string;
    text2?: string;
    type: ToastType;
}

function AppToast({ text1, text2, type }: ToastProps) {
    const { colors } = useTheme();

    let accentColor: string = ACCENTS.blue;
    if (type === 'success') {
        accentColor = colors.primary;
    } else if (type === 'error') {
        accentColor = ACCENTS.red;
    }

    return (
        <View
            style={[
                s.container,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.border
                }
            ]}
        >
            <View style={[s.accent, { backgroundColor: accentColor }]} />
            <View style={s.body}>
                {!!text1 && (
                    <Text
                        style={[s.title, { color: colors.text }]}
                        numberOfLines={1}
                    >
                        {text1}
                    </Text>
                )}
                {!!text2 && (
                    <Text
                        style={[s.message, { color: colors.textSec }]}
                        numberOfLines={2}
                    >
                        {text2}
                    </Text>
                )}
            </View>
        </View>
    );
}

export const toastConfig = {
    success: (props: Omit<ToastProps, 'type'>) => (
        <AppToast {...props} type="success" />
    ),
    error: (props: Omit<ToastProps, 'type'>) => (
        <AppToast {...props} type="error" />
    ),
    info: (props: Omit<ToastProps, 'type'>) => (
        <AppToast {...props} type="info" />
    )
};

const s = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        minHeight: 56,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
        elevation: 8
    },
    accent: { width: 4 },
    body: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 13,
        justifyContent: 'center'
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.1
    },
    message: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 2
    }
});
