const PREFIX = "[portal-debug]";

const TENANTS_ACTION_LOG_MAX = 50;
export const lastTenantsActionLogs: Array<Record<string, unknown>> = [];

/**
 * Structured one-line log for portal-admin diagnostics.
 * Output is grep-able via: docker compose logs web 2>&1 | grep '\[portal-debug\]'
 * Safe to use in middleware (Edge) and Server Components (Node). Uses console.log for Edge compatibility.
 */
export function portalDebugLog(phase: string, data: Record<string, unknown>): void {
  try {
    const payload = { ts: new Date().toISOString(), phase, ...data };
    const line = `${PREFIX} ${JSON.stringify(payload)}`;
    console.log(line);
  } catch {
    // no-op: avoid breaking the app if logging fails
  }
}

/**
 * Log for tenants Server Actions (updateTenantContactEmail, resendTenantWelcomeEmail).
 * Writes to [portal-debug] and pushes to lastTenantsActionLogs for GET /api/debug/tenants-actions.
 */
export function tenantsActionLog(data: Record<string, unknown>): void {
  try {
    const payload = { ts: new Date().toISOString(), ...data };
    portalDebugLog("tenants_action", payload);
    lastTenantsActionLogs.push(payload);
    if (lastTenantsActionLogs.length > TENANTS_ACTION_LOG_MAX) lastTenantsActionLogs.shift();
  } catch {
    // no-op
  }
}
