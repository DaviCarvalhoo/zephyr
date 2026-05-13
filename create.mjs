import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildReplacements } from './template-variables.mjs';
import { generateIcons } from './icons.mjs';
import { writeInitialManifest } from './update.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.join(__dirname, 'template');

// davicarvalhoo design tokens
const green = chalk.hex('#02e027');
const cyan = chalk.hex('#00fff9');
const red = chalk.hex('#ff3c00');
const dim = chalk.hex('#a0a0a0');

const BINARY_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.zip', '.tar', '.gz', '.br',
    '.pdf', '.mp3', '.mp4', '.webm', '.ogg',
]);

// Presets describe which top-level template directories ship in a new
// project. The CLI scrubs the rest after copying — keeps the template
// structure unconditional and the create-time logic dead simple.
const PRESETS = {
    everything: {
        label: 'Everything (server + admin UI + site + mobile)',
        includes: ['server', 'ui/admin', 'ui/site', 'mobile', 'misc',
                   'scripts', 'doc'],
        wantsMobile: true,
        wantsServer: true,
        wantsAdminUi: true,
        wantsSite: true,
    },
    'web-only': {
        label: 'Web only (server + admin UI + site, no mobile)',
        includes: ['server', 'ui/admin', 'ui/site', 'misc', 'doc'],
        wantsMobile: false,
        wantsServer: true,
        wantsAdminUi: true,
        wantsSite: true,
    },
    'mobile-and-server': {
        label: 'Mobile + server only (no admin UI, no site)',
        includes: ['server', 'mobile', 'misc', 'scripts', 'doc'],
        wantsMobile: true,
        wantsServer: true,
        wantsAdminUi: false,
        wantsSite: false,
    },
    'just-mobile': {
        label: 'Just mobile (assumes external API)',
        includes: ['mobile', 'scripts', 'doc'],
        wantsMobile: true,
        wantsServer: false,
        wantsAdminUi: false,
        wantsSite: false,
    },
};

const ROOT_FILES_BY_PRESET = {
    everything:           ['CLAUDE.md', 'AGENTS.md', 'README.md',
                           'architecture.md', 'code.md',
                           'install.sh', 'seed.sh', 'dev.sh', 'docker-compose.yml'],
    'web-only':           ['CLAUDE.md', 'AGENTS.md', 'README.md',
                           'architecture.md', 'code.md',
                           'install.sh', 'seed.sh', 'dev.sh', 'docker-compose.yml'],
    'mobile-and-server':  ['CLAUDE.md', 'AGENTS.md', 'README.md',
                           'architecture.md', 'code.md',
                           'install.sh', 'seed.sh', 'dev.sh', 'docker-compose.yml'],
    'just-mobile':        ['CLAUDE.md', 'README.md', 'code.md',
                           'install.sh', 'dev.sh'],
};

function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function toDbName(slug) {
    return slug.replace(/-/g, '_');
}

function toReverseDomain(domain) {
    // "minhaempresa.com.br" → "br.com.minhaempresa"
    const parts = domain.toLowerCase().split('.').filter(Boolean);
    return parts.reverse().join('.');
}

async function promptProjectDetails() {
    console.log(green.bold('  Project Setup'));
    console.log(chalk.hex('#2c2c2c')('  ' + '─'.repeat(40)));
    console.log('');

    const { preset } = await inquirer.prompt([{
        type: 'list',
        name: 'preset',
        message: 'What do you want to generate?',
        choices: Object.entries(PRESETS).map(([value, def]) => ({
            name: def.label,
            value,
        })),
        default: 'everything',
    }]);

    const presetDef = PRESETS[preset];

    const { name } = await inquirer.prompt([{
        type: 'input',
        name: 'name',
        message: 'Project name (e.g. "My Project"):',
        validate: (v) => v.trim() ? true : 'Project name is required',
    }]);

    const suggestedSlug = slugify(name);
    const suggestedDb = toDbName(suggestedSlug);

    const baseQuestions = [
        {
            type: 'input',
            name: 'slug',
            message: 'Project slug:',
            default: suggestedSlug,
            validate: (v) => /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(v) || v.length === 1 && /^[a-z0-9]$/.test(v)
                ? true
                : 'Slug must be lowercase alphanumeric with hyphens (no leading/trailing hyphens)',
        },
        {
            type: 'input',
            name: 'description',
            message: 'Short description:',
            default: '',
        },
        {
            type: 'input',
            name: 'domain',
            message: 'Domain (e.g. "mycompany.com"):',
            validate: (v) => v.trim() ? true : 'Domain is required',
        },
    ];

    const serverQuestions = !presetDef.wantsServer ? [] : [
        {
            type: 'input',
            name: 'dbName',
            message: 'Database name:',
            default: suggestedDb,
            validate: (v) => /^[a-z_][a-z0-9_]*$/.test(v)
                ? true
                : 'Database name must be lowercase with underscores',
        },
        {
            type: 'input',
            name: 'adminEmail',
            message: 'Admin email:',
            default: 'admin@localhost.com',
            validate: (v) => v.includes('@') ? true : 'Must be a valid email',
        },
        {
            type: 'password',
            name: 'adminPassword',
            message: 'Admin password:',
            validate: (v) => v.length >= 6 ? true : 'Password must be at least 6 characters',
        },
        {
            type: 'input',
            name: 'apiPort',
            message: 'Admin API port:',
            default: '4000',
            validate: validatePort,
        },
        {
            type: 'input',
            name: 'siteApiPort',
            message: 'Site API port:',
            default: '4001',
            validate: validatePort,
        },
    ];

    const webUiQuestions = !presetDef.wantsAdminUi ? [] : [
        {
            type: 'input',
            name: 'adminUiPort',
            message: 'Admin panel port:',
            default: '5173',
            validate: validatePort,
        },
    ];

    const siteQuestions = !presetDef.wantsSite ? [] : [
        {
            type: 'input',
            name: 'sitePort',
            message: 'Public site port:',
            default: '3000',
            validate: validatePort,
        },
    ];

    const styleQuestions = [
        {
            type: 'input',
            name: 'outputDir',
            message: 'Output directory:',
            default: `./${suggestedSlug}`,
        },
        {
            type: 'input',
            name: 'primaryColor',
            message: 'Primary color (hex):',
            default: '#2563eb',
            validate: (v) => /^#?([0-9a-fA-F]{6})$/.test(v.trim())
                ? true
                : 'Must be a valid hex color (e.g. #2563eb)',
            filter: (v) => v.trim().startsWith('#') ? v.trim() : `#${v.trim()}`,
        },
        {
            type: 'list',
            name: 'defaultTheme',
            message: 'Default theme:',
            choices: [
                { name: 'Light', value: 'light' },
                { name: 'Dark', value: 'dark' },
                { name: 'System (follows OS preference)', value: 'system' },
            ],
            default: 'light',
        },
    ];

    const mobileQuestions = !presetDef.wantsMobile ? [] : [
        {
            type: 'input',
            name: 'iosBundleId',
            message: 'iOS bundle identifier:',
            default: ({ domain }) => `${toReverseDomain(domain || '')}.app`,
            validate: (v) => /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/i.test(v)
                ? true
                : 'Must be reverse-DNS (e.g. com.brand.app)',
        },
        {
            type: 'input',
            name: 'androidPackage',
            message: 'Android package:',
            default: ({ iosBundleId }) =>
                iosBundleId ? iosBundleId.replace(/\.app$/, '') : '',
            validate: (v) => /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(v)
                ? true
                : 'Must be reverse-DNS using underscores (e.g. br.com.brand)',
        },
        {
            type: 'input',
            name: 'mobileScheme',
            message: 'Mobile URL scheme (deep links):',
            default: ({ slug }) => slug,
            validate: (v) => /^[a-z][a-z0-9-]*$/.test(v)
                ? true
                : 'Lowercase alphanumeric, dashes allowed',
        },
    ];

    const answers = await inquirer.prompt([
        ...baseQuestions,
        ...serverQuestions,
        ...webUiQuestions,
        ...siteQuestions,
        ...styleQuestions,
        ...mobileQuestions,
    ]);

    return {
        preset,
        presetDef,
        name: name.trim(),
        // Defaults for the parts the user didn't see — they're still
        // referenced by replacements (some unconditionally), so we fill
        // safe placeholders.
        dbName:        answers.dbName        ?? suggestedDb,
        adminEmail:    answers.adminEmail    ?? 'admin@localhost.com',
        adminPassword: answers.adminPassword ?? 'admin123',
        apiPort:       answers.apiPort       ?? '4000',
        siteApiPort:   answers.siteApiPort   ?? '4001',
        adminUiPort:   answers.adminUiPort   ?? '5173',
        sitePort:      answers.sitePort      ?? '3000',
        iosBundleId:    answers.iosBundleId
            ?? `${toReverseDomain(answers.domain)}.app`,
        androidPackage: answers.androidPackage
            ?? toReverseDomain(answers.domain),
        mobileScheme:   answers.mobileScheme ?? answers.slug,
        ...answers,
    };
}

function validatePort(v) {
    return /^\d+$/.test(v) && +v > 0 && +v < 65536
        ? true
        : 'Must be a valid port number';
}

function showSummary(details) {
    const { presetDef } = details;
    console.log('');
    console.log(green.bold('  Project Summary'));
    console.log(chalk.hex('#2c2c2c')('  ' + '─'.repeat(40)));
    console.log('');
    console.log(`  ${chalk.bold('Preset:')}       ${cyan(presetDef.label)}`);
    console.log(`  ${chalk.bold('Name:')}         ${cyan(details.name)}`);
    console.log(`  ${chalk.bold('Slug:')}         ${details.slug}`);
    console.log(`  ${chalk.bold('Description:')}  ${details.description || dim('(none)')}`);
    console.log(`  ${chalk.bold('Domain:')}       ${cyan(details.domain)}`);
    if (presetDef.wantsServer) {
        console.log(`  ${chalk.bold('Database:')}     ${details.dbName}`);
        console.log(`  ${chalk.bold('Admin:')}        ${details.adminEmail}`);
    }
    console.log(`  ${chalk.bold('Output:')}       ${details.outputDir}`);
    const ports = [];
    if (presetDef.wantsServer)  ports.push(`API ${cyan(details.apiPort)} | Site API ${cyan(details.siteApiPort)}`);
    if (presetDef.wantsAdminUi) ports.push(`Admin ${cyan(details.adminUiPort)}`);
    if (presetDef.wantsSite)    ports.push(`Site ${cyan(details.sitePort)}`);
    if (ports.length) {
        console.log(`  ${chalk.bold('Ports:')}        ${ports.join(' | ')}`);
    }
    console.log(`  ${chalk.bold('Color:')}        ${chalk.hex(details.primaryColor)('██')} ${details.primaryColor}`);
    console.log(`  ${chalk.bold('Theme:')}        ${details.defaultTheme}`);
    if (presetDef.wantsMobile) {
        console.log(`  ${chalk.bold('iOS:')}          ${details.iosBundleId}`);
        console.log(`  ${chalk.bold('Android:')}      ${details.androidPackage}`);
        console.log(`  ${chalk.bold('Scheme:')}       ${details.mobileScheme}://`);
    }
    console.log('');
    console.log(dim('  Generates:'));
    if (presetDef.wantsServer)  console.log(dim(`  ${green('>')} Admin API + Site API (Express + TS)`));
    if (presetDef.wantsAdminUi) console.log(dim(`  ${green('>')} React admin panel (Vite + shadcn/ui)`));
    if (presetDef.wantsSite)    console.log(dim(`  ${green('>')} Public site (EJS + Tailwind)`));
    if (presetDef.wantsMobile)  console.log(dim(`  ${green('>')} Mobile app (Expo + TS + auth + theme)`));
    if (presetDef.wantsServer)  console.log(dim(`  ${green('>')} PostgreSQL migrations + seed`));
    console.log('');
}

async function getAllFiles(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await getAllFiles(fullPath));
        } else {
            files.push(fullPath);
        }
    }

    return files;
}

function isBinaryFile(filePath) {
    return BINARY_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function replacePlaceholders(content, replacements) {
    let result = content;
    for (const [placeholder, value] of Object.entries(replacements)) {
        result = result.replaceAll(placeholder, value);
    }
    return result;
}

// Copies the parts of the template the preset asks for. We always
// recursively copy the whole template tree first then prune what the
// preset doesn't want — simpler than walking with a filter function and
// keeps the template layout flat in source.
// Top-level directories that ship with every preset regardless of
// what the user picked. Project-level config (Claude rules, editor
// config, git ignore) doesn't belong to any single sub-app.
const ALWAYS_KEEP = new Set(['.claude']);

async function copyTemplate(outputDir, preset) {
    const presetDef = PRESETS[preset];
    await fs.promises.cp(TEMPLATE_DIR, outputDir, { recursive: true });

    // Top-level dirs to keep
    const keep = new Set([...presetDef.includes, ...ALWAYS_KEEP]);
    const entries = await fs.promises.readdir(outputDir, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }
        // Special-case ui/: keep only the requested children
        if (entry.name === 'ui') {
            const wantedChildren = presetDef.includes
                .filter(p => p.startsWith('ui/'))
                .map(p => p.slice('ui/'.length));
            if (wantedChildren.length === 0) {
                await fs.promises.rm(
                    path.join(outputDir, 'ui'),
                    { recursive: true, force: true }
                );
                continue;
            }
            const uiEntries = await fs.promises.readdir(
                path.join(outputDir, 'ui'),
                { withFileTypes: true }
            );
            for (const uiEntry of uiEntries) {
                if (!wantedChildren.includes(uiEntry.name)) {
                    await fs.promises.rm(
                        path.join(outputDir, 'ui', uiEntry.name),
                        { recursive: true, force: true }
                    );
                }
            }
            continue;
        }
        if (!keep.has(entry.name)) {
            await fs.promises.rm(
                path.join(outputDir, entry.name),
                { recursive: true, force: true }
            );
        }
    }

    // Top-level files: drop dev.sh / seed.sh etc. when not relevant
    const allowedFiles = new Set(ROOT_FILES_BY_PRESET[preset] ?? []);
    const rootEntries = await fs.promises.readdir(outputDir, {
        withFileTypes: true
    });
    for (const entry of rootEntries) {
        if (entry.isDirectory()) {
            continue;
        }
        if (!allowedFiles.has(entry.name)) {
            await fs.promises.rm(path.join(outputDir, entry.name));
        }
    }

    // Prune docker-compose.yml if services were not selected
    const composePath = path.join(outputDir, 'docker-compose.yml');
    if (fs.existsSync(composePath)) {
        let composeContent = await fs.promises.readFile(composePath, 'utf8');
        if (!presetDef.wantsAdminUi) {
            composeContent = composeContent.replace(/\n\s*# ── Admin Panel[\s\S]*?(?=\n\s*# ── |\nvolumes:)/g, '\n');
            composeContent = composeContent.replace(/\n\s*admin_modules:/g, '');
        }
        if (!presetDef.wantsSite) {
            composeContent = composeContent.replace(/\n\s*# ── Public Site[\s\S]*?(?=\n\s*# ── |\nvolumes:)/g, '\n');
            composeContent = composeContent.replace(/\n\s*site_modules:/g, '');
        }
        if (!presetDef.wantsMobile) {
            composeContent = composeContent.replace(/\n\s*# ── Mobile App[\s\S]*?(?=\n\s*# ── |\nvolumes:)/g, '\n');
            composeContent = composeContent.replace(/\n\s*mobile_modules:/g, '');
        }
        await fs.promises.writeFile(composePath, composeContent);
    }
}

export async function createProject() {
    const details = await promptProjectDetails();

    showSummary(details);

    const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: 'Look good? Let\'s go!',
        default: true,
    }]);

    if (!confirm) {
        console.log(chalk.yellow('Aborted. No files were created.'));
        return;
    }

    const outputDir = path.resolve(details.outputDir);

    if (fs.existsSync(outputDir)) {
        const { overwrite } = await inquirer.prompt([{
            type: 'confirm',
            name: 'overwrite',
            message: `Directory ${outputDir} already exists. Continue anyway?`,
            default: false,
        }]);

        if (!overwrite) {
            console.log(chalk.yellow('Aborted.'));
            return;
        }
    }

    const replacements = buildReplacements(details);
    // Lift the random secrets into details so the manifest persists
    // them — otherwise `davicarvalhoo update` would mint fresh ones and
    // overwrite working .env values on every run.
    details.contentSecret = replacements['{{CONTENT_SECRET}}'];
    details.jwtTokenSecret = replacements['{{JWT_TOKEN_SECRET}}'];

    console.log('');

    // [1/5] Copy template (preset-aware pruning)
    console.log(green('[1/5]') + ' Copying template files...');
    await copyTemplate(outputDir, details.preset);

    // [2/5] Replace placeholders
    const files = await getAllFiles(outputDir);
    let replacedCount = 0;

    for (const filePath of files) {
        if (isBinaryFile(filePath)) {
            continue;
        }

        const content = await fs.promises.readFile(filePath, 'utf-8');
        const replaced = replacePlaceholders(content, replacements);

        if (replaced !== content) {
            await fs.promises.writeFile(filePath, replaced, 'utf-8');
            replacedCount++;
        }
    }

    console.log(green('[2/5]') + ` Replacing placeholders... ${dim(`(${replacedCount} files updated)`)}`);

    // [3/5] Rename files (path-name placeholders)
    const allEntries = await getAllFiles(outputDir);
    for (const filePath of allEntries) {
        const dir = path.dirname(filePath);
        const basename = path.basename(filePath);

        if (basename.includes('{{PROJECT_SLUG}}')) {
            const newName = basename.replaceAll('{{PROJECT_SLUG}}', details.slug);
            const newPath = path.join(dir, newName);
            await fs.promises.rename(filePath, newPath);
        }
    }

    // Path-segment renames (e.g. mobile/{{PROJECT_SLUG}}/)
    await renameDirs(outputDir, details.slug);

    console.log(green('[3/5]') + ' Renaming template files...');

    // [4/6] Generate branded icons (mobile only). The template ships
    // NO icon PNGs — they're produced fresh per project from the
    // primary color + first letter of the project name. A failure
    // here is fatal (without these files, expo prebuild + the app
    // splash both break), so we surface the error instead of swallowing.
    if (details.presetDef.wantsMobile) {
        const mobileAssets = path.join(
            outputDir, 'mobile', details.slug, 'assets'
        );
        await generateIcons({
            outDir: mobileAssets,
            primaryColor: details.primaryColor,
            letter: details.name.charAt(0).toUpperCase()
        });
        console.log(
            green('[4/6]')
            + ' Generating branded icons...'
            + dim(' (icon, splash, favicon, store)')
        );
    } else {
        console.log(green('[4/6]') + dim(' Skipping icons (no mobile)'));
    }

    // [5/6] Make scripts executable
    const scripts = [
        'dev.sh',
        'install.sh',
        'seed.sh',
        'server/knex.sh',
    ];
    if (details.presetDef.wantsMobile) {
        scripts.push(
            'scripts/bump-version.sh',
            'scripts/prebuild.sh',
            'scripts/run-ios.sh',
            'scripts/release-android.sh',
            'scripts/generate-icons.sh',
            'scripts/install-native.sh'
        );
    }

    for (const script of scripts) {
        const scriptPath = path.join(outputDir, script);
        if (fs.existsSync(scriptPath)) {
            await fs.promises.chmod(scriptPath, 0o755);
        }
    }

    console.log(green('[5/6]') + ' Making scripts executable...');

    // [6/6] Manifest + git init
    // Manifest captures sha256 of every file as it was generated +
    // the user's prompt answers. `davicarvalhoo update <path>` reads it
    // to know which files are user-edited vs untouched.
    await writeInitialManifest({
        projectDir: outputDir,
        preset: details.preset,
        details
    });

    execSync('git init', { cwd: outputDir, stdio: 'ignore' });
    console.log(green('[6/6]') + ' Manifest + git init...');

    // Done!
    console.log('');
    console.log(green.bold(`  ✓ "${details.name}" created successfully!`));
    console.log('');
    showNextSteps(details);
}

// Recursively rename any directory whose basename contains
// {{PROJECT_SLUG}}. Walks bottom-up so renames don't invalidate the
// queue.
async function renameDirs(root, slug) {
    const stack = [];
    async function walk(dir) {
        const entries = await fs.promises.readdir(dir, {
            withFileTypes: true,
        });
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            const fullPath = path.join(dir, entry.name);
            await walk(fullPath);
            stack.push(fullPath);
        }
    }
    await walk(root);
    for (const dirPath of stack) {
        const basename = path.basename(dirPath);
        if (basename.includes('{{PROJECT_SLUG}}')) {
            const newPath = path.join(
                path.dirname(dirPath),
                basename.replaceAll('{{PROJECT_SLUG}}', slug)
            );
            await fs.promises.rename(dirPath, newPath);
        }
    }
}

function showNextSteps(details) {
    const { presetDef } = details;
    console.log(chalk.bold('  Next steps:'));
    console.log(`  ${green('1.')} cd ${details.outputDir}`);
    if (presetDef.wantsServer) {
        console.log(`  ${green('2.')} ./install.sh`);
        console.log(`  ${green('3.')} ./seed.sh`);
        console.log(`  ${green('4.')} ./dev.sh`);
    } else {
        console.log(`  ${green('2.')} cd mobile/${details.slug} && npm install`);
        console.log(`  ${green('3.')} npm run start`);
    }
    console.log('');
    if (presetDef.wantsAdminUi) {
        console.log(dim(`  Admin panel:  ${cyan(`http://localhost:${details.adminUiPort}`)}`));
    }
    if (presetDef.wantsServer) {
        console.log(dim(`  Admin API:    ${cyan(`http://localhost:${details.apiPort}`)}`));
    }
    if (presetDef.wantsSite) {
        console.log(dim(`  Site:         ${cyan(`http://localhost:${details.sitePort}`)}`));
    }
    if (presetDef.wantsMobile) {
        console.log(dim(`  Mobile:       cd mobile/${details.slug} && npm run ios | android | web`));
    }
    console.log('');
    console.log(dim('  Happy hacking! - ') + cyan('github.com/davicarvalhoo'));
    console.log('');
}
