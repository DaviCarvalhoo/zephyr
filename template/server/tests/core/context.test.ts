import Context from '#core/context.js';

import assert from 'node:assert';
import test from 'node:test';

test('[Context] initialize', () => {
    const ctx = new Context();
    assert(ctx);
    assert(ctx.auth);
    assert(ctx.user);
    assert(ctx.account);
});
