import { getContentCatalog, reloadContent } from '#core/content.js';

import assert from 'node:assert';
import test from 'node:test';

test('[content] catalog loads with stable shape', () => {
    const c = getContentCatalog();
    assert(typeof c.version === 'string');
    assert(typeof c.generatedAt === 'string');
    assert(Array.isArray(c.items));
});

test('[content] reload preserves item ids', () => {
    const before = getContentCatalog();
    const after = reloadContent();
    const beforeIds = before.items.map(i => i.id).sort();
    const afterIds  = after.items.map(i => i.id).sort();
    assert.deepStrictEqual(afterIds, beforeIds);
});
