/**
 * Sanitized logger — logs only error messages, never full objects/stack traces
 * that could contain PII (emails, tokens, request bodies).
 */
export function logError(context: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[${new Date().toISOString()}] ${context}: ${message}`);
}

export function logInfo(context: string, message: string) {
  console.log(`[${new Date().toISOString()}] ${context}: ${message}`);
}
