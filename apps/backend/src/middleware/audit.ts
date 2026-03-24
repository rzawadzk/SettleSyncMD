import { Request, Response, NextFunction } from 'express';
import { hashForAudit } from '../utils/tokens.js';

export type AuditActor = {
  type: 'arbiter' | 'party' | 'system';
  id?: string;
};

/**
 * Create an audit log entry for a case event.
 * Actor IDs are hashed for privacy — no PII in the audit trail.
 */
export async function logCaseEvent(
  db: any, // Drizzle instance
  caseId: string,
  eventType: string,
  actor: AuditActor,
  description: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { caseTimeline } = await import('../db/schema.js');

  await db.insert(caseTimeline).values({
    caseId,
    type: eventType as any,
    actorType: actor.type,
    actorIdHash: actor.id ? hashForAudit(actor.id) : null,
    description,
    metadata: metadata ?? null,
  });
}

/**
 * Middleware that attaches an audit helper to the request.
 */
export function auditMiddleware(db: any) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    (req as any).audit = (
      caseId: string,
      eventType: string,
      description: string,
      metadata?: Record<string, unknown>
    ) => {
      const actor: AuditActor = req.auth
        ? { type: 'arbiter', id: req.auth.sub }
        : { type: 'system' };

      return logCaseEvent(db, caseId, eventType, actor, description, metadata);
    };
    next();
  };
}
