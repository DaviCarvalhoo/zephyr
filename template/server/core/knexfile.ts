import dotenv from 'dotenv';
import path from 'node:path';
import dirname from '#root/dirname.js';

// dirname.ts resolves to server/ root regardless of where node was
// invoked from — see its file header for the why.
dotenv.config({ path: path.resolve(dirname, '.env') });

const config = {
    client: 'pg',
    connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
    },
    migrations: {
        directory: path.resolve(dirname, 'migrations'),
        extension: 'ts'
    },
    pool: {
        min: 2,
        max: 10
    }
};

export default config;
