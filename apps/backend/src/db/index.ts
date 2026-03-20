import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../../data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DATABASE_URL = process.env.DATABASE_URL || `file:${path.join(dataDir, 'settlesync.db')}`;

const client = createClient({ url: DATABASE_URL });

export const db = drizzle(client, { schema });
export { schema };
