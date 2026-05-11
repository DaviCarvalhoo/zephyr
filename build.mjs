import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// davicarvalhoo design tokens
const green = chalk.hex('#02e027');
const cyan = chalk.hex('#00fff9');
const red = chalk.hex('#ff3c00');
const dim = chalk.hex('#a0a0a0');

function run(cmd, cwd) {
    execSync(cmd, { cwd, stdio: 'inherit' });
}

function runSilent(cmd, cwd) {
    execSync(cmd, { cwd, stdio: 'ignore' });
}

// ─── build ───────────────────────────────────────────────────────────────────
// Run locally. Compiles TypeScript + Vite, moves artifacts to builds repo.
// Does NOT install node_modules — that's build-deps on the target machine.

export async function buildProject(appDir, buildDir) {
    appDir = path.resolve(appDir);
    buildDir = path.resolve(buildDir);

    if (!fs.existsSync(appDir)) {
        console.log(red(`App directory not found: ${appDir}`));
        process.exit(1);
    }

    if (!fs.existsSync(buildDir)) {
        console.log(red(`Build directory not found: ${buildDir}`));
        console.log(dim('Create it first: mkdir -p ' + buildDir));
        process.exit(1);
    }

    console.log('');
    console.log(green.bold('=== zephyr build ==='));
    console.log('');
    console.log(`  ${chalk.bold('Source:')}  ${cyan(appDir)}`);
    console.log(`  ${chalk.bold('Output:')}  ${cyan(buildDir)}`);
    console.log('');

    // Pull builds repo if git
    if (fs.existsSync(path.join(buildDir, '.git'))) {
        console.log(dim('  Pulling builds repo...'));
        runSilent('git pull', buildDir);
    }

    // Bump build number
    const buildNumberFile = path.join(buildDir, 'build-number');
    let number = 0;
    if (fs.existsSync(buildNumberFile)) {
        number = parseInt(
            fs.readFileSync(buildNumberFile, 'utf-8').trim(),
            10,
        ) || 0;
    }
    const nextNumber = number + 1;

    // ─── Admin UI ────────────────────────────────────────────────
    // Static files (HTML/CSS/JS) — no node_modules needed at runtime

    const adminDir = path.join(appDir, 'ui', 'admin');
    if (fs.existsSync(adminDir)) {
        console.log(green('[1/3]') + ' Building Admin UI...');

        const distDir = path.join(adminDir, 'dist');
        if (fs.existsSync(distDir)) {
            fs.rmSync(distDir, { recursive: true });
        }

        run('npm run build', adminDir);

        const buildAdminOut = path.join(buildDir, 'ui', 'admin');
        if (fs.existsSync(buildAdminOut)) {
            fs.rmSync(buildAdminOut, { recursive: true });
        }
        fs.mkdirSync(buildAdminOut, { recursive: true });

        run(`rsync -av dist/* "${buildAdminOut}"`, adminDir);
    }

    // ─── Site UI ─────────────────────────────────────────────────
    // Express + EJS — needs node_modules at runtime (installed by build-deps)

    const siteDir = path.join(appDir, 'ui', 'site');
    if (fs.existsSync(siteDir)) {
        console.log(green('[2/3]') + ' Building Site UI...');

        const siteBuildDir = path.join(siteDir, 'build');
        if (fs.existsSync(siteBuildDir)) {
            fs.rmSync(siteBuildDir, { recursive: true });
        }

        run('npm run build', siteDir);

        const buildSiteOut = path.join(buildDir, 'ui', 'site');

        // Preserve node_modules + .env from previous build-deps
        const tmpModules = `/tmp/_zephyr_site_modules_${nextNumber}`;
        const siteModules = path.join(buildSiteOut, 'node_modules');
        if (fs.existsSync(siteModules)) {
            fs.renameSync(siteModules, tmpModules);
        }

        const tmpEnv = `/tmp/_zephyr_site_env_${nextNumber}`;
        const siteEnv = path.join(buildSiteOut, '.env');
        if (fs.existsSync(siteEnv)) {
            fs.renameSync(siteEnv, tmpEnv);
        }

        if (fs.existsSync(buildSiteOut)) {
            fs.rmSync(buildSiteOut, { recursive: true });
        }
        fs.mkdirSync(buildSiteOut, { recursive: true });

        run(`rsync -av build/ "${buildSiteOut}/"`, siteDir);

        const viewsDir = path.join(siteDir, 'views');
        if (fs.existsSync(viewsDir)) {
            run(`rsync -av views "${buildSiteOut}/"`, siteDir);
        }

        const publicDir = path.join(siteDir, 'public');
        if (fs.existsSync(publicDir)) {
            run(`rsync -av public "${buildSiteOut}/"`, siteDir);
        }

        fs.copyFileSync(
            path.join(siteDir, 'package.json'),
            path.join(buildSiteOut, 'package.json'),
        );

        const lockFile = path.join(siteDir, 'package-lock.json');
        if (fs.existsSync(lockFile)) {
            fs.copyFileSync(
                lockFile,
                path.join(buildSiteOut, 'package-lock.json'),
            );
        }

        // Restore .env and node_modules from previous build-deps
        if (fs.existsSync(tmpEnv)) {
            fs.renameSync(tmpEnv, path.join(buildSiteOut, '.env'));
        }
        if (fs.existsSync(tmpModules)) {
            fs.renameSync(
                tmpModules,
                path.join(buildSiteOut, 'node_modules'),
            );
        }
    }

    // ─── Server ──────────────────────────────────────────────────
    // Node.js — needs node_modules at runtime (installed by build-deps)

    const serverDir = path.join(appDir, 'server');
    if (fs.existsSync(serverDir)) {
        console.log(green('[3/3]') + ' Building Server...');

        const serverBuildDir = path.join(serverDir, 'build');
        if (fs.existsSync(serverBuildDir)) {
            fs.rmSync(serverBuildDir, { recursive: true });
        }

        run('npm run build', serverDir);

        fs.copyFileSync(
            path.join(serverDir, 'package.json'),
            path.join(serverBuildDir, 'package.json'),
        );

        const serverLock = path.join(serverDir, 'package-lock.json');
        if (fs.existsSync(serverLock)) {
            fs.copyFileSync(
                serverLock,
                path.join(serverBuildDir, 'package-lock.json'),
            );
        }

        // Copy email templates
        const emailsDir = path.join(serverDir, 'emails');
        if (fs.existsSync(emailsDir)) {
            const buildEmails = path.join(serverBuildDir, 'emails');
            fs.mkdirSync(buildEmails, { recursive: true });
            for (const f of fs.readdirSync(emailsDir)) {
                fs.copyFileSync(
                    path.join(emailsDir, f),
                    path.join(buildEmails, f),
                );
            }
        }

        // Remove .ts and .map from compiled migrations
        const migrationsDir = path.join(serverBuildDir, 'migrations');
        if (fs.existsSync(migrationsDir)) {
            for (const f of fs.readdirSync(migrationsDir)) {
                if (f.endsWith('.ts') || f.endsWith('.map')) {
                    fs.unlinkSync(path.join(migrationsDir, f));
                }
            }
        }

        const buildServerOut = path.join(buildDir, 'server');

        // Preserve node_modules and .env from previous build-deps
        const tmpServerModules = `/tmp/_zephyr_server_modules_${nextNumber}`;
        const serverModules = path.join(buildServerOut, 'node_modules');
        if (fs.existsSync(serverModules)) {
            fs.renameSync(serverModules, tmpServerModules);
        }

        const tmpServerEnv = `/tmp/_zephyr_server_env_${nextNumber}`;
        const serverEnv = path.join(buildServerOut, '.env');
        if (fs.existsSync(serverEnv)) {
            fs.renameSync(serverEnv, tmpServerEnv);
        }

        if (fs.existsSync(buildServerOut)) {
            fs.rmSync(buildServerOut, { recursive: true });
        }
        fs.mkdirSync(buildServerOut, { recursive: true });

        run(`rsync -av build/* "${buildServerOut}"`, serverDir);

        // Write knex.sh for the build repo (local knex + .js knexfile)
        const knexSh = '#!/bin/bash\n'
            + 'node ./node_modules/knex/bin/cli.js \\\n'
            + '    --knexfile core/knexfile.js \\\n'
            + '    --migrations-directory ../migrations $@\n';
        fs.writeFileSync(
            path.join(buildServerOut, 'knex.sh'),
            knexSh,
            { mode: 0o755 }
        );

        // Restore node_modules and .env
        if (fs.existsSync(tmpServerEnv)) {
            fs.renameSync(tmpServerEnv, path.join(buildServerOut, '.env'));
        }
        if (fs.existsSync(tmpServerModules)) {
            fs.renameSync(
                tmpServerModules,
                path.join(buildServerOut, 'node_modules')
            );
        }
    }

    // ─── Version & Git ───────────────────────────────────────────

    fs.writeFileSync(buildNumberFile, String(nextNumber), 'utf-8');

    if (fs.existsSync(path.join(buildDir, '.git'))) {
        console.log(dim('  Committing build...'));

        try {
            run('git add .', buildDir);
            run(
                `git commit -m "build: #${nextNumber}"`,
                buildDir,
            );
        } catch {
            // nothing to commit
        }

        // Tag if doesn't exist
        try {
            execSync(
                `git rev-parse "${nextNumber}"`,
                { cwd: buildDir, stdio: 'ignore' },
            );
        } catch {
            run(
                `git tag -a "${nextNumber}" -m "#${nextNumber}"`,
                buildDir,
            );
            run('git push origin --tags', buildDir);
        }

        run('git push', buildDir);
    }

    console.log('');
    console.log(green.bold(`=== Build #${nextNumber} complete ===`));
    console.log('');
    console.log(`  ${chalk.bold('Admin UI:')}  ${cyan(path.join(buildDir, 'ui', 'admin'))}`);
    console.log(`  ${chalk.bold('Site UI:')}   ${cyan(path.join(buildDir, 'ui', 'site'))}`);
    console.log(`  ${chalk.bold('Server:')}    ${cyan(path.join(buildDir, 'server'))}`);
    console.log('');
    console.log(dim('  Next: run zephyr build-deps on the target machine'));
    console.log('');
}

// ─── build-deps ──────────────────────────────────────────────────────────────
// Run on prod/staging. Installs production node_modules in the builds repo
// so native bindings match the target OS. After this, the repo is ready to run.

export async function buildDeps(buildDir) {
    buildDir = path.resolve(buildDir);

    if (!fs.existsSync(buildDir)) {
        console.log(red(`Build directory not found: ${buildDir}`));
        console.log(dim('Run zephyr build first.'));
        process.exit(1);
    }

    console.log('');
    console.log(green.bold('=== zephyr build-deps ==='));
    console.log('');
    console.log(`  ${chalk.bold('Output:')}  ${cyan(buildDir)}`);
    console.log('');

    // Pull builds repo if git
    if (fs.existsSync(path.join(buildDir, '.git'))) {
        console.log(dim('  Pulling builds repo...'));
        runSilent('git pull', buildDir);
    }

    let step = 1;
    const parts = [];

    const buildServerOut = path.join(buildDir, 'server');
    const buildSiteOut = path.join(buildDir, 'ui', 'site');

    if (fs.existsSync(buildServerOut)) {
        parts.push('server');
    }
    if (fs.existsSync(buildSiteOut)) {
        parts.push('site');
    }

    if (parts.length === 0) {
        console.log(red('No build output found.'));
        console.log(dim('Run zephyr build first.'));
        process.exit(1);
    }

    const total = parts.length;

    // ─── Server deps ─────────────────────────────────────────────

    if (parts.includes('server')) {
        console.log(
            green(`[${step}/${total}]`)
            + ' Installing server dependencies...',
        );

        const serverModules = path.join(buildServerOut, 'node_modules');
        if (fs.existsSync(serverModules)) {
            fs.rmSync(serverModules, { recursive: true });
        }

        try {
            run('npm ci --omit=dev', buildServerOut);
        } catch {
            run('npm install --omit=dev', buildServerOut);
        }

        step++;
    }

    // ─── Site UI deps ────────────────────────────────────────────

    if (parts.includes('site')) {
        console.log(
            green(`[${step}/${total}]`)
            + ' Installing site dependencies...',
        );

        const siteModules = path.join(buildSiteOut, 'node_modules');
        if (fs.existsSync(siteModules)) {
            fs.rmSync(siteModules, { recursive: true });
        }

        try {
            run('npm ci --omit=dev', buildSiteOut);
        } catch {
            run('npm install --omit=dev', buildSiteOut);
        }

        step++;
    }

    // ─── Git commit ──────────────────────────────────────────────

    if (fs.existsSync(path.join(buildDir, '.git'))) {
        console.log(dim('  Committing dependencies...'));

        try {
            run('git add .', buildDir);
            run(
                'git commit -m "deps: update node_modules"',
                buildDir,
            );
            run('git push', buildDir);
        } catch {
            console.log(dim('  No dependency changes to commit.'));
        }
    }

    console.log('');
    console.log(green.bold('=== Dependencies ready ==='));
    console.log('');
    console.log(dim('  Add .env and start the services.'));
    console.log('');
}
