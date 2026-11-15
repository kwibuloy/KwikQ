// Applies every SQL file in db/migrations in name order. Each file is idempotent.
// Uses the API's own connection settings (DATABASE_URL, DB_SSL, DB_SSL_CA from Backend/.env).
// Usage: npm run db:migrate
import 'dotenv/config';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../src/config/database.js';

const dir = join(import.meta.dirname, '..', 'db', 'migrations');

try {
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
        console.log(`Applying ${file}`);
        await pool.query(readFileSync(join(dir, file), 'utf8'));
    }
    console.log('Migrations applied.');
} finally {
    await pool.end();
}
