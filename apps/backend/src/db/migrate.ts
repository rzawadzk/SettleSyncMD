import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://settlesync:settlesync@localhost:5432/settlesync';

async function migrate() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS arbiters (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS magic_links (
      id SERIAL PRIMARY KEY,
      arbiter_id INTEGER NOT NULL REFERENCES arbiters(id),
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cases (
      id SERIAL PRIMARY KEY,
      arbiter_id INTEGER NOT NULL REFERENCES arbiters(id),
      internal_name TEXT NOT NULL,
      arbitration_id TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'one_agreed', 'both_agreed', 'expired')),
      token_ttl_hours INTEGER NOT NULL DEFAULT 72,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS party_tokens (
      id SERIAL PRIMARY KEY,
      case_id INTEGER NOT NULL REFERENCES cases(id),
      party TEXT NOT NULL CHECK(party IN ('A', 'B')),
      token TEXT NOT NULL UNIQUE,
      email_sent BOOLEAN NOT NULL DEFAULT FALSE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS responses (
      id SERIAL PRIMARY KEY,
      party_token_id INTEGER NOT NULL UNIQUE REFERENCES party_tokens(id),
      consent TEXT NOT NULL CHECK(consent IN ('yes', 'no', 'later')),
      time_horizon TEXT CHECK(time_horizon IN ('under_2_weeks', 'two_to_four_weeks', 'one_to_two_months', 'over_2_months')),
      note TEXT,
      responded_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_party_tokens_token ON party_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
    CREATE INDEX IF NOT EXISTS idx_cases_arbiter ON cases(arbiter_id);

    -- Migration: add token_version column for session invalidation
    ALTER TABLE arbiters ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

    -- Migration: add role and password_hash for admin accounts
    ALTER TABLE arbiters ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'mediator';
    ALTER TABLE arbiters ADD COLUMN IF NOT EXISTS password_hash TEXT;

    -- OTP codes table for admin two-factor auth
    CREATE TABLE IF NOT EXISTS otp_codes (
      id SERIAL PRIMARY KEY,
      arbiter_id INTEGER NOT NULL REFERENCES arbiters(id),
      code TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log('Database migrated successfully');
  await client.end();
}

migrate().catch(console.error);
