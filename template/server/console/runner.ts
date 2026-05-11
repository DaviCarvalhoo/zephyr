import Context from '#core/context.js';
import logger from '#core/logger.js';

export interface ConsoleTaskArgs {
    [key: string]: string | boolean;
}

export interface ConsoleTask {
    name: string;
    description: string;
    run: (context: Context, args: ConsoleTaskArgs) => Promise<void>;
}

export function parseArgs(argv: string[]): ConsoleTaskArgs {
    const args: ConsoleTaskArgs = {};

    for (const arg of argv.slice(2)) {
        if (arg.startsWith('--')) {
            const [key, value] = arg.substring(2).split('=');
            args[key] = value ?? true;
        }
    }

    return args;
}

export async function runTask(
    tasks: ConsoleTask[],
    taskName: string,
    args: ConsoleTaskArgs
): Promise<void> {
    const task = tasks.find((t) => t.name === taskName);

    if (!task) {
        logger.error(`Task not found: ${taskName}`);
        logger.info('Available tasks:');
        for (const t of tasks) {
            logger.info(`  --task=${t.name}  ${t.description}`);
        }
        process.exit(1);
    }

    const context = new Context();

    logger.info(`Running task: ${task.name}`);
    const start = Date.now();

    try {
        await task.run(context, args);
        const duration = Date.now() - start;
        logger.info(`Task completed in ${duration}ms`);
    } catch (error) {
        logger.error('Task failed', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        process.exit(1);
    }
}

export function listTasks(tasks: ConsoleTask[]): void {
    console.log('\nAvailable console tasks:\n');
    for (const task of tasks) {
        console.log(`  ${task.name.padEnd(25)} ${task.description}`);
    }
    console.log('\nUsage: npm run console -- --task=TASK_NAME [--arg=value]\n');
}
