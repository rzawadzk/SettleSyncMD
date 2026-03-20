import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { createCaseSchema, sendLinksSchema, TOKEN_TTL_HOURS } from '@settlesync/shared';
import type { CaseSummary, CaseDetail } from '@settlesync/shared';
import { db, schema } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { generatePartyToken, getPartyTokenExpiry } from '../services/token.js';
import { enqueueEmail } from '../services/emailQueue.js';
import { logError } from '../services/logger.js';

const router = Router();

// Wszystkie endpointy wymagają autoryzacji arbitra
router.use(requireAuth);

/**
 * POST /api/cases
 * Przyjmuje: { internalName, arbitrationId, description?, tokenTtlHours? }
 * Zwraca: CaseDetail
 * Uprawnienia: arbiter (JWT)
 * Tworzy sprawę i generuje 2 tokeny dla stron.
 */
router.post('/', async (req, res) => {
  try {
    const parsed = createCaseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }

    const { internalName, arbitrationId, description, tokenTtlHours } = parsed.data;
    const ttl = tokenTtlHours ?? TOKEN_TTL_HOURS;

    // Utwórz sprawę
    const [caseRow] = await db.insert(schema.cases).values({
      arbiterId: req.arbiter!.arbiterId,
      internalName,
      arbitrationId,
      description: description ?? null,
      status: 'pending',
      tokenTtlHours: ttl,
    }).returning();

    // Wygeneruj tokeny dla stron A i B
    const expiresAt = new Date(getPartyTokenExpiry(ttl));
    for (const party of ['A', 'B'] as const) {
      await db.insert(schema.partyTokens).values({
        caseId: caseRow.id,
        party,
        token: generatePartyToken(),
        emailSent: false,
        expiresAt,
      });
    }

    // Zwróć pełne szczegóły
    const detail = await getCaseDetail(caseRow.id, req.arbiter!.arbiterId);
    res.status(201).json(detail);
  } catch (error) {
    logError('cases/create', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/cases
 * Przyjmuje: nic
 * Zwraca: CaseSummary[]
 * Uprawnienia: arbiter (JWT)
 */
router.get('/', async (req, res) => {
  try {
    const rows = await db.query.cases.findMany({
      where: eq(schema.cases.arbiterId, req.arbiter!.arbiterId),
      orderBy: (cases, { desc }) => [desc(cases.createdAt)],
    });

    const summaries: CaseSummary[] = rows.map((r) => ({
      id: r.id,
      internalName: r.internalName,
      arbitrationId: r.arbitrationId,
      status: r.status as CaseSummary['status'],
      createdAt: r.createdAt.toISOString(),
    }));

    res.json(summaries);
  } catch (error) {
    logError('cases/list', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/cases/:id
 * Przyjmuje: id w URL
 * Zwraca: CaseDetail
 * Uprawnienia: arbiter (JWT), tylko własne sprawy
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid case ID' });
      return;
    }

    const detail = await getCaseDetail(id, req.arbiter!.arbiterId);
    if (!detail) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    res.json(detail);
  } catch (error) {
    logError('cases/get', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/cases/:id/send-links
 * Przyjmuje: { partyAEmail, partyBEmail }
 * Zwraca: { message: string }
 * Uprawnienia: arbiter (JWT), tylko własne sprawy
 * Wysyła linki do stron e-mailem.
 */
router.post('/:id/send-links', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid case ID' });
      return;
    }

    const parsed = sendLinksSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }

    // Sprawdź czy sprawa należy do tego arbitra
    const caseRow = await db.query.cases.findFirst({
      where: and(eq(schema.cases.id, id), eq(schema.cases.arbiterId, req.arbiter!.arbiterId)),
    });

    if (!caseRow) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    const tokens = await db.query.partyTokens.findMany({
      where: eq(schema.partyTokens.caseId, id),
    });

    const { partyAEmail, partyBEmail } = parsed.data;
    const emailMap: Record<string, string> = { A: partyAEmail, B: partyBEmail };

    for (const token of tokens) {
      const email = emailMap[token.party];
      if (email) {
        await enqueueEmail({ type: 'party-link', to: email, token: token.token, arbitrationId: caseRow.arbitrationId });
        await db.update(schema.partyTokens)
          .set({ emailSent: true })
          .where(eq(schema.partyTokens.id, token.id));
      }
    }

    res.json({ message: 'Links sent successfully' });
  } catch (error) {
    logError('cases/send-links', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function getCaseDetail(caseId: number, arbiterId: number): Promise<CaseDetail | null> {
  const caseRow = await db.query.cases.findFirst({
    where: and(eq(schema.cases.id, caseId), eq(schema.cases.arbiterId, arbiterId)),
  });

  if (!caseRow) return null;

  const tokens = await db.query.partyTokens.findMany({
    where: eq(schema.partyTokens.caseId, caseId),
  });

  const parties = await Promise.all(
    tokens.map(async (t) => {
      const response = await db.query.responses.findFirst({
        where: eq(schema.responses.partyTokenId, t.id),
      });
      return {
        party: t.party as 'A' | 'B',
        emailSent: t.emailSent,
        hasResponded: !!response,
        consent: response?.consent as CaseDetail['parties'][0]['consent'] ?? null,
        timeHorizon: response?.timeHorizon as CaseDetail['parties'][0]['timeHorizon'] ?? null,
        note: response?.note ?? null,
        respondedAt: response?.respondedAt?.toISOString() ?? null,
      };
    }),
  );

  return {
    id: caseRow.id,
    internalName: caseRow.internalName,
    arbitrationId: caseRow.arbitrationId,
    description: caseRow.description,
    status: caseRow.status as CaseDetail['status'],
    tokenTtlHours: caseRow.tokenTtlHours,
    createdAt: caseRow.createdAt.toISOString(),
    parties,
  };
}

export default router;
