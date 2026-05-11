import { TranslationShape } from './pt-BR';

const en: TranslationShape = {
    common: {
        continue: 'continue',
        back: 'back',
        skip: 'skip',
        ok: 'ok',
        cancel: 'cancel',
        loading: 'loading',
        save: 'save',
        done: 'done',
        retry: 'retry',
        signIn: 'sign in',
        signOut: 'sign out',
        signOutConfirmTitle: 'sign out',
        signOutConfirmBody:
            'you can keep using the app, but you lose sync.',
        upgrade: 'upgrade'
    },
    onboarding: {
        welcome: {
            wordmark: '{{PROJECT_NAME_UPPER}}',
            title: '{{PROJECT_NAME}}',
            subtitle: '{{PROJECT_DESCRIPTION}}',
            cta: 'get started',
            hint: 'less than 2 minutes to start',
            pillars: {
                discover: 'discover',
                decide: 'decide',
                advance: 'advance'
            }
        },
        questionnaire: {
            skip: 'skip',
            steps: [
                {
                    eyebrow: 'FIRST STEP',
                    question: 'what brought you\nhere?',
                    sub: "no wrong answers — pick what fits.",
                    options: [
                        {
                            id: 'curious',
                            label: 'curiosity',
                            sub: 'just want to see what this is'
                        },
                        {
                            id: 'work',
                            label: 'work',
                            sub: 'i need it for a project'
                        },
                        {
                            id: 'learn',
                            label: 'learn',
                            sub: 'i want to understand the topic'
                        },
                        {
                            id: 'other',
                            label: 'other',
                            sub: 'something different'
                        }
                    ]
                },
                {
                    eyebrow: 'WHAT MATTERS MOST',
                    question: 'what do you want\nto achieve?',
                    sub: 'this helps personalize the experience.',
                    options: [
                        {
                            id: 'speed',
                            label: 'speed',
                            sub: 'solve it fast'
                        },
                        {
                            id: 'depth',
                            label: 'depth',
                            sub: 'understand it well'
                        },
                        {
                            id: 'breadth',
                            label: 'breadth',
                            sub: 'see many options'
                        },
                        {
                            id: 'simplicity',
                            label: 'simplicity',
                            sub: 'less is more'
                        }
                    ]
                }
            ]
        },
        firstAction: {
            title: "you're all set.",
            body: 'from here, use the app freely. when you want to sync '
                + 'across devices or unlock premium features, just sign '
                + 'in.',
            cta: 'start using'
        }
    },
    auth: {
        landing: {
            wordmark: '{{PROJECT_NAME_UPPER}}',
            title: 'welcome.',
            subtitle: 'sign in or create an account to begin.',
            apple: 'continue with apple',
            google: 'continue with google',
            createWithEmail: 'create account with email',
            loginWithEmail: 'sign in with email',
            terms: 'by continuing, you accept our terms and privacy.',
            divider: 'or',
            errors: {
                tokenMissing: "couldn't get a token.",
                appleNoToken: "apple didn't return an identity token.",
                appleGeneric: 'failed to sign in with apple.',
                googleStart: 'failed to start google sign-in.'
            },
            success: 'welcome!',
            signInFailed: 'sign-in failed'
        },
        login: {
            eyebrow: 'EXISTING ACCOUNT',
            title: 'sign in',
            sub: 'pick up where you left off.',
            emailLabel: 'email',
            emailPlaceholder: 'you@email.com',
            passwordLabel: 'password',
            passwordPlaceholder: '••••••••',
            forgot: 'forgot password',
            cta: 'sign in',
            success: 'welcome back!',
            failedTitle: 'sign-in failed',
            allFieldsRequired: 'fill in all fields.'
        },
        signup: {
            eyebrow: 'NEW ACCOUNT',
            title: 'create account',
            sub: 'start in seconds.',
            nameLabel: 'name',
            namePlaceholder: 'your name',
            emailLabel: 'email',
            emailPlaceholder: 'you@email.com',
            passwordLabel: 'password',
            passwordPlaceholder: 'at least {{count}} characters',
            cta: 'create account',
            success: 'account created!',
            failedTitle: 'sign-up failed',
            allFieldsRequired: 'fill in all fields.',
            passwordTooShort:
                'password must be at least {{count}} characters.'
        },
        forgot: {
            eyebrow: 'RECOVERY',
            title: 'forgot\npassword',
            sub: "we'll send you a reset link.",
            emailLabel: 'email',
            emailPlaceholder: 'you@email.com',
            cta: 'send link',
            ctaSent: 'sent',
            successTitle: 'email sent',
            successBody: 'check your inbox.',
            errorTitle: 'error',
            emptyEmail: 'enter your email.'
        }
    },
    home: {
        eyebrow: 'HOME',
        greetingSigned: 'hi, {{name}}.',
        greetingAnonymous: 'hi.',
        body: 'this is the home screen. edit ',
        bodyAnonymousSuffix: " you're using the app without signing in.",
        cardLabel: 'TEMPLATE READY',
        cardTitle: 'all wired up.',
        cardBody:
            'auth, theme, navigation, offline sqlite, content sync, '
            + 'iap, push, and health all ship pre-wired.'
    },
    explore: {
        eyebrow: 'EXPLORE',
        title: 'content',
        sub: 'everything here is free for everyone.',
        cards: [
            {
                title: 'sample feature 1',
                body: 'free for everyone. edit '
                    + 'src/pages/main/Explore.tsx.'
            },
            {
                title: 'sample feature 2',
                body: 'mix free and premium content. wrap premium '
                    + 'ones in <PremiumGate />.'
            },
            {
                title: 'sample feature 3',
                body: 'auth is reached via profile or any premium gate.'
            }
        ]
    },
    action: {
        title: 'primary action',
        body: 'replace this with your product\'s core action. tranqs '
            + 'uses this slot for the guided practice flow.',
        cta: 'start'
    },
    library: {
        eyebrow: 'LIBRARY',
        title: 'your collection',
        sub: 'free items + a few premium features.',
        sectionFree: 'FREE',
        sectionPremium: 'PREMIUM',
        freeCard: {
            title: 'sample item (free)',
            body: 'core features, always available without sign-in.'
        },
        premiumCard: {
            title: 'backup active',
            body: 'your data is saved to the cloud. next auto-backup: '
                + 'within an hour.'
        },
        gateHeadline: 'cross-device sync',
        gateDescriptionAnonymous:
            'sign in and upgrade to sync.',
        gateDescriptionSigned:
            'upgrade to sync your data across devices.',
        anonymousNote:
            'you can still use the app without signing in. locked '
            + 'features unlock after upgrading.',
        freeAccountNote:
            'free account active. tap "upgrade" to unlock premium '
            + 'features.'
    },
    profile: {
        eyebrow: 'ACCOUNT',
        title: 'profile',
        signInCard: {
            title: 'create your account',
            body: 'sync across devices, recover your data anywhere, '
                + 'and unlock premium features.',
            cta: 'sign in / create account'
        },
        nameLabel: 'name',
        emailLabel: 'email',
        planLabel: 'plan',
        planFree: 'free',
        planPremium: 'premium',
        themeLight: 'light theme',
        themeDark: 'dark theme',
        languageLabel: 'language',
        languagePt: 'Português (Brasil)',
        languageEn: 'English',
        languagePicker: {
            title: 'language',
            subtitle: 'pick the app language.'
        },
        signOut: 'sign out'
    },
    premiumGate: {
        defaultHeadline: 'premium feature',
        defaultDescription: 'upgrade to unlock this feature.',
        cta: 'upgrade'
    },
    tabs: {
        home: 'home',
        explore: 'explore',
        library: 'library',
        profile: 'profile'
    },
    errors: {
        network: 'connection error. check your internet.',
        generic: 'something went wrong. try again.'
    }
};

export default en;
