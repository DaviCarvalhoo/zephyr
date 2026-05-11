#!/usr/bin/env node
/**
 * extract-play-key — pull GOOGLE_PLAY_SERVICE_ACCOUNT_JSON out of
 * server/.env and write it to mobile/<slug>/google-play-key.json.
 *
 * server/.env is the source of truth for the Play service account.
 * The mobile JSON is a derivative used by `eas submit` (path
 * configured in eas.json). Re-run this any time the key rotates.
 */

const fs   = require('fs');
const path = require('path');

const SLUG = '{{PROJECT_SLUG}}';
const REPO_ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(REPO_ROOT, 'server', '.env');
const OUT_PATH = path.join(
    REPO_ROOT, 'mobile', SLUG, 'google-play-key.json'
);
const KEY_NAME = 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON';

function fail(msg) {
    console.error(`[extract-play-key] ${msg}`);
    process.exit(1);
}

if (!fs.existsSync(ENV_PATH)) {
    fail(`${ENV_PATH} not found`);
}

const env = fs.readFileSync(ENV_PATH, 'utf8');
const match = env.match(new RegExp(`^${KEY_NAME}=(.*)$`, 'm'));
if (!match) {
    fail(`${KEY_NAME} not in ${ENV_PATH}`);
}

let value = match[1].trim();
if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
) {
    value = value.slice(1, -1);
}

let parsed;
try {
    parsed = JSON.parse(value);
} catch (e) {
    fail(`${KEY_NAME} is not valid JSON: ${e.message}`);
}
if (parsed.type !== 'service_account') {
    fail(`expected type=service_account, got type=${parsed.type}`);
}

fs.writeFileSync(
    OUT_PATH,
    JSON.stringify(parsed, null, 2) + '\n',
    { mode: 0o600 }
);

const masked = (parsed.client_email || '').replace(/.(?=.{8})/g, '*');
console.log(`[extract-play-key] wrote ${OUT_PATH}`);
console.log(`[extract-play-key]   client_email=${masked}`);
console.log(`[extract-play-key]   project_id=${parsed.project_id}`);
