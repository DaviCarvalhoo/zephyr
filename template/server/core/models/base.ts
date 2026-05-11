import type { Knex } from 'knex';
import Db from '#core/db.js';
import type Context from '#core/context.js';

const db = new Db();

class BaseModel {
    knex: Knex;
    db: Db;
    context: Context;

    constructor(context: Context) {
        this.context = context;
        this.db = db;
        this.knex = db.knex;
    }
}

export default BaseModel;
