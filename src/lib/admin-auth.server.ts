/**
 * Shared gate for maintenance/diagnostic HTTP routes (api.payments-diagnostics.ts,
 * api.sync-payment-secret.ts) that aren't part of the normal app flow and
 * were flagged by a security audit as unauthenticated. Reuses
 * INTERNAL_PAYMENT_SECRET rather than introducing a separate secret -- only
 * whoever set that value in Lovable's secrets panel can call these.
 *
 * Accepts either an `Authorization: Bearer <secret>` header (for curl/scripts)
 * or a `?secret=` query param (so the URL can still be pasted directly into
 * a browser address bar, which can't set custom headers).
 */
export function isAuthorizedAdminRequest(request: Request): boolean {
  const expected = process.env["INTERNAL_PAYMENT_SECRET"];
  if (!expected) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${expected}`) return true;

  const url = new URL(request.url);
  return url.searchParams.get("secret") === expected;
}
