import Db from '#core/db.js';

import assert from 'node:assert';
import test from 'node:test';

test('[Db] initialize', () => {
    const db = new Db();
    assert(db);
    assert(db.knex);
});
