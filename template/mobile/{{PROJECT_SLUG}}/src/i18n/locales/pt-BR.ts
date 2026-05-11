// Source-of-truth shape for translations. EN satisfies this same shape.
// We avoid `as const` so EN string literals can satisfy the shape (keys
// still type-check in t() via i18next CustomTypeOptions binding to
// `typeof ptBR` in ../index.ts).

export type TranslationShape = {
    common: {
        continue: string;
        back: string;
        skip: string;
        ok: string;
        cancel: string;
        loading: string;
        save: string;
        done: string;
        retry: string;
        signIn: string;
        signOut: string;
        signOutConfirmTitle: string;
        signOutConfirmBody: string;
        upgrade: string;
    };
    onboarding: {
        welcome: {
            wordmark: string;
            title: string;
            subtitle: string;
            cta: string;
            hint: string;
            pillars: { discover: string; decide: string; advance: string };
        };
        questionnaire: {
            skip: string;
            steps: Array<{
                eyebrow: string;
                question: string;
                sub: string;
                options: Array<{ id: string; label: string; sub: string }>;
            }>;
        };
        firstAction: {
            title: string;
            body: string;
            cta: string;
        };
    };
    auth: {
        landing: {
            wordmark: string;
            title: string;
            subtitle: string;
            apple: string;
            google: string;
            createWithEmail: string;
            loginWithEmail: string;
            terms: string;
            divider: string;
            errors: {
                tokenMissing: string;
                appleNoToken: string;
                appleGeneric: string;
                googleStart: string;
            };
            success: string;
            signInFailed: string;
        };
        login: {
            eyebrow: string;
            title: string;
            sub: string;
            emailLabel: string;
            emailPlaceholder: string;
            passwordLabel: string;
            passwordPlaceholder: string;
            forgot: string;
            cta: string;
            success: string;
            failedTitle: string;
            allFieldsRequired: string;
        };
        signup: {
            eyebrow: string;
            title: string;
            sub: string;
            nameLabel: string;
            namePlaceholder: string;
            emailLabel: string;
            emailPlaceholder: string;
            passwordLabel: string;
            passwordPlaceholder: string;
            cta: string;
            success: string;
            failedTitle: string;
            allFieldsRequired: string;
            passwordTooShort: string;
        };
        forgot: {
            eyebrow: string;
            title: string;
            sub: string;
            emailLabel: string;
            emailPlaceholder: string;
            cta: string;
            ctaSent: string;
            successTitle: string;
            successBody: string;
            errorTitle: string;
            emptyEmail: string;
        };
    };
    home: {
        eyebrow: string;
        greetingSigned: string;
        greetingAnonymous: string;
        body: string;
        bodyAnonymousSuffix: string;
        cardLabel: string;
        cardTitle: string;
        cardBody: string;
    };
    explore: {
        eyebrow: string;
        title: string;
        sub: string;
        cards: Array<{ title: string; body: string }>;
    };
    action: {
        title: string;
        body: string;
        cta: string;
    };
    library: {
        eyebrow: string;
        title: string;
        sub: string;
        sectionFree: string;
        sectionPremium: string;
        freeCard: { title: string; body: string };
        premiumCard: { title: string; body: string };
        gateHeadline: string;
        gateDescriptionAnonymous: string;
        gateDescriptionSigned: string;
        anonymousNote: string;
        freeAccountNote: string;
    };
    profile: {
        eyebrow: string;
        title: string;
        signInCard: {
            title: string;
            body: string;
            cta: string;
        };
        nameLabel: string;
        emailLabel: string;
        planLabel: string;
        planFree: string;
        planPremium: string;
        themeLight: string;
        themeDark: string;
        languageLabel: string;
        languagePt: string;
        languageEn: string;
        languagePicker: {
            title: string;
            subtitle: string;
        };
        signOut: string;
    };
    premiumGate: {
        defaultHeadline: string;
        defaultDescription: string;
        cta: string;
    };
    tabs: {
        home: string;
        explore: string;
        library: string;
        profile: string;
    };
    errors: {
        network: string;
        generic: string;
    };
};

const ptBR: TranslationShape = {
    common: {
        continue: 'continuar',
        back: 'voltar',
        skip: 'pular',
        ok: 'ok',
        cancel: 'cancelar',
        loading: 'carregando',
        save: 'salvar',
        done: 'pronto',
        retry: 'tentar de novo',
        signIn: 'entrar',
        signOut: 'sair',
        signOutConfirmTitle: 'sair da conta',
        signOutConfirmBody:
            'você continua usando o app, mas perde sincronização.',
        upgrade: 'fazer upgrade'
    },
    onboarding: {
        welcome: {
            wordmark: '{{PROJECT_NAME_UPPER}}',
            title: '{{PROJECT_NAME}}',
            subtitle: '{{PROJECT_DESCRIPTION}}',
            cta: 'começar',
            hint: 'menos de 2 minutos para começar',
            pillars: {
                discover: 'descobrir',
                decide: 'decidir',
                advance: 'avançar'
            }
        },
        questionnaire: {
            skip: 'pular',
            steps: [
                {
                    eyebrow: 'PRIMEIRO PASSO',
                    question: 'o que te trouxe\naqui?',
                    sub: 'sem resposta certa. use a que mais se parece.',
                    options: [
                        {
                            id: 'curious',
                            label: 'curiosidade',
                            sub: 'quero ver do que se trata'
                        },
                        {
                            id: 'work',
                            label: 'trabalho',
                            sub: 'preciso para um projeto'
                        },
                        {
                            id: 'learn',
                            label: 'aprender',
                            sub: 'quero entender o assunto'
                        },
                        {
                            id: 'other',
                            label: 'outro',
                            sub: 'algo diferente do acima'
                        }
                    ]
                },
                {
                    eyebrow: 'O QUE MAIS IMPORTA',
                    question: 'o que você\nquer alcançar?',
                    sub: 'isso ajuda a personalizar a experiência.',
                    options: [
                        {
                            id: 'speed',
                            label: 'velocidade',
                            sub: 'resolver rápido'
                        },
                        {
                            id: 'depth',
                            label: 'profundidade',
                            sub: 'entender bem'
                        },
                        {
                            id: 'breadth',
                            label: 'amplitude',
                            sub: 'ver várias opções'
                        },
                        {
                            id: 'simplicity',
                            label: 'simplicidade',
                            sub: 'menos é mais'
                        }
                    ]
                }
            ]
        },
        firstAction: {
            title: 'tudo pronto.',
            body: 'a partir daqui você pode usar o app livremente. quando '
                + 'quiser sincronizar entre dispositivos ou desbloquear '
                + 'recursos premium, é só entrar.',
            cta: 'começar a usar'
        }
    },
    auth: {
        landing: {
            wordmark: '{{PROJECT_NAME_UPPER}}',
            title: 'bem-vindo.',
            subtitle: 'entre ou crie sua conta para começar.',
            apple: 'continuar com apple',
            google: 'continuar com google',
            createWithEmail: 'criar conta com e-mail',
            loginWithEmail: 'login com e-mail',
            terms: 'ao continuar, você aceita nossos termos e privacidade.',
            divider: 'ou',
            errors: {
                tokenMissing: 'não foi possível obter o token.',
                appleNoToken: 'apple não retornou o token de identidade.',
                appleGeneric: 'erro ao entrar com apple.',
                googleStart: 'erro ao iniciar login com google.'
            },
            success: 'bem-vindo!',
            signInFailed: 'falha no login'
        },
        login: {
            eyebrow: 'JÁ TEM CONTA',
            title: 'entrar',
            sub: 'continue de onde parou.',
            emailLabel: 'e-mail',
            emailPlaceholder: 'seu@email.com',
            passwordLabel: 'senha',
            passwordPlaceholder: '••••••••',
            forgot: 'esqueci minha senha',
            cta: 'entrar',
            success: 'bem-vindo de volta!',
            failedTitle: 'falha no login',
            allFieldsRequired: 'preencha todos os campos.'
        },
        signup: {
            eyebrow: 'NOVA CONTA',
            title: 'criar conta',
            sub: 'comece em segundos.',
            nameLabel: 'nome',
            namePlaceholder: 'seu nome',
            emailLabel: 'e-mail',
            emailPlaceholder: 'seu@email.com',
            passwordLabel: 'senha',
            passwordPlaceholder: 'mínimo {{count}} caracteres',
            cta: 'criar conta',
            success: 'conta criada!',
            failedTitle: 'falha no cadastro',
            allFieldsRequired: 'preencha todos os campos.',
            passwordTooShort:
                'a senha precisa ter pelo menos {{count}} caracteres.'
        },
        forgot: {
            eyebrow: 'RECUPERAÇÃO',
            title: 'esqueci\nminha senha',
            sub: 'vamos te enviar um link para redefinir.',
            emailLabel: 'e-mail',
            emailPlaceholder: 'seu@email.com',
            cta: 'enviar link',
            ctaSent: 'enviado',
            successTitle: 'e-mail enviado',
            successBody: 'verifique sua caixa de entrada.',
            errorTitle: 'erro',
            emptyEmail: 'informe seu e-mail.'
        }
    },
    home: {
        eyebrow: 'INÍCIO',
        greetingSigned: 'olá, {{name}}.',
        greetingAnonymous: 'olá.',
        body: 'esta é a tela inicial. edite ',
        bodyAnonymousSuffix: ' você está usando o app sem entrar.',
        cardLabel: 'TEMPLATE PRONTO',
        cardTitle: 'tudo conectado.',
        cardBody:
            'auth, tema, navegação, sqlite offline, sincronização de '
            + 'conteúdo, iap, push e health já vêm fiados.'
    },
    explore: {
        eyebrow: 'EXPLORAR',
        title: 'conteúdo',
        sub: 'tudo aqui é livre para qualquer pessoa.',
        cards: [
            {
                title: 'recurso de exemplo 1',
                body: 'livre para todos. edite src/pages/main/Explore.tsx.'
            },
            {
                title: 'recurso de exemplo 2',
                body: 'misture conteúdo livre e premium. envolva os '
                    + 'premium em <PremiumGate />.'
            },
            {
                title: 'recurso de exemplo 3',
                body: 'auth é alcançado pelo perfil ou por qualquer '
                    + 'gate de premium.'
            }
        ]
    },
    action: {
        title: 'ação principal',
        body: 'substitua esta tela pela ação central do seu app. tranqs '
            + 'usa este espaço para a tela de prática guiada.',
        cta: 'começar'
    },
    library: {
        eyebrow: 'BIBLIOTECA',
        title: 'sua coleção',
        sub: 'itens livres + alguns recursos premium.',
        sectionFree: 'LIVRE',
        sectionPremium: 'PREMIUM',
        freeCard: {
            title: 'item de exemplo (livre)',
            body: 'funcionalidades base, sempre disponíveis sem login.'
        },
        premiumCard: {
            title: 'backup ativo',
            body: 'seus dados estão salvos na nuvem. próximo backup '
                + 'automático: em até 1h.'
        },
        gateHeadline: 'sincronização entre dispositivos',
        gateDescriptionAnonymous:
            'entre e faça upgrade para sincronizar.',
        gateDescriptionSigned:
            'faça upgrade para sincronizar seus dados.',
        anonymousNote:
            'você ainda pode usar o app sem entrar. recursos com '
            + 'cadeado ficam disponíveis após upgrade.',
        freeAccountNote:
            'conta gratuita ativa. toque em "fazer upgrade" para '
            + 'desbloquear recursos premium.'
    },
    profile: {
        eyebrow: 'CONTA',
        title: 'perfil',
        signInCard: {
            title: 'crie sua conta',
            body: 'sincronize entre dispositivos, recupere seus dados '
                + 'em qualquer lugar e desbloqueie recursos premium.',
            cta: 'entrar / criar conta'
        },
        nameLabel: 'nome',
        emailLabel: 'e-mail',
        planLabel: 'plano',
        planFree: 'gratuito',
        planPremium: 'premium',
        themeLight: 'tema claro',
        themeDark: 'tema escuro',
        languageLabel: 'idioma',
        languagePt: 'Português (Brasil)',
        languageEn: 'English',
        languagePicker: {
            title: 'idioma',
            subtitle: 'escolha o idioma do app.'
        },
        signOut: 'sair'
    },
    premiumGate: {
        defaultHeadline: 'recurso premium',
        defaultDescription: 'faça upgrade para desbloquear este recurso.',
        cta: 'fazer upgrade'
    },
    tabs: {
        home: 'início',
        explore: 'explorar',
        library: 'biblioteca',
        profile: 'perfil'
    },
    errors: {
        network: 'erro de conexão. verifique sua internet.',
        generic: 'algo deu errado. tente novamente.'
    }
};

export default ptBR;
