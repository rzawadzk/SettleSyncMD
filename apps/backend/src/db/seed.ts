import pg from 'pg';
import crypto from 'crypto';
import { TOKEN_TTL_HOURS } from '@settlesync/shared';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://settlesync:settlesync@localhost:5432/settlesync';
const HMAC_SECRET = process.env.HMAC_SECRET || (process.env.NODE_ENV === 'production'
  ? (() => { throw new Error('HMAC_SECRET must be set in production'); })()
  : 'dev-hmac-secret-change-in-production');

function generateToken(): string {
  const uuid = crypto.randomUUID();
  const hmac = crypto.createHmac('sha256', HMAC_SECRET).update(uuid).digest('hex');
  return `${uuid}.${hmac}`;
}

async function seed() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  const now = new Date().toISOString();
  const expires = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();

  await client.query('DELETE FROM responses');
  await client.query('DELETE FROM party_tokens');
  await client.query('DELETE FROM cases');
  await client.query('DELETE FROM magic_links');
  await client.query('DELETE FROM arbiters');

  // Arbiter testowy
  const arbiterResult = await client.query(
    'INSERT INTO arbiters (email, created_at) VALUES ($1, $2) RETURNING id',
    ['jan.kowalski@kancelaria.pl', now],
  );
  const arbiterId = arbiterResult.rows[0].id;

  // Sprawa 1: Oczekuje na odpowiedzi
  const case1 = await client.query(
    'INSERT INTO cases (arbiter_id, internal_name, arbitration_id, description, status, token_ttl_hours, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
    [arbiterId, 'Nowak vs Wiśniewski', 'ARB/2026/001', 'Spór o wykonanie umowy dostawy', 'pending', 72, now],
  );

  for (const party of ['A', 'B']) {
    await client.query(
      'INSERT INTO party_tokens (case_id, party, token, email_sent, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [case1.rows[0].id, party, generateToken(), true, expires, now],
    );
  }

  // Sprawa 2: Jedna strona odpowiedziała
  const case2 = await client.query(
    'INSERT INTO cases (arbiter_id, internal_name, arbitration_id, description, status, token_ttl_hours, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
    [arbiterId, 'ABC Sp. z o.o. vs XYZ S.A.', 'ARB/2026/002', 'Spór dotyczący naruszenia klauzuli poufności', 'one_agreed', 72, now],
  );

  const tokens2: number[] = [];
  for (const party of ['A', 'B']) {
    const t = await client.query(
      'INSERT INTO party_tokens (case_id, party, token, email_sent, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [case2.rows[0].id, party, generateToken(), true, expires, now],
    );
    tokens2.push(t.rows[0].id);
  }

  await client.query(
    'INSERT INTO responses (party_token_id, consent, time_horizon, note, responded_at) VALUES ($1, $2, $3, $4, $5)',
    [tokens2[0], 'yes', 'two_to_four_weeks', null, now],
  );

  // Sprawa 3: Obie strony zgodne
  const case3 = await client.query(
    'INSERT INTO cases (arbiter_id, internal_name, arbitration_id, description, status, token_ttl_hours, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
    [arbiterId, 'Kowalczyk vs Zieliński', 'ARB/2025/047', 'Mediacja w sporze budowlanym', 'both_agreed', 72, now],
  );

  const tokens3: number[] = [];
  for (const party of ['A', 'B']) {
    const t = await client.query(
      'INSERT INTO party_tokens (case_id, party, token, email_sent, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [case3.rows[0].id, party, generateToken(), true, expires, now],
    );
    tokens3.push(t.rows[0].id);
  }

  await client.query(
    'INSERT INTO responses (party_token_id, consent, time_horizon, note, responded_at) VALUES ($1, $2, $3, $4, $5)',
    [tokens3[0], 'yes', 'one_to_two_months', 'Preferuję spotkania online', now],
  );

  await client.query(
    'INSERT INTO responses (party_token_id, consent, time_horizon, note, responded_at) VALUES ($1, $2, $3, $4, $5)',
    [tokens3[1], 'yes', 'two_to_four_weeks', null, now],
  );

  console.log('Database seeded successfully');
  console.log('Test arbiter: jan.kowalski@kancelaria.pl');
  console.log('3 test cases created (pending, one_agreed, both_agreed)');

  await client.end();
}

seed().catch(console.error);
