// Source-of-truth shape — EN satisfies the same TranslationShape.

export type TranslationShape = {
    meta: {
        siteTitle: string;
        siteDescription: string;
    };
    nav: {
        features: string;
        howItWorks: string;
        contact: string;
        login: string;
        ctaPrimary: string;
        languageToggle: string;
    };
    hero: {
        badge: string;
        titleEyebrow: string;
        subtitle: string;
        ctaPrimary: string;
        ctaSecondary: string;
        trust: { secure: string; cloud: string; fast: string };
    };
    features: {
        eyebrow: string;
        title: string;
        sub: string;
        items: Array<{ title: string; body: string }>;
    };
    howItWorks: {
        eyebrow: string;
        title: string;
        sub: string;
        steps: Array<{ title: string; body: string }>;
    };
    trust: {
        ssl: { title: string; sub: string };
        lgpd: { title: string; sub: string };
        cloud: { title: string; sub: string };
        backup: { title: string; sub: string };
    };
    cta: {
        title: string;
        body: string;
        primary: string;
        secondary: string;
    };
    footer: {
        product: string;
        support: string;
        contact: string;
        rights: string;
        terms: string;
        privacy: string;
    };
    notFound: {
        title: string;
        body: string;
        cta: string;
    };
};

const ptBR: TranslationShape = {
    meta: {
        siteTitle: '{{PROJECT_NAME}}',
        siteDescription: '{{PROJECT_DESCRIPTION}}'
    },
    nav: {
        features: 'Funcionalidades',
        howItWorks: 'Como Funciona',
        contact: 'Contato',
        login: 'Entrar',
        ctaPrimary: 'Começar Agora',
        languageToggle: 'EN'
    },
    hero: {
        badge: 'Plataforma completa para sua empresa',
        titleEyebrow: '{{PROJECT_NAME}}',
        subtitle: '{{PROJECT_DESCRIPTION}}',
        ctaPrimary: 'Começar Agora',
        ctaSecondary: 'Saiba Mais',
        trust: {
            secure: 'Seguro',
            cloud: '100% na Nuvem',
            fast: 'Rápido'
        }
    },
    features: {
        eyebrow: 'Funcionalidades',
        title: 'Tudo que você precisa em uma plataforma',
        sub: 'Ferramentas poderosas para gerenciar sua operação com '
            + 'eficiência e segurança.',
        items: [
            {
                title: 'Multi-Tenant',
                body: 'Gerencie múltiplas contas e organizações com '
                    + 'controle de acesso por papel e permissões '
                    + 'granulares.'
            },
            {
                title: 'Seguro',
                body: 'Autenticação robusta com cookies httpOnly, '
                    + 'uploads seguros via S3 e validação em todas '
                    + 'as camadas.'
            },
            {
                title: 'Moderno',
                body: 'Interface responsiva com tema claro/escuro, '
                    + 'componentes acessíveis e experiência fluida em '
                    + 'qualquer dispositivo.'
            },
            {
                title: 'Upload de Arquivos',
                body: 'Envie e gerencie arquivos com armazenamento '
                    + 'seguro na nuvem via AWS S3 e URLs assinadas.'
            },
            {
                title: 'Emails Automáticos',
                body: 'Notificações por email com templates bonitos '
                    + 'para boas-vindas, recuperação de senha e '
                    + 'alertas.'
            },
            {
                title: 'Relatórios',
                body: 'Dashboards com gráficos e métricas em tempo '
                    + 'real para acompanhar o desempenho da sua '
                    + 'operação.'
            }
        ]
    },
    howItWorks: {
        eyebrow: 'Como Funciona',
        title: 'Comece em poucos minutos',
        sub: 'Um processo simples para você começar a usar hoje '
            + 'mesmo.',
        steps: [
            {
                title: 'Crie sua conta',
                body: 'Cadastre-se gratuitamente em menos de um '
                    + 'minuto. Sem cartão de crédito.'
            },
            {
                title: 'Configure sua organização',
                body: 'Adicione sua equipe, defina papéis e configure '
                    + 'as permissões de acesso.'
            },
            {
                title: 'Comece a usar',
                body: 'Sua plataforma está pronta. Gerencie tudo de '
                    + 'um único lugar.'
            }
        ]
    },
    trust: {
        ssl: { title: 'SSL/TLS', sub: 'Criptografado' },
        lgpd: { title: 'LGPD', sub: 'Compliant' },
        cloud: { title: 'Cloud', sub: 'AWS' },
        backup: { title: 'Backup', sub: 'Diário' }
    },
    cta: {
        title: 'Pronto para começar?',
        body: 'Crie sua conta gratuitamente e descubra como o '
            + '{{PROJECT_NAME}} pode transformar sua operação.',
        primary: 'Criar Conta Grátis',
        secondary: 'Falar com a Equipe'
    },
    footer: {
        product: 'Produto',
        support: 'Suporte',
        contact: 'Contato',
        rights: 'Todos os direitos reservados.',
        terms: 'Termos de Uso',
        privacy: 'Privacidade'
    },
    notFound: {
        title: 'Página não encontrada',
        body: 'O conteúdo que você procura não está aqui.',
        cta: 'Voltar para o início'
    }
};

export default ptBR;
