#!/usr/bin/env node

import chalk from 'chalk';
import figlet from 'figlet';
import { createRequire } from 'node:module';

import { createProject } from './create.mjs';
import { buildProject, buildDeps } from './build.mjs';
import { generateIcons } from './icons.mjs';
import { updateProject } from './update.mjs';

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

function showHelp() {
    showBanner();

    console.log(green.bold('Usage:'));
    console.log(`  zephyr               ${dim('Create a new project')}`);
    console.log(`  zephyr create        ${dim('Create a new project')}`);
    console.log(`  zephyr build ${dim('<app> <builds>')}       ${dim('Build for production')}`);
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
        console.log(red('Usage: zephyr build <app-dir> <build-dir>'));
        console.log('');
        console.log(dim('  <app-dir>    Path to the project (source)'));
        console.log(dim('  <build-dir>  Path to the builds output'));
        console.log('');
        console.log(dim('  Example:'));
        console.log(`  ${green('$')} zephyr build ../app ../builds`);
        process.exit(1);
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
