import { verifyAppleIdToken, verifyGoogleIdToken } from '#core/oauth.js';

import assert from 'node:assert';
import test from 'node:test';

// Negative path only — verifying real tokens needs a live JWKS fetch
// + a valid signed payload, which doesn't belong in unit tests.

test('[oauth] verifyAppleIdToken rejects malformed token', async () => {
    await assert.rejects(
        () => verifyAppleIdToken('not.a.token', 'com.app.bundle')
    );
});

test('[oauth] verifyGoogleIdToken rejects malformed token', async () => {
    await assert.rejects(
        () => verifyGoogleIdToken('not.a.token', 'web.client.id')
    );
});
