// Local "Remember this device for 30 days" — bypasses the MFA challenge route
// on this browser for the configured TTL. Cleared on logout via clearMfaSession,
// or by explicit revoke.

const KEY_PREFIX = 'fg.mfa.trusted.';
const TTL_DAYS = 30;

function key(userId: string) {
  return `${KEY_PREFIX}${userId}`;
}

export function trustThisDevice(userId: string, days = TTL_DAYS) {
  if (!userId) return;
  const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
  try {
    localStorage.setItem(key(userId), JSON.stringify({ expiresAt, ua: navigator.userAgent }));
  } catch {
    /* noop */
  }
}

export function isDeviceTrusted(userId: string | null | undefined): boolean {
  if (!userId) return false;
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { expiresAt?: number };
    if (!parsed?.expiresAt || parsed.expiresAt < Date.now()) {
      localStorage.removeItem(key(userId));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function revokeTrustedDevice(userId: string | null | undefined) {
  if (!userId) return;
  try {
    localStorage.removeItem(key(userId));
  } catch {
    /* noop */
  }
}

export function getTrustedDeviceExpiry(userId: string | null | undefined): Date | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt?: number };
    if (!parsed?.expiresAt || parsed.expiresAt < Date.now()) return null;
    return new Date(parsed.expiresAt);
  } catch {
    return null;
  }
}
