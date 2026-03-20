import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL || 'file:./data/settlesync.db';

// Upewnij się, że katalog data istnieje
const urlPath = DATABASE_URL.replace('file:', '');
const dataDir = path.dirname(urlPath);
if (dataDir !== '.' && !fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const client = createClient({ url: DATABASE_URL });

async function migrate() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS arbiters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS magic_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      arbiter_id INTEGER NOT NULL REFERENCES arbiters(id),
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      arbiter_id INTEGER NOT NULL REFERENCES arbiters(id),
      internal_name TEXT NOT NULL,
      arbitration_id TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'one_agreed', 'both_agreed', 'expired')),
      token_ttl_hours INTEGER NOT NULL DEFAULT 72,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS party_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL REFERENCES cases(id),
      party TEXT NOT NULL CHECK(party IN ('A', 'B')),
      token TEXT NOT NULL UNIQUE,
      email_sent INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      party_token_id INTEGER NOT NULL UNIQUE REFERENCES party_tokens(id),
      consent TEXT NOT NULL CHECK(consent IN ('yes', 'no', 'later')),
      time_horizon TEXT CHECK(time_horizon IN ('under_2_weeks', 'two_to_four_weeks', 'one_to_two_months', 'over_2_months')),
      note TEXT,
      responded_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_party_tokens_token ON party_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
    CREATE INDEX IF NOT EXISTS idx_cases_arbiter ON cases(arbiter_id);
  `);

  console.log('Database migrated successfully');
}

migrate().catch(console.error);
