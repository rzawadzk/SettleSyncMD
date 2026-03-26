import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { partyResponseSchema } from '@settlesync/shared';
import type { PartyView } from '@settlesync/shared';
import { db, schema } from '../db/index.js';
import { verifyPartyToken, isTokenExpired } from '../services/token.js';
import { enqueueEmail } from '../services/emailQueue.js';
import { partyRateLimiter } from '../middleware/rateLimiter.js';
import { logError } from '../services/logger.js';

const router = Router();

/**
 * GET /api/party/:token
 * Przyjmuje: token w URL
 * Zwraca: PartyView (ID arbitrażu, czy już odpowiedział, czy wygasł)
 * Uprawnienia: publiczny (token auth), rate limited
 * Nie ujawnia żadnych PII — tylko metadane potrzebne do wyświetlenia formularza.
 */
router.get('/:token', partyRateLimiter, async (req, res) => {
  try {
    const token = req.params.token as string;

    if (!verifyPartyToken(token)) {
      res.status(404).json({ error: 'Invalid token' });
      return;
    }

    const partyToken = await db.query.partyTokens.findFirst({
      where: eq(schema.partyTokens.token, token),
    });

    if (!partyToken) {
      res.status(404).json({ error: 'Token not found' });
      return;
    }

    const caseRow = await db.query.cases.findFirst({
      where: eq(schema.cases.id, partyToken.caseId),
    });

    if (!caseRow) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    const existingResponse = await db.query.responses.findFirst({
      where: eq(schema.responses.partyTokenId, partyToken.id),
    });

    const expired = isTokenExpired(partyToken.expiresAt);
    const view: PartyView = {
      caseArbitrationId: caseRow.arbitrationId,
      party: partyToken.party as 'A' | 'B',
      alreadyResponded: !!existingResponse,
      expired,
    };

    if (existingResponse && !expired) {
      view.previousResponse = {
        consent: existingResponse.consent as 'yes' | 'no' | 'later',
        timeHorizon: (existingResponse.timeHorizon as any) ?? null,
        note: existingResponse.note ?? null,
      };
    }

    res.json(view);
  } catch (error) {
    logError('party/view', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/party/:token/respond
 * Przyjmuje: { consent: 'yes'|'no'|'later', timeHorizon?: string, note?: string }
 * Zwraca: { message: string, consent: string }
 * Uprawnienia: publiczny (token auth), rate limited, jednorazowy
 * Rejestruje anonimową odpowiedź strony. Blokuje ponowne głosowanie.
 * Gdy obie strony wyrażą zgodę — powiadamia arbitra.
 */
router.post('/:token/respond', partyRateLimiter, async (req, res) => {
  try {
    const token = req.params.token as string;

    if (!verifyPartyToken(token)) {
      res.status(404).json({ error: 'Invalid token' });
      return;
    }

    const partyToken = await db.query.partyTokens.findFirst({
      where: eq(schema.partyTokens.token, token),
    });

    if (!partyToken) {
      res.status(404).json({ error: 'Token not found' });
      return;
    }

    // Sprawdź wygaśnięcie
    if (isTokenExpired(partyToken.expiresAt)) {
      res.status(410).json({ error: 'Token has expired' });
      return;
    }

    // Waliduj dane
    const parsed = partyResponseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }

    const { consent, timeHorizon, note } = parsed.data;

    // Sprawdź czy już odpowiedział — jeśli tak, aktualizuj odpowiedź
    const existingResponse = await db.query.responses.findFirst({
      where: eq(schema.responses.partyTokenId, partyToken.id),
    });

    if (existingResponse) {
      await db.update(schema.responses)
        .set({
          consent,
          timeHorizon: timeHorizon ?? null,
          note: note ?? null,
          respondedAt: new Date(),
        })
        .where(eq(schema.responses.id, existingResponse.id));
    } else {
      await db.insert(schema.responses).values({
        partyTokenId: partyToken.id,
        consent,
        timeHorizon: timeHorizon ?? null,
        note: note ?? null,
        respondedAt: new Date(),
      });
    }

    // Sprawdź czy obie strony odpowiedziały "yes" i zaktualizuj status sprawy
    await updateCaseStatus(partyToken.caseId);

    res.json({ message: 'Response recorded', consent });
  } catch (error) {
    logError('party/respond', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function updateCaseStatus(caseId: number) {
  const tokens = await db.query.partyTokens.findMany({
    where: eq(schema.partyTokens.caseId, caseId),
  });

  const allResponses = await Promise.all(
    tokens.map((t) =>
      db.query.responses.findFirst({ where: eq(schema.responses.partyTokenId, t.id) })
    ),
  );

  const yesCount = allResponses.filter((r) => r?.consent === 'yes').length;
  const respondedCount = allResponses.filter((r) => r != null).length;

  let newStatus: 'pending' | 'one_agreed' | 'both_agreed' | 'declined' | 'expired';
  if (yesCount === 2) {
    newStatus = 'both_agreed';
  } else if (yesCount === 1) {
    newStatus = 'one_agreed';
  } else if (respondedCount === 2) {
    // Both responded but neither said yes — declined
    newStatus = 'declined';
  } else if (respondedCount === 1) {
    // One responded (not yes) — still pending, waiting for the other
    newStatus = 'pending';
  } else {
    newStatus = 'pending';
  }

  await db.update(schema.cases)
    .set({ status: newStatus })
    .where(eq(schema.cases.id, caseId));

  // Jeśli obie strony zgodne — powiadom arbitra (async, przez kolejkę)
  if (newStatus === 'both_agreed') {
    const caseRow = await db.query.cases.findFirst({
      where: eq(schema.cases.id, caseId),
    });
    if (caseRow) {
      const arbiter = await db.query.arbiters.findFirst({
        where: eq(schema.arbiters.id, caseRow.arbiterId),
      });
      if (arbiter) {
        await enqueueEmail({
          type: 'both-agreed',
          to: arbiter.email,
          arbitrationId: caseRow.arbitrationId,
          internalName: caseRow.internalName,
        });
      }
    }
  }
}

export default router;
