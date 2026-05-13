#!/usr/bin/env node

import chalk from 'chalk';
import figlet from 'figlet';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const cliDir = dirname(fileURLToPath(import.meta.url));

import { createProject } from './create.mjs';
import { buildProject, buildDeps } from './build.mjs';
import { generateIcons } from './icons.mjs';
import { updateProject } from './update.mjs';
import fs from 'node:fs';
import os from 'node:os';
import { execSync } from 'node:child_process';

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

function getProjectPort(key, fallback) {
    try {
        const envPath = './.env';
        if (fs.existsSync(envPath)) {
            const env = fs.readFileSync(envPath, 'utf8');
            const regex = new RegExp(`^${key}=(\\d+)`, 'm');
            const match = env.match(regex);
            return match ? match[1] : fallback;
        }
    } catch (e) {}
    return fallback;
}

const require = createRequire(import.meta.url);
const { version } = require('./package.json');

// zephyr design tokens
const green = chalk.hex('#02e027');
const cyan = chalk.hex('#00fff9');
const red = chalk.hex('#ff3c00');
const dim = chalk.hex('#a0a0a0');

function showBanner() {
    console.log('');
    console.log(green(figlet.textSync('Zephyr', { font: 'Small' })));
    console.log(dim('  SaaS starter kit generator'));
    console.log(dim('  TypeScript + React + PostgreSQL + multi-tenant'));
    console.log(cyan('  github.com/davicarvalhoo'));
    console.log('');
}

// Global SIGINT handler for general commands
const isRunCommand = process.argv.slice(2)[0] === 'run';
if (!isRunCommand) {
    process.on('SIGINT', () => {
        console.log('\n' + red('  Operation cancelled.'));
        process.exit(0);
    });
}

function showHelp() {
    showBanner();

    console.log(green.bold('Usage:'));
    console.log(`  zephyr               ${dim('Create a new project')}`);
    console.log(`  zephyr create        ${dim('Create a new project')}`);
    console.log(`  zephyr run           ${dim('Run Zephyr CLI via Docker')}`);
    console.log(`  zephyr build ${dim('<app> <builds>')}       ${dim('Build for production (or run Docker Build)')}`);
    console.log(`  zephyr build-deps ${dim('<builds>')}        ${dim('Install deps in build')}`);
    console.log(`  zephyr icons ${dim('[--from logo.png]')}    ${dim('Generate mobile icons')}`);
    console.log(`  zephyr update ${dim('<path> [--yes]')}      ${dim('Pull template updates into a project')}`);
    console.log(`  zephyr --help                  ${dim('Show this help')}`);
    console.log(`  zephyr --version               ${dim('Show version')}`);
    console.log('');
    console.log(green.bold('What you get:'));
    console.log(`  ${green('>')} Multi-tenant auth (cookie-based JWT)`);
    console.log(`  ${green('>')} Admin API + Site API (Express)`);
    console.log(`  ${green('>')} React admin panel (Vite + shadcn/ui)`);
    console.log(`  ${green('>')} PostgreSQL + Knex.js migrations`);
    console.log(`  ${green('>')} S3 file uploads with signed URLs`);
    console.log(`  ${green('>')} EJS-based public site`);
    console.log(`  ${green('>')} Console task runner`);
    console.log(`  ${green('>')} Role-based access (admin/owner/manager/user)`);
    console.log(`  ${green('>')} Production build system with versioning`);
    console.log('');
}

function showVersion() {
    console.log(`${green('zephyr')} ${dim('v' + version)}`);
}

async function runBuild(args) {
    const appDir = args[1];
    const buildDir = args[2];

    if (!appDir || !buildDir) {
        showBanner();
        console.log(cyan('   Building Docker images (this may take a while the first time)...'));
        try {
            execSync('docker compose build', { stdio: 'inherit' }); 
            console.log('\n' + green.bold('  Images built successfully!') + '\n');
        } catch (e) {
            console.log(red('\n  Error building images.'));
            process.exit(1);
        }
        return;
    }

    await buildProject(appDir, buildDir);
}

function parseFlags(args) {
    const flags = {};
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (!a.startsWith('--')) {
            continue;
        }
        const key = a.slice(2);
        const next = args[i + 1];
        if (next === undefined || next.startsWith('--')) {
            flags[key] = true;
        } else {
            flags[key] = next;
            i++;
        }
    }
    return flags;
}

async function runIcons(args) {
    const flags = parseFlags(args.slice(1));
    const out = flags.out ?? './assets';
    const primary = flags.primary ?? '#2563eb';
    const letter = flags.letter ?? 'A';
    const sourcePath = typeof flags.from === 'string' ? flags.from : null;

    if (!flags.primary) {
        console.log(dim(`No --primary given, using default ${primary}`));
    }
    if (!flags.letter && !sourcePath) {
        console.log(dim(`No --letter given, using default ${letter}`));
    }

    console.log('');
    console.log(green('  Generating icons'));
    console.log(dim(`  Output: ${out}`));
    console.log(dim(`  Primary: ${primary}`));
    if (sourcePath) {
        console.log(dim(`  Source: ${sourcePath}`));
    } else {
        console.log(dim(`  Letter: ${letter}`));
    }
    console.log('');

    const written = await generateIcons({
        outDir: out,
        primaryColor: primary,
        letter: letter.charAt(0).toUpperCase(),
        sourcePath
    });
    for (const p of written) {
        console.log(`  ${green('✓')} ${p}`);
    }
    console.log('');
}

async function runBuildDeps(args) {
    const buildDir = args[1];

    if (!buildDir) {
        console.log(red('Usage: zephyr build-deps <build-dir>'));
        console.log('');
        console.log(dim('  <build-dir>  Path to the builds output'));
        console.log('');
        console.log(dim('  Example:'));
        console.log(`  ${green('$')} zephyr build-deps ../builds`);
        process.exit(1);
    }

    await buildDeps(buildDir);
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'create') {
    showBanner();
    await createProject();
} else if (command === 'build') {
    await runBuild(args);
} else if (command === 'build-deps') {
    await runBuildDeps(args);
} else if (command === 'icons') {
    await runIcons(args);
} else if (command === 'run') {
    showBanner();
    console.log(cyan('  Starting Zephyr system in background...'));
    try {
        // Run detached to keep terminal clean
        execSync('docker compose up --build -d', { stdio: 'ignore' });
        
        const sitePort = getProjectPort('SITE_PORT', '3000');
        const adminPort = getProjectPort('ADMIN_UI_PORT', '5173');
        const apiPort = getProjectPort('API_PORT', '4000');
        const siteApiPort = getProjectPort('SITE_API_PORT', '4001');
        const localIp = getLocalIp();

        console.log('');
        console.log(green.bold('   Project started successfully!'));
        console.log('');
        console.log(dim('  Available interfaces:'));
        console.log(`  ${green('➜')}  ${chalk.bold('Public Site:')}    ${cyan(`http://localhost:${sitePort}`)}  ${dim(`(http://${localIp}:${sitePort})`)}`);
        console.log(`  ${green('➜')}  ${chalk.bold('Admin Panel:')}    ${cyan(`http://localhost:${adminPort}`)}  ${dim(`(http://${localIp}:${adminPort})`)}`);
        console.log(dim('  APIs and Backend:'));
        console.log(`  ${green('➜')}  ${chalk.bold('Admin API:')}      ${cyan(`http://localhost:${apiPort}`)}  ${dim(`(http://${localIp}:${apiPort})`)}`);
        console.log(`  ${green('➜')}  ${chalk.bold('Site API:')}       ${cyan(`http://localhost:${siteApiPort}`)}  ${dim(`(http://${localIp}:${siteApiPort})`)}`);
        console.log('');
        console.log(chalk.yellow('  ➜  Press CTRL+C to stop the system.'));
        console.log('');
        console.log(dim('  Tip: To see real-time logs, use "docker compose logs -f" in another terminal.'));
        console.log('');

        // Catch Ctrl+C to stop the containers
        process.on('SIGINT', () => {
            console.log('\n' + cyan('  Stopping system containers...'));
            try {
                execSync('docker compose stop', { stdio: 'ignore' });
                console.log(green('  System stopped successfully.'));
            } catch (e) {
                console.log(red('  Could not stop containers automatically.'));
            }
            process.exit(0);
        });

        // Keep process alive
        setInterval(() => {}, 1000);
    } catch (e) {
        console.log(red('\n  Error starting. Check if Docker is running or use "docker compose up" to debug.'));
        process.exit(1);
    }
} else if (command === 'update') {
    const flags = parseFlags(args.slice(1));
    const projectPath = args[1] && !args[1].startsWith('--')
        ? args[1]
        : '.';
    if (!projectPath) {
        console.log(red('Usage: zephyr update <path> [--yes]'));
        console.log(dim(
            '  --yes  Accept all auto-updates without prompting.'
        ));
        process.exit(1);
    }
    await updateProject(projectPath, { yes: !!flags.yes });
} else if (command === '--help' || command === '-h' || command === 'help') {
    showHelp();
} else if (command === '--version' || command === '-v') {
    showVersion();
} else {
    console.log(red(`Unknown command: ${command}`));
    console.log(`Run ${green('zephyr --help')} to see available commands.`);
    process.exit(1);
}
