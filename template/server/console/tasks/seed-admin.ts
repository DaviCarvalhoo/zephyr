import type { ConsoleTask } from '../runner.js';
import logger from '#core/logger.js';
import { sendEmail, isEmailConfigured } from '#core/email.js';

const task: ConsoleTask = {
    name: 'seed-admin',
    description: 'Create the initial admin user and account',

    async run(context, args) {
        if (!args.email || !args.password) {
            logger.error('Usage: npm run console -- --task=seed-admin --email=admin@example.com --password=yourpassword [--name=Admin]');
            process.exit(1);
        }

        const email = args.email as string;
        const password = args.password as string;
        const name = (args.name as string) || 'Admin';

        const knex = context.auth.knex;

        const existing = await knex('users').where({ email }).first();
        if (existing) {
            logger.warn(`User ${email} already exists, skipping`);
            return;
        }

        const user = await context.user.create({
            email,
            password,
            name,
            role: 'admin'
        });

        const [account] = await knex('accounts')
            .insert({
                name: 'Admin Account',
                status: 'active',
                settings: JSON.stringify({})
            })
            .returning('*');

        await knex('user_in_accounts').insert({
            user_id: user.id,
            account_id: account.id,
            role: 'owner'
        });

        logger.info('Admin user created', {
            email,
            userId: user.id,
            accountId: account.id
        });

        if (isEmailConfigured()) {
            try {
                await sendEmail(email, 'Bem-vindo!', 'accountWelcome', {
                    user: { name }
                });
                logger.info('Welcome email sent', { email });
            } catch (error) {
                logger.error('Failed to send welcome email', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        } else {
            logger.warn('Email not configured, skipping welcome email');
        }
    }
};

export default task;
