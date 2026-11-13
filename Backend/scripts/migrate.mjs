// Applies every SQL file in db/migrations in name order. Each file is idempotent.
// Usage: DATABASE_URL=... npm run db:migrate
import 'dotenv/config';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URI || process.env.Database_URI;
if (!connectionString) {
  console.error('Set DATABASE_URL first.');
  process.exit(1);
}
const ssl = process.env.DB_SSL === 'disable' ? false : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
const client = new pg.Client({ connectionString, ssl });
const dir = join(import.meta.dirname, '..', 'db', 'migrations');

await client.connect();
try {
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    console.log(`Applying ${file}`);
    await client.query(readFileSync(join(dir, file), 'utf8'));
  }
  console.log('Migrations applied.');
} finally {
  await client.end();
}
