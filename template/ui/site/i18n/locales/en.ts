import { TranslationShape } from './pt-BR.js';

const en: TranslationShape = {
    meta: {
        siteTitle: '{{PROJECT_NAME}}',
        siteDescription: '{{PROJECT_DESCRIPTION}}'
    },
    nav: {
        features: 'Features',
        howItWorks: 'How It Works',
        contact: 'Contact',
        login: 'Sign In',
        ctaPrimary: 'Get Started',
        languageToggle: 'PT'
    },
    hero: {
        badge: 'Complete platform for your business',
        titleEyebrow: '{{PROJECT_NAME}}',
        subtitle: '{{PROJECT_DESCRIPTION}}',
        ctaPrimary: 'Get Started',
        ctaSecondary: 'Learn More',
        trust: {
            secure: 'Secure',
            cloud: '100% Cloud',
            fast: 'Fast'
        }
    },
    features: {
        eyebrow: 'Features',
        title: 'Everything you need in one platform',
        sub: 'Powerful tools to manage your operation with '
            + 'efficiency and security.',
        items: [
            {
                title: 'Multi-Tenant',
                body: 'Manage multiple accounts and organizations '
                    + 'with role-based access and fine-grained '
                    + 'permissions.'
            },
            {
                title: 'Secure',
                body: 'Robust authentication with httpOnly cookies, '
                    + 'secure S3 uploads, and validation at every '
                    + 'layer.'
            },
            {
                title: 'Modern',
                body: 'Responsive UI with light/dark themes, '
                    + 'accessible components, and a smooth experience '
                    + 'on any device.'
            },
            {
                title: 'File Uploads',
                body: 'Send and manage files with secure cloud '
                    + 'storage via AWS S3 and signed URLs.'
            },
            {
                title: 'Automated Emails',
                body: 'Email notifications with polished templates '
                    + 'for welcome, password recovery, and alerts.'
            },
            {
                title: 'Reports',
                body: 'Dashboards with real-time charts and metrics '
                    + 'to track your operation\'s performance.'
            }
        ]
    },
    howItWorks: {
        eyebrow: 'How It Works',
        title: 'Get started in minutes',
        sub: 'A simple process so you can start using it today.',
        steps: [
            {
                title: 'Create your account',
                body: 'Sign up free in under a minute. No credit '
                    + 'card required.'
            },
            {
                title: 'Set up your organization',
                body: 'Add your team, define roles, and configure '
                    + 'access permissions.'
            },
            {
                title: 'Start using',
                body: 'Your platform is ready. Manage everything '
                    + 'from a single place.'
            }
        ]
    },
    trust: {
        ssl: { title: 'SSL/TLS', sub: 'Encrypted' },
        lgpd: { title: 'LGPD', sub: 'Compliant' },
        cloud: { title: 'Cloud', sub: 'AWS' },
        backup: { title: 'Backup', sub: 'Daily' }
    },
    cta: {
        title: 'Ready to get started?',
        body: 'Create your account for free and discover how '
            + '{{PROJECT_NAME}} can transform your operation.',
        primary: 'Create Free Account',
        secondary: 'Talk to the Team'
    },
    footer: {
        product: 'Product',
        support: 'Support',
        contact: 'Contact',
        rights: 'All rights reserved.',
        terms: 'Terms of Service',
        privacy: 'Privacy'
    },
    notFound: {
        title: 'Page not found',
        body: 'The content you\'re looking for isn\'t here.',
        cta: 'Back to home'
    }
};

export default en;
