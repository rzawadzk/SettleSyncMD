import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://settlesync:settlesync@localhost:5432/settlesync';

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 10,
});

export const db = drizzle(pool, { schema });
export { schema };
