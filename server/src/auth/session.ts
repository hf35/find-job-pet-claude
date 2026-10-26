import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Stateless session value stored in a signed cookie: `<expiresAtMs>.<passwordFingerprint>`.
 * The fingerprint ties sessions to the current password hash, so changing the password
 * (or SESSION_SECRET) logs everyone out.
 */
export function fingerprint(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}

export function createSessionValue(passwordHash: string, ttlMs: number, now = Date.now()): string {
  return `${now + ttlMs}.${fingerprint(passwordHash)}`;
}

export function isSessionValueValid(
  value: string,
  passwordHash: string,
  now = Date.now(),
): boolean {
  const [expires, fp, ...rest] = value.split('.');
  if (!expires || !fp || rest.length > 0) return false;
  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;
  return safeEqual(fp, fingerprint(passwordHash));
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}
