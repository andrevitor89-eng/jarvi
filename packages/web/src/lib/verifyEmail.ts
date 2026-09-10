const VERIFY_EMAIL_KEY = 'jarvi_verify_email';

export function persistVerifyEmail(email: string): string {
  const normalized = email.trim();
  if (normalized) {
    try {
      sessionStorage.setItem(VERIFY_EMAIL_KEY, normalized);
    } catch {
      // Private mode / blocked storage — query string still carries the email.
    }
  }
  return normalized;
}

export function readVerifyEmail(stateEmail?: unknown, searchEmail?: string | null): string {
  const fromState = typeof stateEmail === 'string' ? stateEmail.trim() : '';
  const fromSearch = searchEmail?.trim() ?? '';
  let fromStore = '';
  try {
    fromStore = sessionStorage.getItem(VERIFY_EMAIL_KEY)?.trim() ?? '';
  } catch {
    fromStore = '';
  }
  const email = fromState || fromSearch || fromStore;
  if (email) persistVerifyEmail(email);
  return email;
}

export function clearVerifyEmail(): void {
  try {
    sessionStorage.removeItem(VERIFY_EMAIL_KEY);
  } catch {
    // ignore
  }
}

export function verifyPendingLocation(email: string): {
  pathname: string;
  search: string;
  state: { email: string };
} {
  const persisted = persistVerifyEmail(email);
  return {
    pathname: '/verify-pending',
    search: persisted ? `?email=${encodeURIComponent(persisted)}` : '',
    state: { email: persisted },
  };
}
