import { createClient } from '@libsql/client';
import crypto from 'crypto';
import { TOKEN_TTL_HOURS } from '@settlesync/shared';

const DATABASE_URL = process.env.DATABASE_URL || 'file:./data/settlesync.db';
const HMAC_SECRET = process.env.HMAC_SECRET || 'dev-hmac-secret-change-in-production';

function generateToken(): string {
  const uuid = crypto.randomUUID();
  const hmac = crypto.createHmac('sha256', HMAC_SECRET).update(uuid).digest('hex');
  return `${uuid}.${hmac}`;
}

async function seed() {
  const client = createClient({ url: DATABASE_URL });

  const now = new Date().toISOString();
  const expires = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();

  await client.executeMultiple(`
    DELETE FROM responses;
    DELETE FROM party_tokens;
    DELETE FROM cases;
    DELETE FROM magic_links;
    DELETE FROM arbiters;
  `);

  // Arbiter testowy
  const arbiterResult = await client.execute({
    sql: `INSERT INTO arbiters (email, created_at) VALUES (?, ?) RETURNING id`,
    args: ['jan.kowalski@kancelaria.pl', now],
  });
  const arbiterId = arbiterResult.rows[0].id as number;

  // Sprawa 1: Oczekuje na odpowiedzi
  const case1 = await client.execute({
    sql: `INSERT INTO cases (arbiter_id, internal_name, arbitration_id, description, status, token_ttl_hours, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    args: [arbiterId, 'Nowak vs Wiśniewski', 'ARB/2026/001', 'Spór o wykonanie umowy dostawy', 'pending', 72, now],
  });
  const case1Id = case1.rows[0].id as number;

  for (const party of ['A', 'B']) {
    await client.execute({
      sql: `INSERT INTO party_tokens (case_id, party, token, email_sent, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [case1Id, party, generateToken(), 1, expires, now],
    });
  }

  // Sprawa 2: Jedna strona odpowiedziała
  const case2 = await client.execute({
    sql: `INSERT INTO cases (arbiter_id, internal_name, arbitration_id, description, status, token_ttl_hours, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    args: [arbiterId, 'ABC Sp. z o.o. vs XYZ S.A.', 'ARB/2026/002', 'Spór dotyczący naruszenia klauzuli poufności', 'one_agreed', 72, now],
  });
  const case2Id = case2.rows[0].id as number;

  const tokens2: number[] = [];
  for (const party of ['A', 'B']) {
    const t = await client.execute({
      sql: `INSERT INTO party_tokens (case_id, party, token, email_sent, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      args: [case2Id, party, generateToken(), 1, expires, now],
    });
    tokens2.push(t.rows[0].id as number);
  }

  await client.execute({
    sql: `INSERT INTO responses (party_token_id, consent, time_horizon, note, responded_at) VALUES (?, ?, ?, ?, ?)`,
    args: [tokens2[0], 'yes', 'two_to_four_weeks', null, now],
  });

  // Sprawa 3: Obie strony zgodne
  const case3 = await client.execute({
    sql: `INSERT INTO cases (arbiter_id, internal_name, arbitration_id, description, status, token_ttl_hours, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    args: [arbiterId, 'Kowalczyk vs Zieliński', 'ARB/2025/047', 'Mediacja w sporze budowlanym', 'both_agreed', 72, now],
  });
  const case3Id = case3.rows[0].id as number;

  const tokens3: number[] = [];
  for (const party of ['A', 'B']) {
    const t = await client.execute({
      sql: `INSERT INTO party_tokens (case_id, party, token, email_sent, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      args: [case3Id, party, generateToken(), 1, expires, now],
    });
    tokens3.push(t.rows[0].id as number);
  }

  await client.execute({
    sql: `INSERT INTO responses (party_token_id, consent, time_horizon, note, responded_at) VALUES (?, ?, ?, ?, ?)`,
    args: [tokens3[0], 'yes', 'one_to_two_months', 'Preferuję spotkania online', now],
  });

  await client.execute({
    sql: `INSERT INTO responses (party_token_id, consent, time_horizon, note, responded_at) VALUES (?, ?, ?, ?, ?)`,
    args: [tokens3[1], 'yes', 'two_to_four_weeks', null, now],
  });

  console.log('Database seeded successfully');
  console.log('Test arbiter: jan.kowalski@kancelaria.pl');
  console.log('3 test cases created (pending, one_agreed, both_agreed)');
}

seed().catch(console.error);
