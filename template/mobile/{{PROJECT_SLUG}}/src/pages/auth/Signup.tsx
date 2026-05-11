import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    StatusBar,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AuthStackParamList } from '../../routes/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

const MIN_PASSWORD = 6;

export default function SignupScreen({ navigation }: Props) {
    const { signUp } = useAuth();
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const [name,     setName]     = useState<string>('');
    const [email,    setEmail]    = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading,  setLoading]  = useState<boolean>(false);
    const [error,    setError]    = useState<string>('');

    async function handleSignup() {
        if (!name || !email || !password) {
            setError(t('auth.signup.allFieldsRequired'));
            return;
        }
        if (password.length < MIN_PASSWORD) {
            setError(t('auth.signup.passwordTooShort', {
                count: MIN_PASSWORD
            }));
            return;
        }
        setLoading(true);
        setError('');
        const result = await signUp(email, password, name);
        setLoading(false);
        if (!result.success) {
            setError(result.error);
            Toast.show({
                type: 'error',
                text1: t('auth.signup.failedTitle'),
                text2: result.error,
                position: 'top'
            });
            return;
        }
        Toast.show({
            type: 'success',
            text1: t('auth.signup.success'),
            position: 'top',
            visibilityTime: 2000
        });
        navigation.getParent()?.goBack();
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <StatusBar
                barStyle={colors.statusBar}
                backgroundColor={colors.bg}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <TouchableOpacity
                    style={s.back}
                    onPress={() => navigation.goBack()}
                >
                    <ChevronLeft
                        size={20}
                        color={colors.textMuted}
                        strokeWidth={2}
                    />
                </TouchableOpacity>

                <ScrollView
                    contentContainerStyle={s.content}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text
                        style={[s.eyebrow, { color: colors.textMuted }]}
                    >
                        {t('auth.signup.eyebrow')}
                    </Text>
                    <Text style={[s.title, { color: colors.text }]}>
                        {t('auth.signup.title')}
                    </Text>
                    <Text style={[s.sub, { color: colors.textSec }]}>
                        {t('auth.signup.sub')}
                    </Text>

                    <View style={s.form}>
                        <View style={s.field}>
                            <Text
                                style={[
                                    s.label,
                                    { color: colors.textSec }
                                ]}
                            >
                                {t('auth.signup.nameLabel')}
                            </Text>
                            <TextInput
                                style={[
                                    s.input,
                                    {
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                        color: colors.text
                                    }
                                ]}
                                value={name}
                                onChangeText={setName}
                                placeholder={t(
                                    'auth.signup.namePlaceholder'
                                )}
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="words"
                                autoCorrect={false}
                                keyboardAppearance={
                                    isDark ? 'dark' : 'light'
                                }
                            />
                        </View>

                        <View style={s.field}>
                            <Text
                                style={[
                                    s.label,
                                    { color: colors.textSec }
                                ]}
                            >
                                {t('auth.signup.emailLabel')}
                            </Text>
                            <TextInput
                                style={[
                                    s.input,
                                    {
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                        color: colors.text
                                    }
                                ]}
                                value={email}
                                onChangeText={setEmail}
                                placeholder={t(
                                    'auth.signup.emailPlaceholder'
                                )}
                                placeholderTextColor={colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardAppearance={
                                    isDark ? 'dark' : 'light'
                                }
                            />
                        </View>

                        <View style={s.field}>
                            <Text
                                style={[
                                    s.label,
                                    { color: colors.textSec }
                                ]}
                            >
                                {t('auth.signup.passwordLabel')}
                            </Text>
                            <TextInput
                                style={[
                                    s.input,
                                    {
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                        color: colors.text
                                    }
                                ]}
                                value={password}
                                onChangeText={setPassword}
                                placeholder={t(
                                    'auth.signup.passwordPlaceholder',
                                    { count: MIN_PASSWORD }
                                )}
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry
                                keyboardAppearance={
                                    isDark ? 'dark' : 'light'
                                }
                            />
                        </View>

                        {!!error && <Text style={s.error}>{error}</Text>}

                        <TouchableOpacity
                            style={[
                                s.btn,
                                { backgroundColor: colors.primary },
                                loading && s.btnDisabled
                            ]}
                            onPress={handleSignup}
                            activeOpacity={0.85}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color="#0B0D0F" />
                                : (
                                    <Text style={s.btnText}>
                                        {t('auth.signup.cta')}
                                    </Text>
                                )
                            }
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    back: {
        paddingHorizontal: 24,
        paddingTop: 16
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 28,
        paddingTop: 40,
        paddingBottom: 40
    },
    eyebrow: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 12
    },
    title: {
        fontSize: 34,
        fontWeight: '300',
        marginBottom: 8
    },
    sub: {
        fontSize: 15,
        marginBottom: 40
    },
    form: { gap: 20 },
    field: { gap: 8 },
    label: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5
    },
    input: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 18,
        paddingVertical: 16,
        fontSize: 16
    },
    error: {
        fontSize: 13,
        color: '#F87171',
        marginTop: -4
    },
    btn: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8
    },
    btnDisabled: { opacity: 0.6 },
    btnText: {
        color: '#0B0D0F',
        fontSize: 16,
        fontWeight: '700'
    }
});
