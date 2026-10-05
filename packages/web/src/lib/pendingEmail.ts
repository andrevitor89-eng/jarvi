export const PENDING_EMAIL_STORAGE_KEY = 'jarvi_pending_email';

export function normalizePendingEmail(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

/**
 * Resolve the email waiting for OTP verification.
 * Query string wins (survives new tabs), then router state, then sessionStorage.
 */
export function resolvePendingEmail({
  search,
  state,
  storage,
}: {
  search?: string | null;
  state?: { email?: unknown } | null;
  storage?: string | null;
}): string {
  const params = new URLSearchParams(search ?? '');
  const fromQuery = normalizePendingEmail(params.get('email'));
  if (fromQuery) return fromQuery;

  const fromState = normalizePendingEmail(state?.email);
  if (fromState) return fromState;

  return normalizePendingEmail(storage);
}

export function readStoredPendingEmail(): string {
  try {
    return normalizePendingEmail(sessionStorage.getItem(PENDING_EMAIL_STORAGE_KEY));
  } catch {
    return '';
  }
}

export function persistPendingEmail(email: string): void {
  const normalized = normalizePendingEmail(email);
  if (!normalized) return;
  try {
    sessionStorage.setItem(PENDING_EMAIL_STORAGE_KEY, normalized);
  } catch {
    // Ignore quota / private-mode failures; query param is the fallback.
  }
}

export function clearPendingEmail(): void {
  try {
    sessionStorage.removeItem(PENDING_EMAIL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function verifyPendingPath(email: string): string {
  const normalized = normalizePendingEmail(email);
  if (!normalized) return '/verify-pending';
  return `/verify-pending?email=${encodeURIComponent(normalized)}`;
}
