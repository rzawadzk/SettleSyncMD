import { Router, Request, Response } from 'express';
import { validate } from '../middleware/validate.js';
import { ConsentResponseSchema } from '@settlesync/shared';

export const partyRouter = Router();

/**
 * GET /api/party/:token — Validate party token and get case info
 *
 * This is the endpoint parties hit when they click their consent link.
 * Returns case details and their consent status.
 * No authentication required — token IS the authentication.
 */
partyRouter.get('/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Service layer:
    // 1. Find party by token
    // 2. Verify HMAC signature
    // 3. Check token not expired
    // 4. Return case info + consent status (no PII of other parties)

    // const party = await partyService.validateToken(token);
    // if (!party) return res.status(404).json({ error: 'Invalid link', code: 'TOKEN_INVALID' });
    // if (partyService.isExpired(party)) {
    //   return res.status(410).json({ error: 'Link has expired', code: 'TOKEN_EXPIRED' });
    // }

    res.json({
      message: 'Token validation placeholder',
      // caseTitle: party.case.title,
      // caseType: party.case.caseType,
      // partyName: party.name,
      // partyRole: party.role,
      // consentStatus: party.consentStatus,
      // consentDeadline: party.tokenExpiresAt,
      // locale: party.locale,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to validate token', code: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/party/:token/respond — Submit consent response
 *
 * Parties use this to accept or reject mediation consent.
 * Once submitted, it cannot be changed (immutable).
 */
partyRouter.post(
  '/:token/respond',
  validate(ConsentResponseSchema),
  async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { consent, message, locale } = req.body;

      // Service layer:
      // 1. Validate token (same as GET)
      // 2. Check consent not already given (CONSENT_ALREADY_GIVEN error)
      // 3. Update party consent status
      // 4. Log to case timeline (with hashed actor ID)
      // 5. Check if all parties have responded — if so, update case status
      // 6. Fire webhook if configured
      // 7. Send confirmation email to party
      // 8. Notify arbiter of response

      // const result = await partyService.submitConsent(token, consent, message);

      res.json({
        message: 'Consent recorded',
        // consent: result.consentStatus,
        // caseStatus: result.caseStatus,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to record consent', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * POST /api/party/:token/upload — Party document upload
 *
 * Parties can upload supporting documents (evidence, proposals).
 * Files are validated for type, size, and stored securely.
 */
partyRouter.post('/:token/upload', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Service layer:
    // 1. Validate token
    // 2. Check file type and size limits
    // 3. Store file securely (outside web root)
    // 4. Create document record
    // 5. Log to case timeline

    res.status(501).json({
      message: 'Document upload not yet implemented',
    });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', code: 'INTERNAL_ERROR' });
  }
});
