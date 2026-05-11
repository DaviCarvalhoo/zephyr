import type { ConsoleTask } from '../runner.js';
import logger from '#core/logger.js';

const task: ConsoleTask = {
    name: 'example',
    description: 'Example task that demonstrates the console runner pattern',

    async run(context, args) {
        logger.info('Running example task', { args });

        // Access all models via context, just like in route handlers
        const knex = context.auth.knex;

        const [result] = await knex('users').count('id as count');
        logger.info(`Total users in database: ${result.count}`);

        // Example: process with arguments
        if (args.verbose) {
            const users = await knex('users').select('id', 'email', 'name');
            for (const user of users) {
                logger.info(`  - ${user.name} (${user.email})`);
            }
        }

        logger.info('Example task finished');
    }
};

export default task;
