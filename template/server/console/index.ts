import dotenv from 'dotenv';
dotenv.config();

import { parseArgs, runTask, listTasks, type ConsoleTask } from './runner.js';

// Import all tasks
import exampleTask from './tasks/example.js';
import seedAdminTask from './tasks/seed-admin.js';

// Register all tasks here
const tasks: ConsoleTask[] = [
    exampleTask,
    seedAdminTask,
    // Add new tasks here as they are created
];

const args = parseArgs(process.argv);

if (!args.task) {
    listTasks(tasks);
    process.exit(0);
}

runTask(tasks, args.task as string, args).then(() => {
    process.exit(0);
});
