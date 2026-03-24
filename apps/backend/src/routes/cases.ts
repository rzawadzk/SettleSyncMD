import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  CreateCaseSchema,
  UpdateCaseSchema,
  CaseFilterSchema,
  AddPartySchema,
} from '@settlesync/shared';

export const casesRouter = Router();

// All case routes require arbiter authentication
casesRouter.use(requireAuth);

/**
 * POST /api/cases — Create a new case
 */
casesRouter.post('/', validate(CreateCaseSchema), async (req: Request, res: Response) => {
  try {
    // TODO: Inject CaseService via DI
    const { title, description, caseReference, caseType, locale, consentDeadlineHours, metadata } = req.body;

    // Service layer: create case + link arbiter as lead
    // const newCase = await caseService.create({
    //   title, description, caseReference, caseType, locale,
    //   consentDeadlineHours, metadata,
    //   arbiterId: req.auth!.sub,
    // });

    // Audit: log case creation
    // await req.audit(newCase.id, 'case_created', `Case "${title}" created`);

    res.status(201).json({
      message: 'Case created',
      // data: newCase,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create case', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/cases — List cases for the authenticated arbiter
 */
casesRouter.get('/', validate(CaseFilterSchema, 'query'), async (req: Request, res: Response) => {
  try {
    const { status, search, page, limit, sort, order } = req.query as any;

    // Service layer: list cases with pagination + filters
    // const result = await caseService.list({
    //   arbiterId: req.auth!.sub,
    //   status, search, page, limit, sort, order,
    // });

    res.json({
      data: [],
      total: 0,
      page: page ?? 1,
      limit: limit ?? 20,
      totalPages: 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list cases', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/cases/:id — Get case detail
 */
casesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Service layer: get case with parties, check arbiter access
    // const caseDetail = await caseService.getById(id, req.auth!.sub);
    // if (!caseDetail) return res.status(404).json({ error: 'Case not found', code: 'NOT_FOUND' });

    res.json({ message: 'Case detail placeholder', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get case', code: 'INTERNAL_ERROR' });
  }
});

/**
 * PATCH /api/cases/:id — Update case metadata
 */
casesRouter.patch('/:id', validate(UpdateCaseSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Service: update case, audit the change
    res.json({ message: 'Case updated', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update case', code: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/cases/:id/parties — Add a party to a case
 */
casesRouter.post('/:id/parties', validate(AddPartySchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, name, role, organization, locale } = req.body;

    // Service: create party with token, audit the addition
    // const party = await partyService.addToCase(id, { email, name, role, organization, locale });
    // await req.audit(id, 'party_added', `Party "${name}" (${role}) added`);

    res.status(201).json({ message: 'Party added', caseId: id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add party', code: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/cases/:id/send-links — Send consent links to all pending parties
 */
casesRouter.post('/:id/send-links', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Service: send consent emails to all parties with pending status
    // const sent = await partyService.sendConsentLinks(id);
    // await req.audit(id, 'links_sent', `Consent links sent to ${sent} parties`);

    res.json({ message: 'Consent links sent', caseId: id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send links', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/cases/:id/timeline — Get case event timeline
 */
casesRouter.get('/:id/timeline', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Service: fetch immutable timeline events
    // const events = await timelineService.getForCase(id, req.auth!.sub);

    res.json({ data: [], caseId: id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get timeline', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/cases/:id/export — Export case data (CSV or JSON)
 */
casesRouter.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const format = (req.query.format as string) ?? 'json';

    // Service: export case data
    // const data = await caseService.export(id, req.auth!.sub, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="case-${id}.csv"`);
      res.send(''); // CSV content
    } else {
      res.json({ message: 'Export placeholder', caseId: id });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to export case', code: 'INTERNAL_ERROR' });
  }
});
