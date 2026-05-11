/**
 * i18n setup. Default language is pt-BR; en is available as a
 * translation. Detection rules:
 *
 *   1. Boot with the device locale (Localization.getLocales()).
 *      pt-* → pt-BR, everything else → en. Synchronous so the first
 *      render uses the right language.
 *   2. After AsyncStorage settles, apply any user-saved override.
 *
 * Persistence is via AsyncStorage so the chosen language survives
 * cold starts. Toggle from the UI via setLocale() — Profile screen
 * has a control wired to it.
 *
 * Type-safe t(): the CustomTypeOptions block at the bottom binds the
 * resources type to ptBR's TranslationShape. Hover t('foo.bar') in
 * an editor to see the resolved keys.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ptBR from './locales/pt-BR';
import en from './locales/en';

export const SUPPORTED_LOCALES = ['pt-BR', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_STORAGE_KEY = '@{{PROJECT_SLUG}}:locale';

function detectDeviceLocale(): SupportedLocale {
    const tag = Localization.getLocales()[0]?.languageTag ?? 'pt-BR';
    if (tag.toLowerCase().startsWith('pt')) {
        return 'pt-BR';
    }
    return 'en';
}

i18n
    .use(initReactI18next)
    .init({
        // v3 avoids Intl.PluralRules which Hermes (React Native) ships
        // a stub of — v4+ would raise at runtime in production builds.
        compatibilityJSON: 'v3',
        resources: {
            'pt-BR': { translation: ptBR },
            en: { translation: en }
        },
        lng: detectDeviceLocale(),
        fallbackLng: 'pt-BR',
        interpolation: { escapeValue: false },
        returnNull: false
    });

// Apply persisted preference asynchronously after init. We don't
// await this at boot — having the wrong language for one frame is
// preferable to delaying first paint.
AsyncStorage.getItem(LOCALE_STORAGE_KEY).then(val => {
    if (val && SUPPORTED_LOCALES.includes(val as SupportedLocale)) {
        i18n.changeLanguage(val).catch(() => {
            // i18next throws on unknown lang codes; swallow because
            // we already validated against SUPPORTED_LOCALES above.
        });
    }
});

export async function setLocale(locale: SupportedLocale): Promise<void> {
    await i18n.changeLanguage(locale);
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function getCurrentLocale(): SupportedLocale {
    const lang = i18n.language;
    if (SUPPORTED_LOCALES.includes(lang as SupportedLocale)) {
        return lang as SupportedLocale;
    }
    return 'pt-BR';
}

export default i18n;

declare module 'i18next' {
    interface CustomTypeOptions {
        defaultNS: 'translation';
        resources: { translation: typeof ptBR };
    }
}
