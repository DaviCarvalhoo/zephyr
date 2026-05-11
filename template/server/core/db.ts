import knex, { type Knex } from 'knex';
import knexConfig from './knexfile.js';

class Db {
    knex: Knex;

    constructor() {
        this.knex = knex(knexConfig);
    }
}

export default Db;
