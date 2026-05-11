/**
 * `davicarvalhoo update <path>` — re-apply the template against an
 * existing project and pull in everything the template added/changed
 * since the project was scaffolded.
 *
 * The hard part is "what counts as user-edited". We solved it by
 * writing a manifest at scaffold time:
 *
 *   .davicarvalhoo/manifest.json
 *     { templateVersion, preset, details, files: { path: sha256 } }
 *
 * The hash captures each file AFTER placeholder substitution — i.e.
 * exactly what the user got. On update we render the current
 * template with those same details, hash each file, and compare:
 *
 *   project missing template-file              → ADD
 *   project file === manifest hash (untouched)
 *     and template hash !== manifest hash      → AUTO-UPDATE
 *   project file === template hash             → SKIP (already current)
 *   project file !== manifest hash (user-edited)
 *     and template hash !== manifest hash      → ASK (show diff)
 *   manifest has file template no longer ships → ASK (template removed)
 *   project has file not in manifest/template  → KEEP (user added)
 *
 * No --force flag: dangerous defaults are off. Pass --yes to accept
 * all "auto" updates without prompting.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { buildReplacements } from './template-variables.mjs';
import { generateIcons, ICON_TARGETS } from './icons.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.join(__dirname, 'template');
const MANIFEST_PATH = '.davicarvalhoo/manifest.json';

// Mirror of the preset → top-level includes mapping in create.mjs.
// Kept in sync manually because importing from create.mjs would pull
// inquirer + the prompt code into the update command unnecessarily.
const PRESET_INCLUDES = {
    everything: ['server', 'ui/admin', 'ui/site', 'mobile', 'misc',
                 'scripts', 'doc'],
    'web-only': ['server', 'ui/admin', 'ui/site', 'misc', 'doc'],
    'mobile-and-server': ['server', 'mobile', 'misc', 'scripts',
                          'doc'],
    'just-mobile': ['mobile', 'scripts', 'doc']
};

const green = chalk.hex('#02e027');
const cyan = chalk.hex('#00fff9');
const red = chalk.hex('#ff3c00');
const yellow = chalk.hex('#ffb800');
const dim = chalk.hex('#a0a0a0');

const BINARY_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.zip', '.tar', '.gz', '.br',
    '.pdf', '.mp3', '.mp4', '.webm', '.ogg'
]);

// Files that should NEVER be auto-overwritten regardless of hash —
// these are runtime-state (env, lock, generated builds) where the
// template is just a starting sample, not a managed source.
const NEVER_OVERWRITE = new Set([
    'server/.env',
    'ui/site/.env',
    'package-lock.json',
    'server/package-lock.json',
    'ui/admin/package-lock.json',
    'ui/site/package-lock.json'
]);

// Files that the SCAFFOLD generates (not the template). They appear
// in the manifest but the template doesn't actually ship them, so
// the "in-manifest-but-not-in-template" removal path would otherwise
// delete them. List as predicates instead of paths because the
// project slug is part of the path.
function isGeneratedAsset(rel) {
    if (!rel.startsWith('mobile/')) {
        return false;
    }
    const tail = rel.split('/').slice(2).join('/');
    return ICON_TARGETS.some(t => tail === `assets/${t.name}`);
}

function sha256(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function isBinary(filePath) {
    return BINARY_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

// Skip noise: macOS metadata, dependency dirs, generated build
// outputs, the manifest itself, git internals.
const SKIP_DIRS = new Set([
    '.git', '.davicarvalhoo', 'node_modules', 'dist', 'build',
    '.expo', '.next', 'ios', 'android', '.DS_Store'
]);
const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db']);

async function getAllFiles(dir) {
    const out = [];
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) {
                continue;
            }
            out.push(...await getAllFiles(path.join(dir, entry.name)));
        } else {
            if (SKIP_FILES.has(entry.name)) {
                continue;
            }
            out.push(path.join(dir, entry.name));
        }
    }
    return out;
}

function applyPlaceholders(content, replacements) {
    let out = content;
    for (const [k, v] of Object.entries(replacements)) {
        out = out.replaceAll(k, v);
    }
    return out;
}

function applyPathPlaceholders(p, slug) {
    // Mirrors create.mjs renameDirs + per-file substitution.
    return p.replaceAll('{{PROJECT_SLUG}}', slug);
}

/**
 * Walk the template, resolve each file's contents (post-replacement)
 * + final relative path. Returns a map of relative-path → buffer.
 *
 * Skips files outside the project's preset by checking against the
 * project's existing top-level layout — we only want to update what
 * the project actually shipped.
 */
/**
 * Whether a relative path belongs to the preset. Same prune rules
 * as create.mjs's copyTemplate, expressed as a predicate so we can
 * evaluate per-file instead of pruning a directory.
 */
// Top-level directories that ship with every preset (project config
// like .claude/ that doesn't belong to any single sub-app). Mirrors
// the ALWAYS_KEEP set in create.mjs.
const ALWAYS_IN_PRESET = new Set(['.claude']);

function isPathInPreset(rel, preset) {
    const includes = PRESET_INCLUDES[preset] ?? PRESET_INCLUDES.everything;
    const top = rel.split('/')[0];
    if (ALWAYS_IN_PRESET.has(top)) {
        return true;
    }
    // ui is special: only the chosen sub-apps live in the preset.
    if (top === 'ui') {
        const sub = rel.split('/')[1];
        return includes.includes(`ui/${sub}`);
    }
    if (includes.includes(top)) {
        return true;
    }
    // Top-level files (CLAUDE.md, dev.sh, etc) — let create.mjs's
    // root-files filter decide. For update we ship them all and let
    // the manifest comparison do the right thing per file.
    return rel.indexOf('/') === -1;
}

async function loadTemplate(details, preset) {
    const replacements = buildReplacements(details);
    const files = await getAllFiles(TEMPLATE_DIR);
    const out = new Map();

    for (const abs of files) {
        const relRaw = path.relative(TEMPLATE_DIR, abs);
        const rel = applyPathPlaceholders(relRaw, details.slug);

        if (preset && !isPathInPreset(rel, preset)) {
            continue;
        }

        let content = await fs.promises.readFile(abs);
        if (!isBinary(abs)) {
            content = Buffer.from(
                applyPlaceholders(content.toString('utf8'), replacements)
            );
        }
        out.set(rel, content);
    }

    return out;
}

function readManifest(projectDir) {
    const p = path.join(projectDir, MANIFEST_PATH);
    if (!fs.existsSync(p)) {
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (err) {
        throw new Error(
            `manifest at ${p} is corrupt: ${err.message}`
        );
    }
}

async function writeManifest(projectDir, manifest) {
    const dir = path.join(projectDir, '.davicarvalhoo');
    if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(
        path.join(projectDir, MANIFEST_PATH),
        JSON.stringify(manifest, null, 2) + '\n',
        'utf8'
    );
}

function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => {
        rl.question(question, ans => {
            rl.close();
            resolve(ans.trim());
        });
    });
}

function previewDiff(rel, projectBuf, templateBuf) {
    if (isBinary(rel)) {
        console.log(dim(`  (binary file — diff omitted)`));
        return;
    }
    const a = projectBuf.toString('utf8').split('\n');
    const b = templateBuf.toString('utf8').split('\n');
    // Tiny line-by-line diff — enough to make a decision. Full
    // patches go to a real merge tool.
    const max = Math.max(a.length, b.length);
    let shown = 0;
    for (let i = 0; i < max && shown < 20; i++) {
        if (a[i] === b[i]) {
            continue;
        }
        if (a[i] !== undefined) {
            console.log(red(`  - ${a[i]}`));
            shown++;
        }
        if (b[i] !== undefined) {
            console.log(green(`  + ${b[i]}`));
            shown++;
        }
    }
    if (shown === 0) {
        console.log(dim('  (no line-level changes — likely whitespace)'));
    } else if (shown >= 20) {
        console.log(dim('  ... (truncated)'));
    }
}

async function askPerFile(rel, projectBuf, templateBuf, mode) {
    console.log('');
    console.log(yellow(`  ${rel}`) + dim(` — ${mode}`));
    previewDiff(rel, projectBuf, templateBuf);
    const ans = await prompt(
        '  override? [y/N/d=show full diff/a=accept all] '
    );
    const lower = ans.toLowerCase();
    if (lower === 'd') {
        console.log('');
        console.log(projectBuf.toString('utf8'));
        console.log(dim('  --- vs ---'));
        console.log(templateBuf.toString('utf8'));
        console.log('');
        return askPerFile(rel, projectBuf, templateBuf, mode);
    }
    if (lower === 'a') {
        return 'accept-all';
    }
    if (lower === 'y') {
        return 'override';
    }
    return 'skip';
}

export async function updateProject(projectDirArg, opts = {}) {
    const projectDir = path.resolve(projectDirArg);
    if (!fs.existsSync(projectDir)) {
        console.log(red(`Path not found: ${projectDir}`));
        process.exit(1);
    }

    const manifest = readManifest(projectDir);
    if (!manifest) {
        console.log(red(
            `No .davicarvalhoo/manifest.json in ${projectDir}.`
        ));
        console.log(dim(
            '  Update needs the manifest written at scaffold time '
            + 'to know which files\n  are user-edited vs untouched. '
            + 'If this project predates the manifest,\n  '
            + 'the safest path is to scaffold a fresh project + '
            + 'merge by hand.'
        ));
        process.exit(1);
    }

    const { details, files: oldHashes } = manifest;
    if (!details || !oldHashes) {
        console.log(red('Manifest is missing required fields.'));
        process.exit(1);
    }

    console.log('');
    console.log(green('  Updating ') + cyan(projectDir));
    console.log(dim(
        `  manifest: ${manifest.templateVersion ?? '?'} `
        + `→ template: ${getCurrentTemplateVersion()}`
    ));
    console.log('');

    const template = await loadTemplate(details, manifest.preset);
    const newHashes = {};

    let acceptAll = !!opts.yes;
    let added = 0;
    let updated = 0;
    let asked = 0;
    let skipped = 0;

    // ── Files the template ships ──────────────────────────────────
    for (const [rel, templateBuf] of template) {
        const projAbs = path.join(projectDir, rel);
        const templateHash = sha256(templateBuf);
        newHashes[rel] = templateHash;

        if (NEVER_OVERWRITE.has(rel)) {
            // Treated as a user-owned starting sample. Skip unless
            // missing — then add the sample.
            if (!fs.existsSync(projAbs)) {
                await writeFile(projAbs, templateBuf);
                console.log(green('  +') + ` ${rel} ` + dim('(seed)'));
                added++;
            }
            continue;
        }

        const oldHash = oldHashes[rel];

        if (!fs.existsSync(projAbs)) {
            await writeFile(projAbs, templateBuf);
            console.log(green('  +') + ` ${rel} ` + dim('(new)'));
            added++;
            continue;
        }

        const projBuf = await fs.promises.readFile(projAbs);
        const projHash = sha256(projBuf);

        if (projHash === templateHash) {
            // Already up to date.
            skipped++;
            continue;
        }

        if (oldHash && projHash === oldHash) {
            // User hasn't touched it; safe to auto-update.
            await writeFile(projAbs, templateBuf);
            console.log(green('  ↑') + ` ${rel} ` + dim('(auto)'));
            updated++;
            continue;
        }

        // User-edited (or never tracked). Ask.
        const decision = acceptAll
            ? 'override'
            : await askPerFile(
                rel, projBuf, templateBuf, 'user-edited'
            );

        if (decision === 'accept-all') {
            acceptAll = true;
            await writeFile(projAbs, templateBuf);
            console.log(green('  ↑') + ` ${rel} ` + dim('(override)'));
            updated++;
            continue;
        }
        if (decision === 'override') {
            await writeFile(projAbs, templateBuf);
            console.log(green('  ↑') + ` ${rel} ` + dim('(override)'));
            updated++;
            continue;
        }
        // Skip — keep user's version. Track the user's hash in the
        // new manifest so subsequent updates don't keep re-asking
        // about an "unchanged" diff.
        newHashes[rel] = projHash;
        console.log(dim('  =') + ` ${rel} ` + dim('(kept user)'));
        asked++;
        skipped++;
    }

    // ── Files in old manifest but no longer in template ───────────
    const removed = [];
    for (const rel of Object.keys(oldHashes)) {
        if (template.has(rel)) {
            continue;
        }
        const projAbs = path.join(projectDir, rel);
        if (!fs.existsSync(projAbs)) {
            continue;
        }

        // Generated assets (icons, splash, favicon) appear in the
        // manifest because the scaffold wrote them, but the template
        // doesn't actually ship them — they're produced by the icon
        // generator. Skip the removal branch for these so update
        // never deletes a working app's icons.
        if (isGeneratedAsset(rel)) {
            const projBuf = await fs.promises.readFile(projAbs);
            newHashes[rel] = sha256(projBuf);
            continue;
        }

        const projBuf = await fs.promises.readFile(projAbs);
        const projHash = sha256(projBuf);
        if (projHash === oldHashes[rel]) {
            // User didn't touch the now-removed file. Safe to delete.
            await fs.promises.rm(projAbs);
            console.log(red('  −') + ` ${rel} ` + dim('(removed)'));
            removed.push(rel);
        } else {
            // User edited it — leave alone.
            console.log(
                dim('  =') + ` ${rel} ` + dim('(kept; template dropped)')
            );
            // Preserve the project's current hash so a future
            // update doesn't see the file as "untracked".
            newHashes[rel] = projHash;
        }
    }

    // ── Ensure mobile icons exist (regenerate if missing) ─────────
    // After the file walk: if the project includes a mobile app and
    // any icon is missing from assets/, regenerate the full set from
    // the manifest's stored details. Idempotent: same primary color
    // + letter produces the same bytes, so this is a no-op when
    // everything is already in place.
    const mobileSlug = details.slug;
    const mobileAssets = path.join(
        projectDir, 'mobile', mobileSlug, 'assets'
    );
    if (fs.existsSync(path.join(projectDir, 'mobile', mobileSlug))) {
        const missing = ICON_TARGETS.some(t =>
            !fs.existsSync(path.join(mobileAssets, t.name))
        );
        if (missing) {
            console.log(
                green('  ↺')
                + ' regenerating mobile icons '
                + dim('(missing from assets/)')
            );
            await generateIcons({
                outDir: mobileAssets,
                primaryColor: details.primaryColor,
                letter: details.name.charAt(0).toUpperCase()
            });
            // Update hashes for the regenerated files so the new
            // manifest reflects them.
            for (const t of ICON_TARGETS) {
                const abs = path.join(mobileAssets, t.name);
                const rel = path.relative(projectDir, abs);
                newHashes[rel] = sha256(
                    await fs.promises.readFile(abs)
                );
            }
        }
    }

    // ── Persist new manifest ──────────────────────────────────────
    await writeManifest(projectDir, {
        templateVersion: getCurrentTemplateVersion(),
        generatedAt: manifest.generatedAt,
        updatedAt: new Date().toISOString(),
        preset: manifest.preset,
        details,
        files: newHashes
    });

    console.log('');
    console.log(green('  Update complete.'));
    console.log(dim(
        `  added=${added} updated=${updated} skipped=${skipped} `
        + `asked=${asked} removed=${removed.length}`
    ));
    console.log('');
}

async function writeFile(absPath, buf) {
    const dir = path.dirname(absPath);
    if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(absPath, buf);
}

function getCurrentTemplateVersion() {
    const pkgPath = path.join(__dirname, 'package.json');
    try {
        return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
    } catch {
        return 'unknown';
    }
}

/**
 * Called by create.mjs after a fresh scaffold. Captures the initial
 * file hashes so subsequent `update` invocations have a baseline.
 */
export async function writeInitialManifest({
    projectDir,
    preset,
    details
}) {
    const files = await getAllFiles(projectDir);
    const hashes = {};
    for (const abs of files) {
        const rel = path.relative(projectDir, abs);
        // Skip the manifest dir itself + git stuff.
        if (rel.startsWith('.davicarvalhoo/') || rel.startsWith('.git/')) {
            continue;
        }
        const buf = await fs.promises.readFile(abs);
        hashes[rel] = sha256(buf);
    }
    await writeManifest(projectDir, {
        templateVersion: getCurrentTemplateVersion(),
        generatedAt: new Date().toISOString(),
        preset,
        details,
        files: hashes
    });
}
