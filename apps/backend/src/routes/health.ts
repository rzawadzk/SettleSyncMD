import { Router, Request, Response } from 'express';

export const healthRouter = Router();

const startTime = Date.now();

/**
 * GET /api/health — Health check endpoint
 * Used by Docker, load balancers, and monitoring systems.
 */
healthRouter.get('/', async (_req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  try {
    // TODO: Check DB connection
    // await db.execute(sql`SELECT 1`);

    res.json({
      status: 'ok',
      version: process.env.npm_package_version ?? '2.0.0',
      uptime,
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: 'degraded',
      version: process.env.npm_package_version ?? '2.0.0',
      uptime,
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});
