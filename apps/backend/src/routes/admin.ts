import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

/**
 * GET /api/admin/stats — System statistics dashboard
 */
adminRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    // Service: aggregate stats across all cases
    res.json({
      totalCases: 0,
      activeCases: 0,
      totalParties: 0,
      consentRate: 0,
      avgResolutionDays: 0,
      casesByStatus: {},
      casesByType: {},
      recentActivity: [],
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/admin/arbiters — List all arbiters
 */
adminRouter.get('/arbiters', async (_req: Request, res: Response) => {
  res.json({ data: [], total: 0 });
});

/**
 * POST /api/admin/arbiters — Create/invite a new arbiter
 */
adminRouter.post('/arbiters', async (req: Request, res: Response) => {
  try {
    const { email, name, organization } = req.body;
    // Service: create arbiter record, send welcome email
    res.status(201).json({ message: 'Arbiter created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create arbiter', code: 'INTERNAL_ERROR' });
  }
});
